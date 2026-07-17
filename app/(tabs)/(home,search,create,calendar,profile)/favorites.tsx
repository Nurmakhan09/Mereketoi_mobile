import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';

import { ListingCard } from '@/components/ListingCard';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { fetchFavorites } from '@/services/api/favorites';
import { GuestGate } from '@/components/GuestGate';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { ListingCard as ListingCardType } from '@/types';

/**
 * Favorites — reached from the profile menu as a pushed page with a back button
 * (design prompt §4/§12: not a bottom tab). The native header carries the title.
 */
export default function FavoritesScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const tabBarPad = useTabBarPadding();
  const status = useAuthStore((s) => s.status);
  const setAll = useFavoritesStore((s) => s.setAll);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const [items, setItems] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t.favoritesTitle });
  }, [navigation, t.favoritesTitle]);

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
      <FlatList
        data={items}
        keyExtractor={(it) => it.uuid}
        numColumns={2}
        columnWrapperStyle={styles.col}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + tabBarPad }]}
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
  list: { paddingTop: Spacing.base, paddingBottom: Spacing.xxxl },
  col: { paddingHorizontal: Spacing.base, gap: Spacing.md },
  cardCell: { flex: 1, marginBottom: Spacing.md },
});
