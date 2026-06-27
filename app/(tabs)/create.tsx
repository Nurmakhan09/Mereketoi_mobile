import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { createListing, fetchMyListings } from '@/services/api/listings';

/**
 * Create entry tab. Guest → Auth (return here). Authed → ONE-listing model:
 *   - already has a listing (draft OR published, any non-deleted status) → send to
 *     «Менің хабарландыруларым» (/my-listings); never start a second one (the
 *     backend rejects it via oneListingOnly).
 *   - no listing yet → create a blank draft and open the editor to fill it in.
 * Renders nothing persistent — it bounces the user onward on focus.
 */
export default function CreateTab() {
  const { t } = useI18n();
  const status = useAuthStore((s) => s.status);
  const [error, setError] = useState(false);

  const start = useCallback(async () => {
    if (status === 'loading') return;
    if (status !== 'authed') {
      router.replace({ pathname: '/auth', params: { returnTo: '/create' } });
      return;
    }
    setError(false);
    try {
      // Has a listing already? → My Listings page. Otherwise create the first draft
      // and open the editor.
      const res = await fetchMyListings();
      const existing = res.items.find((i) => i.status !== 'deleted');
      if (existing) {
        router.replace('/my-listings');
        return;
      }
      const uuid = await createListing();
      router.replace(`/my/${uuid}/edit`);
    } catch {
      setError(true);
    }
  }, [status]);

  // Run each time the tab is focused (fresh draft per create session).
  useFocusEffect(
    useCallback(() => {
      void start();
    }, [start]),
  );

  return (
    <Screen>
      <View style={styles.fill}>
        {error ? (
          <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={start} />
        ) : (
          <Loading label={t.loading} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
