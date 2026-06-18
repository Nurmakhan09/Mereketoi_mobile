import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/authStore';
import { registerPushToken, PushPlatform } from '@/services/api/push';
import { setItem, StorageKeys } from '@/services/storage';
import { navigateFromActionUrl } from '@/utils/notificationLink';

/**
 * Native push notifications wiring (Expo).
 *
 * - Foreground notifications still show (handler below).
 * - When the user is authed we request permission, fetch the Expo push token, and
 *   register it with the backend (device_tokens) so NotificationService can fan
 *   every in-app notification out to this device.
 * - Tapping a notification deep-links via navigateFromActionUrl (shared with the
 *   in-app inbox so the two never drift). Cold-start taps are handled once the
 *   navigator is ready.
 *
 * Everything is best-effort and guarded: a denied permission, a simulator, web,
 * or a missing EAS projectId simply means no push — never a crash.
 */

// Show banners + play sound while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function devicePlatform(): PushPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

function actionUrlOf(resp: Notifications.NotificationResponse): string | null {
  const data = resp.notification.request.content.data as Record<string, unknown> | undefined;
  const url = data?.action_url;
  return typeof url === 'string' ? url : null;
}

/** Resolve the EAS projectId (required by getExpoPushTokenAsync). */
function projectId(): string | undefined {
  const fromExpo = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (fromExpo) return fromExpo;
  // Legacy location, still populated in EAS builds.
  const legacy = (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig;
  return legacy?.projectId;
}

/** Request permission + return this device's Expo push token (or null). */
async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null; // web push is a separate flow — skip
  if (!Device.isDevice) return null;      // simulators can't get a push token

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted =
      existing.granted ||
      existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted && existing.canAskAgain !== false) {
      const req = await Notifications.requestPermissionsAsync();
      granted =
        req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    if (!granted) return null;

    const pid = projectId();
    if (!pid) return null; // not initialised with EAS yet — no token possible

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

/**
 * @param ready true once the root navigator is mounted (so cold-start taps can
 *              navigate). Pass the AppGate's `booted` flag.
 */
export function usePushNotifications(ready: boolean): void {
  const status = useAuthStore((s) => s.status);

  // Android needs an explicit channel for heads-up notifications.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#000099',
    }).catch(() => {});
  }, []);

  // Register the device token once the user is authenticated.
  useEffect(() => {
    if (status !== 'authed') return;
    let cancelled = false;
    (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;
      await setItem(StorageKeys.pushToken, token).catch(() => {});
      registerPushToken(token, devicePlatform()).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Live taps (app open / backgrounded).
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      navigateFromActionUrl(actionUrlOf(resp));
    });
    return () => sub.remove();
  }, []);

  // Cold-start tap (app launched from a notification) — after the navigator mounts.
  useEffect(() => {
    if (!ready) return;
    let done = false;
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        if (!done && resp) navigateFromActionUrl(actionUrlOf(resp));
      })
      .catch(() => {});
    return () => {
      done = true;
    };
  }, [ready]);
}
