/**
 * Secure on-device storage wrapper.
 *
 * Uses expo-secure-store on native (Keychain / Keystore). expo-secure-store has
 * NO web support, so on web we fall back to localStorage (web preview only — the
 * token is not sensitive there because Expo Go is the target). Never log values.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore web storage failures
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Storage keys (single source). */
export const StorageKeys = {
  token: 'mk_token',
  user: 'mk_user',
  locale: 'mk_locale',
  pushToken: 'mk_push_token',
  /** Last successful GET /app-config payload — hydrated at boot (offline-first). */
  appConfig: 'mk_app_config',
} as const;
