import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, Linking } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { ListingCard } from '@/components/ListingCard';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useTaxonomy } from '@/features/listings/useTaxonomy';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAppConfigStore } from '@/stores/appConfigStore';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchListings } from '@/services/api/listings';
import { useReloadOnTabPress } from '@/hooks/useReloadOnTabPress';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { categoryIcon } from '@/utils/categoryIcon';
import { ListingCard as ListingCardType, Category } from '@/types';
import { AppConfig } from '@/types/api';

/** Home / Discovery — hero search, parent-category strip, recommended grid. */
export default function HomeScreen() {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const tabBarPad = useTabBarPadding();
  const { categories, error: taxoError } = useTaxonomy();
  const banner = useAppConfigStore((s) => s.config?.home_banner);
  const { isAuthed, requireAuth } = useRequireAuth();
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const [items, setItems] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchListings({ sort: 'newest' });
      setItems(res.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Tapping the Home tab icon pulls fresh listings from the network.
  useReloadOnTabPress(load);

  const goSearch = (params?: Record<string, string>) =>
    router.push({ pathname: '/search', params });

  const onFavorite = (uuid: string) =>
    requireAuth(() => {
      void toggleFav(uuid).catch(() => {});
    });

  const renderHeader = () => (
    <View>
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.base }]}>
        <Logo size="lg" light style={styles.heroLogo} />
        <Text variant="body" color="#E5E5F5" style={styles.heroSub}>
          {t.discoverHeading}
        </Text>
        <Pressable style={styles.searchBar} onPress={() => goSearch()}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <Text variant="body" color={Colors.textMuted} style={styles.searchText}>
            {t.searchPlaceholder}
          </Text>
        </Pressable>
      </View>

      {/* Category strip */}
      <View style={styles.section}>
        <Text variant="h2" color={Colors.text} style={styles.sectionTitle}>
          {t.categories}
        </Text>
        {taxoError ? (
          <Text variant="small" color={Colors.textMuted}>
            {t.error}
          </Text>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => (
              <CategoryBubble
                key={cat.id}
                category={cat}
                label={localized(cat, 'name', locale)}
                onPress={() => goSearch({ category: cat.slug })}
              />
            ))}
          </View>
        )}
      </View>

      {/* Server-driven promo block (Admin → Басты бет банері) — off by default,
          appears instantly for every installed app once an admin turns it on. */}
      {banner?.enabled ? <HomeBanner banner={banner} locale={locale} /> : null}

      {/* Recommended heading — slightly smaller than h2 + auto-shrink so the full
          «Ұсынылған хабарландырулар» always fits on one line next to «Барлығын көру». */}
      <View style={styles.sectionRow}>
        <Text
          variant="h2"
          color={Colors.text}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.sectionHeading}
        >
          {t.recommended}
        </Text>
        <Pressable onPress={() => goSearch()} style={styles.seeAllBtn} hitSlop={6}>
          <Text variant="small" color={Colors.primary} numberOfLines={1}>
            {t.seeAll}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.fill}>
        {renderHeader()}
        <Loading />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.fill}
      data={items}
      keyExtractor={(it) => it.uuid}
      numColumns={2}
      columnWrapperStyle={styles.col}
      contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + tabBarPad }]}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <View style={styles.cardCell}>
          <ListingCard
            item={item}
            onPress={() => router.push(`/listing/${item.uuid}`)}
            favorited={isAuthed && favoriteIds.has(item.uuid)}
            onToggleFavorite={() => onFavorite(item.uuid)}
          />
        </View>
      )}
      ListEmptyComponent={
        error ? (
          <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
        ) : (
          <EmptyState icon="cube-outline" title={t.emptyListings} subtitle={t.emptyListingsHint} />
        )
      }
    />
  );
}

function HomeBanner({
  banner,
  locale,
}: {
  banner: NonNullable<AppConfig['home_banner']>;
  locale: string;
}) {
  const title = (locale === 'ru' ? banner.title_ru : banner.title_kk) || banner.title_kk || banner.title_ru;
  const subtitle =
    (locale === 'ru' ? banner.subtitle_ru : banner.subtitle_kk) || banner.subtitle_kk || banner.subtitle_ru;
  if (!title && !subtitle) return null;

  const onPress = banner.link_url ? () => Linking.openURL(banner.link_url!).catch(() => {}) : undefined;

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: banner.bg_color || Colors.primary }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {title ? (
        <Text variant="h3" color={Colors.white} style={styles.bannerTitle}>
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text variant="small" color={Colors.white} style={styles.bannerSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

function CategoryBubble({
  category,
  label,
  onPress,
}: {
  category: Category;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.bubble} onPress={onPress}>
      <View style={styles.bubbleIcon}>
        <Ionicons name={categoryIcon(category.slug)} size={20} color={Colors.primary} />
      </View>
      <Text variant="xsmall" color={Colors.textBody} center numberOfLines={2} style={styles.bubbleLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: Spacing.xxxl },
  col: { paddingHorizontal: Spacing.base, gap: Spacing.md, alignItems: 'stretch' },
  cardCell: { flex: 1, marginBottom: Spacing.md },
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroLogo: { marginBottom: Spacing.xs },
  heroSub: { marginBottom: Spacing.lg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  searchText: { marginLeft: Spacing.sm },
  section: { paddingHorizontal: Spacing.base, marginTop: Spacing.lg },
  banner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.md,
  },
  bannerTitle: { fontWeight: '700' },
  bannerSubtitle: { marginTop: 4, opacity: 0.9 },
  sectionRow: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: { flex: 1, marginRight: Spacing.sm, fontSize: 19, lineHeight: 25 },
  seeAllBtn: { flexShrink: 0 },
  sectionTitle: { marginBottom: Spacing.md },
  // Compact wrapped grid (4 per row) so every category fits on one screen.
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  bubble: { width: '25%', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 2 },
  bubbleIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleLabel: { lineHeight: 13, minHeight: 26 },
});
