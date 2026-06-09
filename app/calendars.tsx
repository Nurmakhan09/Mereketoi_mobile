import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchMyListings } from '@/services/api/listings';
import { imageUrl } from '@/utils/imageUrl';
import { OwnerListing } from '@/types';

/**
 * Calendars hub — lists the owner's own listings; tapping one opens its
 * availability calendar editor (per-hall for venues). Mirrors the web
 * `/app/calendar` hub. Only active/draft/expired listings have a calendar.
 */
export default function CalendarsHubScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();

  const [items, setItems] = useState<OwnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const redirected = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchMyListings();
      // Calendars only make sense for non-archived/blocked listings.
      const eligible = res.items.filter((i) => ['active', 'draft', 'expired'].includes(i.status));
      // One-listing model: skip the hub and open the single calendar directly.
      if (eligible.length === 1 && !redirected.current) {
        redirected.current = true;
        router.replace(`/my/${eligible[0].uuid}/calendar`);
        return;
      }
      setItems(eligible);
      navigation.setOptions({ title: t.calendarTitle });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigation, t.calendarTitle]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <FlatList
      style={styles.fill}
      data={items}
      keyExtractor={(it) => it.uuid}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const img = imageUrl(item.main_image);
        return (
          <Card style={styles.row} padded onPress={() => router.push(`/my/${item.uuid}/calendar`)}>
            <View style={styles.rowInner}>
              {img ? (
                <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={22} color={Colors.textFaint} />
                </View>
              )}
              <Text variant="h3" color={Colors.text} numberOfLines={2} style={styles.title}>
                {item.title}
              </Text>
              <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title={t.emptyMyListings}
          actionLabel={t.newListing}
          onAction={() => router.push('/create')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  row: { marginBottom: Spacing.md },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginHorizontal: Spacing.md },
});
