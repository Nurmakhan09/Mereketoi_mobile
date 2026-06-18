import { apiPost } from './client';
import { Endpoints } from './endpoints';

/**
 * Push device-token registration (mobile → backend).
 *
 * The backend stores one row per device token (device_tokens) and fans every
 * in-app notification out to the user's registered devices via Expo's push
 * service. Both calls are Bearer-authed (the token is tied to the current user).
 */

export type PushPlatform = 'ios' | 'android' | 'web';

/** Register (or refresh) this device's Expo push token for the current user. */
export function registerPushToken(token: string, platform: PushPlatform) {
  return apiPost<{ registered: boolean }>(Endpoints.pushRegister, { token, platform });
}

/** Drop this device's token (called on logout so we stop pushing to it). */
export function unregisterPushToken(token: string) {
  return apiPost<{ unregistered: boolean }>(Endpoints.pushUnregister, { token });
}
