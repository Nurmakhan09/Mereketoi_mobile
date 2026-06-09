/**
 * Locale state (kk default + ru). Persisted on-device; switchable in-app.
 * Falls back to the OS locale on first launch (master-spec §6.6).
 */

import { create } from 'zustand';
import { getLocales } from 'expo-localization';
import { getItem, setItem, StorageKeys } from '@/services/storage';

export type Locale = 'kk' | 'ru';

interface LocaleState {
  locale: Locale;
  ready: boolean;
  init: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
}

function deviceDefault(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'ru' ? 'ru' : 'kk';
  } catch {
    return 'kk';
  }
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'kk',
  ready: false,

  init: async () => {
    const saved = (await getItem(StorageKeys.locale)) as Locale | null;
    set({ locale: saved === 'ru' || saved === 'kk' ? saved : deviceDefault(), ready: true });
  },

  setLocale: async (locale) => {
    await setItem(StorageKeys.locale, locale);
    set({ locale });
  },
}));
