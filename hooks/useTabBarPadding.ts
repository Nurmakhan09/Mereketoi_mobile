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

let cachedMode: TabBarMode | null = null;

/**
 * Resolved lazily on first use (memoized) instead of at module-eval time —
 * keeps the expo-glass-effect native call OFF the cold-start module-load path.
 */
export function getTabBarMode(): TabBarMode {
  if (cachedMode === null) {
    cachedMode = Platform.OS === 'ios' ? (isLiquidGlassAvailable() ? 'glass' : 'blur') : 'solid';
  }
  return cachedMode;
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
