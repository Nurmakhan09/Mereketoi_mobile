import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { ListingCard } from '@/components/ListingCard';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { fetchFavorites } from '@/services/api/favorites';
import { GuestGate } from '@/components/GuestGate';
import { ListingCard as ListingCardType } from '@/types';

export default function FavoritesScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const setAll = useFavoritesStore((s) => s.setAll);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const [items, setItems] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const list = await fetchFavorites();
      setItems(list);
      setAll(list.map((i) => i.uuid));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [setAll]);

  useFocusEffect(
    useCallback(() => {
      if (status === 'authed') void load();
    }, [status, load]),
  );

  if (status !== 'authed') {
    return <GuestGate returnTo="/favorites" />;
  }

  const onUnfavorite = async (uuid: string) => {
    await toggleFav(uuid).catch(() => {});
    setItems((prev) => prev.filter((i) => i.uuid !== uuid));
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.base }]}>
        <Logo size="sm" style={styles.headerLogo} />
        <Text variant="h1" color={Colors.text}>
          {t.favoritesTitle}
        </Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.uuid}
        numColumns={2}
        columnWrapperStyle={styles.col}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cardCell}>
            <ListingCard
              item={item}
              onPress={() => router.push(`/listing/${item.uuid}`)}
              favorited
              onToggleFavorite={() => onUnfavorite(item.uuid)}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
          ) : (
            <EmptyState
              icon="heart-outline"
              title={t.emptyFavorites}
              subtitle={t.emptyFavoritesHint}
              actionLabel={t.browseCatalog}
              onAction={() => router.push('/search')}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.base },
  headerLogo: { marginBottom: Spacing.sm },
  list: { paddingBottom: Spacing.xxxl },
  col: { paddingHorizontal: Spacing.base, gap: Spacing.md },
  cardCell: { flex: 1, marginBottom: Spacing.md },
});
