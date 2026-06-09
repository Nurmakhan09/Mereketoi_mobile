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
 * reuse the user's existing non-deleted listing (any status) if there is one,
 * otherwise create a blank draft. Mirrors the web getOrCreateBlankDraft — the
 * backend rejects a 2nd create (oneListingOnly), so never start a second one.
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
      // Reopen the single listing if it exists; else create the first one.
      const res = await fetchMyListings();
      const existing = res.items.find((i) => i.status !== 'deleted');
      const uuid = existing ? existing.uuid : await createListing();
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
