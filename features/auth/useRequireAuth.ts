import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Guard for auth-gated actions/tabs. If the user is a guest, route to the Auth
 * screen carrying a `returnTo` so we can come back after a successful login
 * (mirrors the web `?next=` behavior). Returns a helper that runs `action`
 * only when authed, else redirects.
 */
export function useRequireAuth() {
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authed';

  const requireAuth = useCallback(
    (action: () => void, returnTo?: string) => {
      if (isAuthed) {
        action();
      } else {
        router.push({ pathname: '/auth', params: returnTo ? { returnTo } : {} });
      }
    },
    [isAuthed],
  );

  return { isAuthed, requireAuth };
}
