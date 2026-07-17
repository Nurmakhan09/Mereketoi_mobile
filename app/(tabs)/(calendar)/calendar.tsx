import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { GuestGate } from '@/components/GuestGate';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { fetchOwnerCalendar } from '@/services/api/listings';
import { useReloadOnTabPress } from '@/hooks/useReloadOnTabPress';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { OwnerCalendar, DayStatus } from '@/types';

const MONTHS_KK = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD_KK = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];
const WD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const STATUS_STYLE: Record<DayStatus, { bg: string; fg: string }> = {
  free: { bg: '#f0fdf4', fg: '#16a34a' },
  booked: { bg: '#fee2e2', fg: '#b91c1c' },
  unavailable: { bg: '#f3f4f6', fg: '#6b7280' },
};

interface DayRow {
  date: string;
  day: number;
  isoWd: number; // 0=Mon .. 6=Sun
  status: DayStatus;
  note: string;
  marker: string; // '' | 'pending' | 'accepted' той booking on this day
  count: number; // number of той bookings on this day (badge)
  isToday: boolean;
  isPast: boolean;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Build all rows for a month (every day 1..N), looking up saved status/notes + той markers. */
function buildRows(
  month: string,
  days: OwnerCalendar['days'],
  bookings: Record<string, string>,
  counts: Record<string, number>,
): DayRow[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const [y, m] = month.split('-').map(Number);
  const count = new Date(y, m, 0).getDate(); // days in month
  const today = todayIso();
  const rows: DayRow[] = [];
  for (let d = 1; d <= count; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const saved = byDate.get(date);
    const js = new Date(date);
    rows.push({
      date,
      day: d,
      isoWd: (js.getDay() + 6) % 7,
      status: saved?.status ?? 'free',
      note: (saved?.public_note || saved?.private_note || '').trim(),
      marker: bookings[date] ?? '',
      count: counts[date] ?? 0,
      isToday: date === today,
      isPast: date < today,
    });
  }
  return rows;
}

/**
 * Calendar-notebook tab — the website's /app/calendar ported (30-day list for the
 * owner's single published listing). Each row opens that day's page.
 */
export default function CalendarTab() {
  const { t, locale } = useI18n();
  const tabBarPad = useTabBarPadding();
  const status = useAuthStore((s) => s.status);

  const storeUuid = useMyListingStore((s) => s.uuid);
  const hasPublished = useMyListingStore((s) => s.hasPublished);
  const loaded = useMyListingStore((s) => s.loaded);
  const refreshMine = useMyListingStore((s) => s.refresh);

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [hall, setHall] = useState(0);
  const [data, setData] = useState<OwnerCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    // The calendar is for PUBLISHED providers only (mirrors the website). A draft /
    // missing listing → no fetch; the publish-first empty state shows instead.
    if (!hasPublished || !storeUuid) {
      if (!loaded) await refreshMine();
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const d = await fetchOwnerCalendar(storeUuid, month, hall);
      setData(d);
      setMonth(d.month);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUuid, month, hall]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUuid, hall, month]);

  // Refresh bookings/status when returning from a day page.
  useFocusEffect(
    useCallback(() => {
      if (storeUuid) void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeUuid]),
  );

  // Tapping the Calendar tab icon reloads it from the network.
  useReloadOnTabPress(load);

  if (status !== 'authed') return <GuestGate returnTo="/calendar" />;

  // The page title now lives in the native header (small, centered, dark — set in
  // (calendar)/_layout.tsx), matching Параметрлер/Таңдаулы/Хабарламалар.
  const header = (
    <View style={{ paddingTop: Spacing.sm }}>
      <Text variant="small" color={Colors.textMuted} style={styles.intro}>{t.calNotebookIntro}</Text>
      {data?.is_venue && data.halls.length ? (
        <View style={styles.halls}>
          {data.halls.map((h, i) => (
            <Pill key={i} label={h.name} selected={hall === i + 1} onPress={() => setHall(i + 1)} />
          ))}
        </View>
      ) : null}
      {data ? (
        <CalendarHeader
          month={data.month}
          prevMonth={data.prev_month}
          nextMonth={data.next_month}
          prevCount={data.adjacent_bookings?.prev ?? 0}
          nextCount={data.adjacent_bookings?.next ?? 0}
          onChange={setMonth}
        />
      ) : null}
    </View>
  );

  // Wait for the one-listing flag to resolve before deciding.
  if (!loaded && !data) return <Loading />;

  // Calendar is unavailable until the ad is PUBLISHED (mirrors the website: a draft
  // / missing listing has no calendar). Show a publish-first prompt instead.
  if (!hasPublished) {
    return (
      <View style={styles.fill}>
        <EmptyState
          icon="calendar-outline"
          title={t.calNeedsListingTitle}
          actionLabel={t.publish}
          onAction={() => router.push('/create')}
        />
      </View>
    );
  }

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const rows = buildRows(data.month, data.days, data.bookings ?? {}, data.booking_counts ?? {});
  const months = locale === 'ru' ? MONTHS_RU : MONTHS_KK;
  const wd = locale === 'ru' ? WD_RU : WD_KK;

  return (
    <FlatList
      style={styles.fill}
      data={rows}
      keyExtractor={(r) => r.date}
      contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + tabBarPad }]}
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        const st = STATUS_STYLE[item.status];
        return (
          <Pressable
            style={[styles.row, item.isToday && styles.rowToday, item.isPast && styles.rowPast]}
            onPress={() => router.push({ pathname: '/calendar-day', params: { date: item.date, hall: String(hall) } })}
          >
            <View style={styles.dateCol}>
              <Text variant="h2" color={item.isPast ? Colors.textFaint : Colors.text}>{item.day}</Text>
              <Text variant="xsmall" color={Colors.textMuted}>{wd[item.isoWd]}</Text>
              {item.count > 0 ? (
                <View style={styles.countBadge}>
                  <Text variant="xsmall" color={Colors.white} style={styles.countTxt}>{item.count}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.mid}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text variant="xsmall" color={st.fg} style={styles.badgeTxt}>
                    {item.status === 'free' ? t.dayStatusFree : item.status === 'booked' ? t.dayStatusBooked : t.dayStatusUnavailable}
                  </Text>
                </View>
                {item.marker ? (
                  <View style={[styles.mark, item.marker === 'pending' ? styles.markPending : styles.markToi]}>
                    <Text variant="xsmall" color={item.marker === 'pending' ? '#92400e' : '#15803d'} style={styles.badgeTxt}>
                      {item.marker === 'pending' ? `● ${t.bookingStatusPending}` : '● Той'}
                    </Text>
                  </View>
                ) : null}
              </View>
              {item.note ? (
                <Text variant="xsmall" color={Colors.textMuted} numberOfLines={1} style={styles.note}>{item.note}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
          </Pressable>
        );
      }}
      ListFooterComponent={<View style={styles.footerNote}><Text variant="xsmall" color={Colors.textFaint} center>{months[(Number(data.month.split('-')[1]) - 1)]} {data.month.split('-')[0]}</Text></View>}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  intro: { marginBottom: Spacing.base },
  halls: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface,
  },
  rowToday: { borderColor: Colors.primary },
  rowPast: { backgroundColor: Colors.surfaceMuted, borderColor: Colors.surfaceMuted },
  dateCol: { width: 44, alignItems: 'center' },
  countBadge: {
    position: 'absolute', top: -6, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { fontWeight: '800', fontSize: 11, lineHeight: 14 },
  mid: { flex: 1, gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: Radius.sm },
  mark: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  markPending: { backgroundColor: '#fef3c7' },
  markToi: { backgroundColor: '#dcfce7' },
  badgeTxt: { fontWeight: '700' },
  note: {},
  footerNote: { paddingTop: Spacing.sm },
});
