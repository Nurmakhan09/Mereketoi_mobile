import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { View, StyleSheet, FlatList, TextInput, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/ListingCard';
import { Logo } from '@/components/Logo';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useTaxonomy } from '@/features/listings/useTaxonomy';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchListings } from '@/services/api/listings';
import { ListingCard as ListingCardType, SortOption, PriceType } from '@/types';

const SORTS: SortOption[] = ['newest', 'oldest', 'price_asc', 'price_desc'];
const PRICE_TYPES: PriceType[] = ['fixed', 'negotiable', 'not_specified'];
const MONTHS_ABBR_KK = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
const MONTHS_ABBR_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Build the next `n` selectable dates (YYYY-MM-DD) starting today. */
function upcomingDates(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

/** A labeled horizontal pill row (module-scope → stable identity, keeps scroll position). */
function PillRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fRow}>
      <Text variant="small" color={Colors.textMuted} style={styles.fLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fScroll}>
        {children}
      </ScrollView>
    </View>
  );
}

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
  const [priceType, setPriceType] = useState<PriceType | undefined>(undefined);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);

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
  const priceLabel: Record<PriceType, string> = {
    fixed: t.priceFixed,
    negotiable: t.priceNegotiable,
    not_specified: t.priceNotSpecified,
  };

  // Pretty label for a YYYY-MM-DD date pill ("5 шіл").
  const months = locale === 'ru' ? MONTHS_ABBR_RU : MONTHS_ABBR_KK;
  const dateLabel = (d: string) => {
    const [, m, day] = d.split('-');
    return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]}`;
  };
  const dates = useMemo(() => upcomingDates(45), []);

  // Count of applied filters (excludes the free-text query + default sort) → button badge.
  const activeCount =
    (category ? 1 : 0) + (city ? 1 : 0) + (priceType ? 1 : 0) + (date ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const clearAll = () => {
    setCategory(undefined);
    setCity(undefined);
    setPriceType(undefined);
    setDate(undefined);
    setSort('newest');
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
        const res = await fetchListings({ q, category, city, sort, price_type: priceType, date, page: pageToLoad });
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
    [q, category, city, sort, priceType, date],
  );

  // Reload page 1 whenever any filter changes (query debounced).
  useEffect(() => {
    const handle = setTimeout(() => void load(1), q ? 350 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

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
      <View style={styles.searchRow}>
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
        {/* Filter button — opens the filter sheet (date · price · category · city · sort). */}
        <Pressable style={[styles.filterBtn, activeCount ? styles.filterBtnActive : null]} onPress={() => setFilterOpen(true)} hitSlop={6}>
          <Ionicons name="options-outline" size={22} color={activeCount ? Colors.white : Colors.primary} />
          {activeCount ? (
            <View style={styles.filterBadge}><Text variant="xsmall" color={Colors.white} style={styles.filterBadgeTxt}>{activeCount}</Text></View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );

  const filterSheet = (
    <Sheet visible={filterOpen} onClose={() => setFilterOpen(false)} title={t.filters}>
      <ScrollView style={styles.fSheet} keyboardShouldPersistTaps="handled">
        {/* Date (availability) */}
        <View style={styles.fRow}>
          <Text variant="small" color={Colors.textMuted} style={styles.fLabel}>{t.filterDate}</Text>
          <Text variant="xsmall" color={Colors.textFaint} style={styles.fHint}>{t.filterDateHint}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fScroll}>
            <Pill label={t.anyDate} selected={!date} onPress={() => setDate(undefined)} />
            {dates.map((d) => (
              <Pill key={d} label={dateLabel(d)} selected={date === d} onPress={() => setDate(d)} />
            ))}
          </ScrollView>
        </View>

        {/* Category */}
        <PillRow label={t.category}>
          <Pill label={t.allCategories} selected={!category} onPress={() => setCategory(undefined)} />
          {categories.map((c) => (
            <Pill key={c.slug} label={localized(c, 'name', locale)} selected={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </PillRow>

        {/* City */}
        <PillRow label={t.city}>
          <Pill label={t.allCities} selected={!city} onPress={() => setCity(undefined)} />
          {cities.map((c) => (
            <Pill key={c.slug} label={localized(c, 'name', locale)} selected={city === c.slug} onPress={() => setCity(c.slug)} />
          ))}
        </PillRow>

        {/* Price type */}
        <PillRow label={t.priceType}>
          <Pill label={t.allPriceTypes} selected={!priceType} onPress={() => setPriceType(undefined)} />
          {PRICE_TYPES.map((p) => (
            <Pill key={p} label={priceLabel[p]} selected={priceType === p} onPress={() => setPriceType(p)} />
          ))}
        </PillRow>

        {/* Sort */}
        <PillRow label={t.sort}>
          {SORTS.map((s) => (
            <Pill key={s} label={sortLabel[s]} selected={sort === s} onPress={() => setSort(s)} />
          ))}
        </PillRow>

        <View style={styles.fActions}>
          {activeCount ? <Button title={t.clearFilter} variant="outline" onPress={clearAll} style={styles.flex1} /> : null}
          <Button title={t.applyFilters} onPress={() => setFilterOpen(false)} style={styles.flex1} />
        </View>
      </ScrollView>
    </Sheet>
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
      {filterSheet}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    height: 46,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, color: Colors.textBody, fontSize: 16 },
  filterBtn: {
    width: 46, height: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeTxt: { fontWeight: '800', fontSize: 11, lineHeight: 14 },
  // Filter sheet
  fSheet: { maxHeight: 460 },
  fRow: { marginBottom: Spacing.base },
  fLabel: { fontWeight: '700', marginBottom: Spacing.xs },
  fHint: { marginBottom: Spacing.sm },
  fScroll: { gap: Spacing.sm, paddingVertical: 2, paddingRight: Spacing.base },
  fActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex1: { flex: 1 },
  footer: { paddingVertical: Spacing.base },
});
