import { useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

/**
 * Adaptive bottom-bar rendering mode (owner request 2026-07-17: the bar must
 * follow the OS look automatically):
 *   - 'glass' — iOS 26+ (built with the iOS 26 SDK): floating Liquid Glass pill.
 *   - 'blur'  — older iOS: classic full-width translucent blur bar.
 *   - 'solid' — Android: opaque white bar in normal layout flow (unchanged).
 */
export type TabBarMode = 'glass' | 'blur' | 'solid';

/** Dev-only: remembers the last logged availability so we log the value and any flip, not every call. */
let lastLoggedGlass: boolean | null = null;

/**
 * Resolved on EVERY call — deliberately NOT memoized.
 *
 * The previous one-shot cache latched whatever `isLiquidGlassAvailable()` happened
 * to return on the very first call. If that call landed before expo-glass-effect's
 * native module was ready it answered `false`, pinning an iOS 26 device to 'blur'
 * for the whole session. That mattered beyond looks: `tabBarStyle` (in
 * app/(tabs)/_layout.tsx) and `useTabBarPadding()` (via components/ui/Screen) read
 * the mode at DIFFERENT moments, so a mid-boot flip made them disagree about the
 * bar's height and the content padding beneath it.
 *
 * The __DEV__ log prints the raw availability once and again on any change — if it
 * ever flips false → true after boot, the latching theory is confirmed.
 */
export function getTabBarMode(): TabBarMode {
  if (Platform.OS !== 'ios') return 'solid';
  const glass = isLiquidGlassAvailable();
  if (__DEV__ && glass !== lastLoggedGlass) {
    lastLoggedGlass = glass;
    console.log('[tabBarMode] isLiquidGlassAvailable() =', glass, '→', glass ? 'glass' : 'blur');
  }
  return glass ? 'glass' : 'blur';
}

/** Bar content height, excluding the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 64 : 62;
/** Floating glass pill offsets. */
export const GLASS_SIDE_MARGIN = 12;
export const GLASS_BOTTOM_GAP = 6;

/**
 * Extra bottom padding a screen must add so scrollable content clears the
 * translucent bar (on iOS the bar is position:absolute and floats OVER the
 * content so it can blur what scrolls beneath). Returns 0 on Android (bar sits
 * in normal flow) and 0 outside the tab navigator (e.g. auth modal).
 */
export function useTabBarPadding(): number {
  const insets = useSafeAreaInsets();
  const inTabs = useContext(BottomTabBarHeightContext) != null;
  if (!inTabs) return 0;
  const mode = getTabBarMode();
  if (mode === 'glass') return GLASS_BOTTOM_GAP + insets.bottom + TAB_BAR_HEIGHT + 10;
  if (mode === 'blur') return TAB_BAR_HEIGHT + Math.max(insets.bottom, 8);
  return 0;
}
