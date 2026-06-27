import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/ListingCard';
import { Logo } from '@/components/Logo';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useTaxonomy } from '@/features/listings/useTaxonomy';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchListings } from '@/services/api/listings';
import { ListingCard as ListingCardType, SortOption } from '@/types';

const SORTS: SortOption[] = ['newest', 'oldest', 'price_asc', 'price_desc'];

/** Catalog / Search — dropdown filters (q, city, category, sort) + paginated infinite scroll. */
export default function SearchScreen() {
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string; city?: string; q?: string }>();
  const { categories, cities } = useTaxonomy();
  const { isAuthed, requireAuth } = useRequireAuth();
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const toggleFav = useFavoritesStore((s) => s.toggle);

  const [q, setQ] = useState(params.q ?? '');
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [city, setCity] = useState<string | undefined>(params.city);
  const [sort, setSort] = useState<SortOption>('newest');

  const [items, setItems] = useState<ListingCardType[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  // Apply incoming nav params immediately (e.g. tapping a category on Home should
  // search by that category right away — no second tap needed).
  useEffect(() => {
    setCategory(params.category || undefined);
  }, [params.category]);
  useEffect(() => {
    setCity(params.city || undefined);
  }, [params.city]);

  const sortLabel: Record<SortOption, string> = {
    newest: t.sortNewest,
    oldest: t.sortOldest,
    price_asc: t.sortPriceAsc,
    price_desc: t.sortPriceDesc,
  };

  const load = useCallback(
    async (pageToLoad: number) => {
      const myReq = ++reqId.current;
      if (pageToLoad === 1) {
        setLoading(true);
        setError(false);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchListings({ q, category, city, sort, page: pageToLoad });
        if (myReq !== reqId.current) return; // stale
        setPages(res.meta.pages);
        setPage(res.meta.page);
        setItems((prev) => (pageToLoad === 1 ? res.items : [...prev, ...res.items]));
      } catch {
        if (myReq === reqId.current) setError(true);
      } finally {
        if (myReq === reqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [q, category, city, sort],
  );

  // Reload page 1 whenever any filter changes (query debounced).
  useEffect(() => {
    const handle = setTimeout(() => void load(1), q ? 350 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

  // Dropdown options ("all" entry first).
  const categoryOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: t.allCategories }, ...categories.map((c) => ({ value: c.slug, label: localized(c, 'name', locale) }))],
    [categories, locale, t.allCategories],
  );
  const cityOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: t.allCities }, ...cities.map((c) => ({ value: c.slug, label: localized(c, 'name', locale) }))],
    [cities, locale, t.allCities],
  );
  const sortOptions: SelectOption[] = SORTS.map((s) => ({ value: s, label: sortLabel[s] }));

  const onFavorite = (uuid: string) =>
    requireAuth(() => {
      void toggleFav(uuid).catch(() => {});
    });

  const loadMore = () => {
    if (!loadingMore && !loading && page < pages) {
      void load(page + 1);
    }
  };

  const header = (
    <View style={[styles.filters, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.logoRow}>
        <Logo size="md" />
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={Colors.textFaint}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q ? (
          <Ionicons name="close-circle" size={18} color={Colors.textFaint} onPress={() => setQ('')} />
        ) : null}
      </View>

      {/* Dropdown filters */}
      <SelectField
        label={t.category}
        placeholder={t.allCategories}
        value={category ?? ''}
        options={categoryOptions}
        onChange={(v) => setCategory(v ? String(v) : undefined)}
      />
      <SelectField
        label={t.city}
        placeholder={t.allCities}
        value={city ?? ''}
        options={cityOptions}
        onChange={(v) => setCity(v ? String(v) : undefined)}
      />
      <SelectField
        label={t.sort}
        placeholder={t.sortNewest}
        value={sort}
        options={sortOptions}
        onChange={(v) => setSort(v as SortOption)}
      />
    </View>
  );

  return (
    <View style={styles.fill}>
      {/* Filter bar kept OUTSIDE the FlatList. As a list header it was remounted
          every time results reloaded, which blurred the search TextInput and
          dismissed the keyboard on each keystroke. Fixed at the top, it stays
          mounted and the input keeps focus. */}
      {header}
      <FlatList
        style={styles.fill}
        data={items}
        keyExtractor={(it) => it.uuid}
        numColumns={2}
        columnWrapperStyle={styles.col}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
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
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={() => load(1)} />
          ) : (
            <EmptyState icon="search-outline" title={t.noResults} subtitle={t.noResultsHint} />
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.footer} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: Spacing.xxxl },
  col: { paddingHorizontal: Spacing.base, gap: Spacing.md, alignItems: 'stretch' },
  cardCell: { flex: 1, marginBottom: Spacing.md },
  filters: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  logoRow: { alignItems: 'center', marginBottom: Spacing.base },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    height: 46,
    marginBottom: Spacing.base,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, color: Colors.textBody, fontSize: 16 },
  footer: { paddingVertical: Spacing.base },
});
