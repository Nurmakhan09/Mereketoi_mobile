/**
 * Design tokens — mirrored from the backend's source of truth:
 *   - public/assets/css/tokens.css (web palette)
 *   - GET /api/v1/app-config → brand (runtime mirror, navy + gold rebrand 2026-06)
 *
 * Brand = deep blue navy (#000099) leads (CTA, links, active tabs, text);
 * gold (#A48C68) is the accent (VIP/badges/chrome). Backgrounds are white.
 * `app-config.brand` may override the colors at runtime (colors only — never
 * fonts/layout); see stores/appConfigStore.ts.
 */

import { Platform } from 'react-native';

/** Brand + semantic palette. Single light theme (the web app is light-only). */
export const Palette = {
  // Brand navy (primary)
  primary: '#000099',
  primaryHover: '#1A1AAD',
  primarySoft: '#E5E5F5',
  primarySoft2: '#EDEDF7',

  // Gold accent (secondary)
  secondary: '#A48C68',
  secondaryHover: '#8E7856',
  secondarySoft: '#F3EEE6',

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

  // Bottom-nav inactive (design prompt §3: uniform grey, gold is accent-only)
  tabInactive: '#9AA1AD',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  favorite: '#E11D48',

  white: '#FFFFFF',
  black: '#0F172A',
} as const;

export type PaletteKey = keyof typeof Palette;

/** Mutable copy that app-config can override at runtime (colors only). */
export const Colors: Record<PaletteKey, string> = { ...Palette };

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
 * Quicksand font family names (loaded in app/_layout.tsx via @expo-google-fonts).
 * Falls back to the platform sans until loaded.
 */
export const Fonts = {
  regular: 'Quicksand_400Regular',
  medium: 'Quicksand_500Medium',
  semibold: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
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

/** System fallback (used in style helpers when Quicksand isn't loaded yet). */
export const SystemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});
