/**
 * App-config (driven client). Loaded at launch; the root layout gates on
 * maintenance / min_version. Brand colors (if present) override the theme at
 * runtime — colors only, never fonts/layout (master-spec §7).
 */

import { create } from 'zustand';
import { AppConfig } from '@/types';
import { fetchAppConfig } from '@/services/api/appConfig';
import { ActiveTheme, Colors, Palette } from '@/constants/theme';
import { APP_VERSION } from '@/constants/config';

interface AppConfigState {
  config: AppConfig | null;
  loaded: boolean;
  error: boolean;
  load: () => Promise<void>;
}

/** Compare semantic versions a<b → -1, equal → 0, a>b → 1. Lenient on bad input. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function isForceUpdate(config: AppConfig | null): boolean {
  if (!config?.min_version) return false;
  return compareVersions(APP_VERSION, config.min_version) < 0;
}

/** Apply runtime brand colors over the mutable Colors object (colors only). */
function applyBrand(config: AppConfig): void {
  const b = config.brand;
  if (!b) return;
  // Brand overrides are authored for the LIGHT palette — never repaint the dark
  // theme with them (they would re-lighten surfaces/text).
  if (ActiveTheme === 'dark') return;
  if (b.primary) Colors.primary = b.primary;
  if (b.primary_hover) Colors.primaryHover = b.primary_hover;
  if (b.secondary) Colors.secondary = b.secondary;
  if (b.background) Colors.background = b.background;
  if (b.surface) Colors.surface = b.surface;
  if (b.text) Colors.text = b.text;
  if (b.text_muted) Colors.textMuted = b.text_muted;
  if (b.success) Colors.success = b.success;
  if (b.warning) Colors.warning = b.warning;
  if (b.error) Colors.error = b.error;
}

export const useAppConfigStore = create<AppConfigState>((set) => ({
  config: null,
  loaded: false,
  error: false,

  load: async () => {
    try {
      const config = await fetchAppConfig();
      applyBrand(config);
      set({ config, loaded: true, error: false });
    } catch {
      // Offline / server error → fall back to bundled palette; don't block the app
      // unless we explicitly need config (maintenance/force-update are best-effort).
      Object.assign(Colors, Palette);
      set({ loaded: true, error: true });
    }
  },
}));
