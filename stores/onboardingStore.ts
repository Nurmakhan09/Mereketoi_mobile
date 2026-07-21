/**
 * New-user onboarding tour state (zustand).
 *
 * The tour is a pure-JS overlay (components/OnboardingTour.tsx) that highlights
 * each bottom-nav tab with an arrow + short caption + «Келесі» button. It ships
 * over-the-air (EAS Update) — no native code — so it can be added/tweaked without
 * an App Store / Google Play release.
 *
 * Shown ONCE per install (persisted flag), re-triggerable from Settings ("replay").
 */

import { create } from 'zustand';
import { getItem, setItem, StorageKeys } from '@/services/storage';

interface OnboardingState {
  /** Whether the tour overlay is currently showing. */
  visible: boolean;
  /** Guards maybeStart() so the boot check runs only once per session. */
  checked: boolean;
  /** Boot hook: show the tour if this install has never seen it. */
  maybeStart: () => Promise<void>;
  /** Force-show the tour again (Settings → «Танысу турын қайта көрсету»). */
  replay: () => void;
  /** Mark as seen and hide. */
  finish: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  visible: false,
  checked: false,

  maybeStart: async () => {
    if (get().checked) return;
    set({ checked: true });
    try {
      const seen = await getItem(StorageKeys.onboardingSeen);
      if (!seen) set({ visible: true });
    } catch {
      // Storage read failure → never block the app; simply skip the tour.
    }
  },

  replay: () => set({ visible: true }),

  finish: async () => {
    set({ visible: false });
    try {
      await setItem(StorageKeys.onboardingSeen, '1');
    } catch {
      // Persist failure is non-fatal — worst case the tour shows again next launch.
    }
  },
}));
