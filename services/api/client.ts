/**
 * Axios API client for the mereketoi.kz mobile API (/api/v1).
 *
 * - Bearer token injected from secure storage on every request.
 * - Response envelope unwrapped: { success, data } → data; failures → ApiError.
 * - 401 on a previously-authed call = session ended → fire the onUnauthorized
 *   hook (the auth store clears the token + routes to Auth). We do NOT import the
 *   store here to avoid a cycle; the store registers its handler at startup.
 * - GET + POST only (the backend uses POST .../delete, never DELETE).
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/config';
import { ApiError, ApiEnvelope } from '@/types/api';
import { getItem, StorageKeys } from '@/services/storage';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { Accept: 'application/json' },
});

// ── Session-ended hook (registered by the auth store) ────────────────────────
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

// ── Request: attach Bearer token ─────────────────────────────────────────────
http.interceptors.request.use(async (config) => {
  const token = await getItem(StorageKeys.token);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Build a normalised ApiError from an axios error / failure envelope. */
function toApiError(error: AxiosError<ApiEnvelope<unknown>>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;

  if (body && typeof body === 'object' && 'success' in body && body.success === false) {
    const message = body.message ?? body.error?.message ?? 'Қате орын алды';
    return new ApiError(message, status, body.errors, body.error?.code);
  }

  if (status === 0) {
    return new ApiError('Желі қатесі. Интернет байланысын тексеріңіз.', 0);
  }
  return new ApiError(error.message || `Сервер қатесі (${status})`, status);
}

// ── Response: unwrap envelope / map errors ───────────────────────────────────
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    const status = error.response?.status ?? 0;
    if (status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(toApiError(error));
  },
);

/** Unwrap a success envelope to its `data`, throwing ApiError on a failure shape. */
function unwrap<T>(envelope: ApiEnvelope<T>, status: number): T {
  if (envelope && typeof envelope === 'object' && 'success' in envelope) {
    if (envelope.success === true) return envelope.data;
    const msg = envelope.message ?? envelope.error?.message ?? 'Қате орын алды';
    throw new ApiError(msg, status, envelope.errors, envelope.error?.code);
  }
  // Non-enveloped body (shouldn't happen) — return as-is.
  return envelope as unknown as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<ApiEnvelope<T>>(url, config);
  return unwrap<T>(res.data, res.status);
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.post<ApiEnvelope<T>>(url, body, config);
  return unwrap<T>(res.data, res.status);
}
