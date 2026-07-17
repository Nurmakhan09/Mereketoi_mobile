import { useEffect } from 'react';
import { Appearance, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { ActiveTheme, ThemePref } from '@/constants/theme';

/**
 * When the theme preference is 'system' («По умолчанию»), the palette is
 * resolved once per JS launch (constants/theme.ts, module scope). If the OS
 * switches light/dark while the app is open, reload the JS bundle so every
 * static StyleSheet re-evaluates with the new palette.
 *
 * The AppState guard filters iOS's spurious appearance flips fired while the
 * system takes background snapshots. In Expo Go reloadAsync throws — ignored;
 * the new scheme then applies on the next cold start.
 */
export function useSystemThemeFollow(pref: ThemePref): void {
  useEffect(() => {
    if (pref !== 'system') return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (AppState.currentState !== 'active') return;
      const next = colorScheme === 'dark' ? 'dark' : 'light';
      if (next !== ActiveTheme) {
        Updates.reloadAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [pref]);
}
