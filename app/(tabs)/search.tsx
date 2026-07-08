import { useCallback, useEffect, useMemo, useRef, useState, ReactNode, ComponentProps } from 'react';
import { View, StyleSheet, FlatList, TextInput, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/ListingCard';
import { Logo } from '@/components/Logo';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { CityPickerSheet } from '@/components/ui/CityPickerSheet';
import { Text } from '@/components/ui/Text';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { useTaxonomy } from '@/features/listings/useTaxonomy';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchListings } from '@/services/api/listings';
import { useReloadOnTabPress } from '@/hooks/useReloadOnTabPress';
import { ListingCard as ListingCardType, SortOption, PriceType } from '@/types';

const SORTS: SortOption[] = ['newest', 'oldest', 'price_asc', 'price_desc'];
const PRICE_TYPES: PriceType[] = ['fixed', 'negotiable', 'not_specified'];
const MONTHS_ABBR_KK = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
const MONTHS_ABBR_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

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

/** Full-width filter selector (icon + value/placeholder) that opens a picker sheet;
 *  shows a clear (✕) when a value is set, otherwise a chevron. */
function SelectorButton({
  icon,
  placeholder,
  value,
  onPress,
  onClear,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value?: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.selector}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} />
      <Text variant="small" color={value ? Colors.textBody : Colors.textFaint} style={styles.selectorTxt} numberOfLines={1}>
        {value ?? placeholder}
      </Text>
      {onClear ? (
        <Ionicons name="close-circle" size={18} color={Colors.textFaint} onPress={onClear} />
      ) : (
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      )}
    </Pressable>
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
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [date, setDate] = useState<string | undefined>(undefined);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

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
  // Pre-localized city list for the searchable picker + the selected city's display name.
  const cityItems = useMemo(() => cities.map((c) => ({ slug: c.slug, name: localized(c, 'name', locale) })), [cities, locale]);
  const cityName = city ? cityItems.find((c) => c.slug === city)?.name ?? city : undefined;

  // Count of applied filters (excludes the free-text query + default sort) → button badge.
  const activeCount =
    (category ? 1 : 0) + (city ? 1 : 0) + (priceType ? 1 : 0) + (priceMin || priceMax ? 1 : 0) + (date ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const clearAll = () => {
    setCategory(undefined);
    setCity(undefined);
    setPriceType(undefined);
    setPriceMin('');
    setPriceMax('');
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
        const res = await fetchListings({
          q, category, city, sort, price_type: priceType,
          price_min: priceMin ? parseInt(priceMin, 10) : undefined,
          price_max: priceMax ? parseInt(priceMax, 10) : undefined,
          date, page: pageToLoad,
        });
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
    [q, category, city, sort, priceType, priceMin, priceMax, date],
  );

  // Reload page 1 whenever any filter changes (query debounced).
  useEffect(() => {
    const handle = setTimeout(() => void load(1), q ? 350 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

  // Tapping the Search tab icon re-runs the search (page 1) from the network.
  useReloadOnTabPress(() => void load(1));

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
        {/* Date (availability) — opens a month-grid picker (minDate = today). */}
        <View style={styles.fRow}>
          <Text variant="small" color={Colors.textMuted} style={styles.fLabel}>{t.filterDate}</Text>
          <Text variant="xsmall" color={Colors.textFaint} style={styles.fHint}>{t.filterDateHint}</Text>
          <SelectorButton
            icon="calendar-outline"
            placeholder={t.pickDate}
            value={date ? dateLabel(date) : undefined}
            onPress={() => setDateOpen(true)}
            onClear={date ? () => setDate(undefined) : undefined}
          />
        </View>

        {/* Category */}
        <PillRow label={t.category}>
          <Pill label={t.allCategories} selected={!category} onPress={() => setCategory(undefined)} />
          {categories.map((c) => (
            <Pill key={c.slug} label={localized(c, 'name', locale)} selected={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </PillRow>

        {/* City — opens a searchable list. */}
        <View style={styles.fRow}>
          <Text variant="small" color={Colors.textMuted} style={styles.fLabel}>{t.city}</Text>
          <SelectorButton
            icon="location-outline"
            placeholder={t.pickCity}
            value={cityName}
            onPress={() => setCityOpen(true)}
            onClear={city ? () => setCity(undefined) : undefined}
          />
        </View>

        {/* Price type */}
        <PillRow label={t.priceType}>
          <Pill label={t.allPriceTypes} selected={!priceType} onPress={() => setPriceType(undefined)} />
          {PRICE_TYPES.map((p) => (
            <Pill key={p} label={priceLabel[p]} selected={priceType === p} onPress={() => setPriceType(p)} />
          ))}
        </PillRow>

        {/* Price range (₸) */}
        <View style={styles.fRow}>
          <Text variant="small" color={Colors.textMuted} style={styles.fLabel}>{t.priceRange}</Text>
          <View style={styles.priceRow}>
            <TextInput
              value={priceMin}
              onChangeText={(v) => setPriceMin(v.replace(/\D/g, ''))}
              placeholder={t.priceFrom}
              placeholderTextColor={Colors.textFaint}
              keyboardType="number-pad"
              style={[styles.priceInput, styles.flex1]}
            />
            <Text variant="small" color={Colors.textFaint}>—</Text>
            <TextInput
              value={priceMax}
              onChangeText={(v) => setPriceMax(v.replace(/\D/g, ''))}
              placeholder={t.priceTo}
              placeholderTextColor={Colors.textFaint}
              keyboardType="number-pad"
              style={[styles.priceInput, styles.flex1]}
            />
          </View>
        </View>

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
      <CityPickerSheet
        visible={cityOpen}
        onClose={() => setCityOpen(false)}
        items={cityItems}
        value={city}
        onSelect={setCity}
      />
      <DatePickerSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        value={date}
        onSelect={setDate}
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
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  priceInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textBody, fontSize: 15,
  },
  fActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, height: 46, backgroundColor: Colors.surface,
  },
  selectorTxt: { flex: 1 },
  flex1: { flex: 1 },
  footer: { paddingVertical: Spacing.base },
});
