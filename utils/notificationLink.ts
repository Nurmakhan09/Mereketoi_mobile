import { router } from 'expo-router';
import { Linking } from 'react-native';

/**
 * Map a backend notification `action_url` (web cabinet path) to an in-app route.
 * Single source for BOTH the in-app inbox tap and a push-notification tap, so the
 * two never drift (the backend pins action URLs to the kk web paths).
 *
 * Known deep links (see NotificationService emitters):
 *   /app/toi[...]            → той planner
 *   /app/calendar/{date}     → that calendar day
 *   /app/calendar            → calendar
 *   http(s)://…              → external browser
 */
export function navigateFromActionUrl(url?: string | null): void {
  const target = (url ?? '').trim();
  if (!target) return;

  if (target.startsWith('/app/toi') || target.startsWith('/ru/app/toi')) {
    router.push('/toi');
    return;
  }

  if (target.startsWith('/app/calendar') || target.startsWith('/ru/app/calendar')) {
    const m = target.match(/\/app\/calendar\/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      router.push({ pathname: '/calendar-day', params: { date: m[1] } });
    } else {
      router.push('/calendar');
    }
    return;
  }

  if (target.startsWith('/app/notifications') || target.startsWith('/ru/app/notifications')) {
    router.push('/notifications');
    return;
  }

  if (/^https?:\/\//.test(target)) {
    Linking.openURL(target).catch(() => {});
  }
}
