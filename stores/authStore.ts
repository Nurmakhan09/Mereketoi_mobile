/**
 * Auth state (zustand). The token lives ONLY in secure storage; we keep a copy in
 * memory for fast reads but never log it. The store registers the client's
 * onUnauthorized handler so a 401 anywhere clears the session.
 */

import { create } from 'zustand';
import { User } from '@/types';
import { ApiError } from '@/types/api';
import { BOOT_REQUEST_TIMEOUT } from '@/constants/config';
import { getItem, setItem, deleteItem, StorageKeys } from '@/services/storage';
import { setUnauthorizedHandler } from '@/services/api/client';
import { fetchMe, logout as apiLogout, deleteAccount as apiDeleteAccount } from '@/services/api/auth';
import { unregisterPushToken } from '@/services/api/push';

export type AuthStatus = 'loading' | 'guest' | 'authed';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  /** Read the persisted token on launch and validate it via GET /me. */
  bootstrap: () => Promise<void>;
  /** Persist a fresh token + user (after browser/native login). */
  setSession: (token: string, user: User) => Promise<void>;
  /** Re-fetch the current user (e.g. after the first listing → provider). */
  refreshUser: () => Promise<void>;
  /** Clear the session locally (used by 401 handler — no network). */
  clearSession: () => Promise<void>;
  /** Full logout: revoke server-side token, then clear locally. */
  logout: () => Promise<void>;
  /** Permanently delete the account server-side, then clear locally. Throws on failure. */
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  token: null,
  user: null,

  bootstrap: async () => {
    const token = await getItem(StorageKeys.token);
    if (!token) {
      set({ status: 'guest', token: null, user: null });
      return;
    }
    // Optimistically use a cached user while we validate.
    const cachedRaw = await getItem(StorageKeys.user);
    const cached = cachedRaw ? (JSON.parse(cachedRaw) as User) : null;
    set({ token, user: cached, status: cached ? 'authed' : 'loading' });
    try {
      // Boot-path: short timeout — a slow server must not stall cold start.
      const user = await fetchMe({ timeout: BOOT_REQUEST_TIMEOUT });
      await setItem(StorageKeys.user, JSON.stringify(user));
      set({ status: 'authed', token, user });
    } catch (e) {
      // Only a REJECTED token ends the session. A network failure / timeout keeps
      // the optimistic cached session (same philosophy as refreshUser) — otherwise
      // a slow connection would log the user out at every cold start.
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 401 || status === 403 || !cached) {
        await get().clearSession();
      }
    }
  },

  setSession: async (token, user) => {
    await setItem(StorageKeys.token, token);
    await setItem(StorageKeys.user, JSON.stringify(user));
    set({ status: 'authed', token, user });
  },

  refreshUser: async () => {
    if (!get().token) return;
    try {
      const user = await fetchMe();
      await setItem(StorageKeys.user, JSON.stringify(user));
      set({ user });
    } catch {
      // leave as-is; a 401 will have cleared the session
    }
  },

  clearSession: async () => {
    await deleteItem(StorageKeys.token);
    await deleteItem(StorageKeys.user);
    set({ status: 'guest', token: null, user: null });
  },

  logout: async () => {
    // Drop this device's push token first, while the Bearer token is still valid,
    // so the backend stops pushing to it. Best-effort — never blocks logout.
    try {
      const pushToken = await getItem(StorageKeys.pushToken);
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => {});
        await deleteItem(StorageKeys.pushToken);
      }
    } catch {
      // ignore — logout proceeds regardless
    }
    try {
      await apiLogout();
    } catch {
      // ignore network/401 — clear locally regardless
    }
    await get().clearSession();
  },

  deleteAccount: async () => {
    // Drop this device's push token first, while the Bearer token is still valid.
    try {
      const pushToken = await getItem(StorageKeys.pushToken);
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => {});
        await deleteItem(StorageKeys.pushToken);
      }
    } catch {
      // ignore — deletion proceeds regardless
    }
    // Let a failure propagate so the UI can show it and keep the session intact.
    await apiDeleteAccount();
    await get().clearSession();
  },
}));

/** Wire the API client's 401 hook to clear the session. Call once at startup. */
export function registerAuthHandlers(): void {
  setUnauthorizedHandler(() => {
    // Avoid an infinite loop: only clear if we think we're authed.
    const { status, clearSession } = useAuthStore.getState();
    if (status !== 'guest') {
      void clearSession();
    }
  });
}
