import { useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

/**
 * Re-run `reload` every time this screen's bottom-tab icon is pressed — including
 * when the tab is already focused (React Navigation's `tabPress` event fires on
 * every tap). So tapping a tab always pulls fresh data from the network, matching
 * the owner's request "иконканы басқанда бет интернеттен қайта жүктелсін".
 *
 * `reload` is kept in a ref so callers can pass an inline arrow without the
 * listener resubscribing every render.
 */
export function useReloadOnTabPress(reload: () => void): void {
  const navigation = useNavigation();
  const ref = useRef(reload);
  ref.current = reload;

  useEffect(() => {
    // Tab screens now sit inside a per-tab Stack, so `tabPress` is emitted on the
    // PARENT Tabs route — subscribe there (fall back to self if already a tab).
    const target = navigation.getParent() ?? navigation;
    const unsub = target.addListener('tabPress' as never, (() => ref.current()) as never);
    return unsub;
  }, [navigation]);
}
