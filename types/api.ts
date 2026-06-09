/**
 * API envelope + shared shapes.
 * Every backend response is { success, data } on success, or
 * { success:false, message, errors|error } on failure (master-spec §5).
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message?: string;
  errors?: Record<string, string>;
  error?: { code?: string | number; message?: string };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Per-field validation messages, keyed by field name. */
export type FieldErrors = Record<string, string>;

/**
 * Normalised error thrown by the API client. UI reads `message` for a banner
 * and `fieldErrors` for per-field messages; `status` for 401/404/422 handling.
 */
export class ApiError extends Error {
  status: number;
  fieldErrors?: FieldErrors;
  code?: string | number;

  constructor(message: string, status: number, fieldErrors?: FieldErrors, code?: string | number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

/** Pagination meta on list endpoints. */
export interface PageMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/** App-config (driven client, master-spec §5.7). Parse leniently — ignore unknown keys. */
export interface AppConfig {
  maintenance: boolean;
  min_version: string;
  store_url: string;
  locales: { default: string; supported: string[] };
  brand: Partial<{
    primary: string;
    primary_hover: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    text_muted: string;
    success: string;
    warning: string;
    error: string;
  }>;
  support_email?: string;
  web_url?: string;
  payment?: {
    provider?: string;
    provider_mode?: string;
    currency?: string;
    min_amount?: number;
    max_amount?: number;
    button_text_kk?: string;
    button_text_ru?: string;
    mobile_button_text_kk?: string;
    mobile_button_text_ru?: string;
  };
}
