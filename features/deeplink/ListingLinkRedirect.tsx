/**
 * Universal-link landing screen.
 *
 * The website's shareable listing URL is /listings/{seo-slug}-ID{public_code}.html
 * (and /ru/listings/... for Russian). The app navigates by `uuid`, so we pull the
 * public_code out of the slug and resolve it through the API — GET /listings/{ref}
 * accepts either identifier. Anything unresolvable lands on Home rather than a
 * dead screen: the listing may have expired or been removed since the link was sent.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/theme';
import { fetchListing } from '@/services/api/listings';

/** "astana-toikhana-IDab12cd34.html" → "ab12cd34" */
function parsePublicCode(slug: string): string | null {
  const match = /-ID([A-Za-z0-9]+)\.html$/.exec(decodeURIComponent(slug));
  return match ? match[1] : null;
}

export function ListingLinkRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const code = slug ? parsePublicCode(slug) : null;
      if (!code) {
        router.replace('/');
        return;
      }
      try {
        const listing = await fetchListing(code);
        if (!cancelled) router.replace(`/listing/${listing.uuid}`);
      } catch {
        if (!cancelled) router.replace('/');
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
});
