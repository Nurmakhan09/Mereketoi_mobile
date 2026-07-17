/**
 * Design tokens — mirrored from the backend's source of truth:
 *   - public/assets/css/tokens.css (web palette)
 *   - GET /api/v1/app-config → brand (runtime mirror; gold accent removed → navy, 2026-06-25)
 *
 * Brand = deep blue navy (#000099) leads (CTA, links, active tabs, text);
 * deep navy (#0B1F4D) is the accent (VIP/badges/chrome) — the warm-gold accent
 * was removed 2026-06-25 to match the web. Backgrounds are white.
 * `app-config.brand` may override the colors at runtime (colors only — never
 * fonts/layout); see stores/appConfigStore.ts.
 */

import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Brand + semantic palette — LIGHT theme (the default). */
export const Palette = {
  // Brand navy (primary)
  primary: '#000099',
  primaryHover: '#1A1AAD',
  primarySoft: '#E5E5F5',
  primarySoft2: '#EDEDF7',

  // Navy accent (secondary) — gold removed 2026-06-25, matches web tokens.css
  secondary: '#0B1F4D',
  secondaryHover: '#08183A',
  secondarySoft: '#E8EAF3',

  // Surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F5F6',

  // Text
  text: '#000099',
  textBody: '#1F2530',
  textMuted: '#5B6573',
  textFaint: '#8B93A1',

  // Lines
  border: '#D3D5D6',
  borderStrong: '#BDC0C2',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  favorite: '#E11D48',

  white: '#FFFFFF',
  black: '#0F172A',
} as const;

export type PaletteKey = keyof typeof Palette;

/**
 * DARK theme counterpart (owner request 2026-07-17) — mirrors the website's
 * html[data-theme=dark] token set: deep navy-black surfaces, the brand blues
 * lifted to lighter indigos so CTAs/links keep contrast.
 */
export const DarkPalette: Record<PaletteKey, string> = {
  primary: '#6C6CFF',
  primaryHover: '#8585FF',
  primarySoft: '#1B1B3A',
  primarySoft2: '#16162E',

  secondary: '#9DB1E8',
  secondaryHover: '#B6C5F0',
  secondarySoft: '#17203A',

  background: '#0B0F1A',
  surface: '#121828',
  surfaceMuted: '#1A2133',

  text: '#A5B4FC',
  textBody: '#E5E7EB',
  textMuted: '#98A2B3',
  textFaint: '#6C7689',

  border: '#28324A',
  borderStrong: '#394562',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  favorite: '#FB7185',

  white: '#FFFFFF',
  black: '#0F172A',
};

/** Theme preference: 'system' (default — «По умолчанию») follows the OS. */
export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_PREF_KEY = 'mk_theme';

function readThemePrefSync(): ThemePref {
  if (Platform.OS === 'web') return 'system';
  try {
    const v = SecureStore.getItem(THEME_PREF_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Resolved ONCE, synchronously, at module-eval time — i.e. before ANY
 * StyleSheet.create in the app reads Colors, so every static style gets the
 * right palette. Changing the theme therefore requires a JS reload (settings
 * does Updates.reloadAsync()); 'system' follows the OS scheme at each launch.
 */
export const bootThemePref: ThemePref = readThemePrefSync();
export const ActiveTheme: 'light' | 'dark' =
  bootThemePref === 'dark' || (bootThemePref === 'system' && Appearance.getColorScheme() === 'dark')
    ? 'dark'
    : 'light';

// An explicit choice also drives the NATIVE appearance (alerts, keyboard,
// glass materials) so system chrome matches the in-app theme.
if (bootThemePref !== 'system') {
  try {
    Appearance.setColorScheme(bootThemePref);
  } catch {
    // best-effort
  }
}

/** Mutable copy that app-config can override at runtime (colors only). */
export const Colors: Record<PaletteKey, string> = {
  ...(ActiveTheme === 'dark' ? DarkPalette : Palette),
};

/** 4px spacing grid (master-spec §1.2). */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

/** Corner radii (master-spec §1.3). */
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14, // default card
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Elevation presets (master-spec §1.4) mapped to RN shadow props. */
export const Shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

/**
 * Nunito font family names (loaded in app/_layout.tsx via @expo-google-fonts).
 * Nunito (unlike Quicksand) ships the full Cyrillic-Extended set, so Kazakh
 * letters (Ә Ғ Қ Ң Ө Ұ Ү Һ І) render in the brand font instead of the system
 * fallback. Falls back to the platform sans until loaded.
 */
export const Fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

/** Type scale (master-spec §1.5). Kazakh runs long — keep line-height ≥1.5 on body. */
export const Typography = {
  display: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38 },
  h1: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 29 },
  h3: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 21 },
  xsmall: { fontFamily: Fonts.regular, fontSize: 12.5, lineHeight: 19 },
  button: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 18 },
} as const;

/** System fallback (used in style helpers when Nunito isn't loaded yet). */
export const SystemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});
