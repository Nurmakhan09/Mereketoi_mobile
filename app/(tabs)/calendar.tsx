import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { GuestGate } from '@/components/GuestGate';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { fetchOwnerCalendar } from '@/services/api/listings';
import { OwnerCalendar, DayStatus } from '@/types';

/** Launch floor — days before this can't be opened (mirrors CalendarController). */
const FLOOR_MONTH = '2026-06';

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
  isToday: boolean;
  isPast: boolean;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Build all rows for a month (every day 1..N), looking up saved status/notes. */
function buildRows(month: string, days: OwnerCalendar['days']): DayRow[] {
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
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);

  const storeUuid = useMyListingStore((s) => s.uuid);
  const hasPublished = useMyListingStore((s) => s.hasPublished);
  const refreshMine = useMyListingStore((s) => s.refresh);

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [hall, setHall] = useState(0);
  const [data, setData] = useState<OwnerCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!storeUuid) {
      // No (published) listing → make sure the store is fresh, then show empty state.
      await refreshMine();
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

  if (status !== 'authed') return <GuestGate returnTo="/calendar" />;

  const header = (
    <View style={{ paddingTop: insets.top + Spacing.base }}>
      <Text variant="h1" color={Colors.text} style={styles.heading}>{t.calendarTitle}</Text>
      <Text variant="small" color={Colors.textMuted} style={styles.intro}>{t.calNotebookIntro}</Text>
      {data?.is_venue && data.halls.length ? (
        <View style={styles.halls}>
          {data.halls.map((h, i) => (
            <Pill key={i} label={h.name} selected={hall === i + 1} onPress={() => setHall(i + 1)} />
          ))}
        </View>
      ) : null}
      {data ? (
        <CalendarHeader month={data.month} prevMonth={data.prev_month} nextMonth={data.next_month} onChange={setMonth} />
      ) : null}
    </View>
  );

  // No published listing yet → invite to publish (matches the web empty state).
  if (!hasPublished && !storeUuid) {
    return (
      <View style={styles.fill}>
        <View style={{ paddingTop: insets.top + Spacing.base }}>
          <Text variant="h1" color={Colors.text} style={styles.heading}>{t.calendarTitle}</Text>
        </View>
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

  const rows = buildRows(data.month, data.days);
  const months = locale === 'ru' ? MONTHS_RU : MONTHS_KK;
  const wd = locale === 'ru' ? WD_RU : WD_KK;

  return (
    <FlatList
      style={styles.fill}
      data={rows}
      keyExtractor={(r) => r.date}
      contentContainerStyle={styles.list}
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
            </View>
            <View style={styles.mid}>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <Text variant="xsmall" color={st.fg} style={styles.badgeTxt}>
                  {item.status === 'free' ? t.dayStatusFree : item.status === 'booked' ? t.dayStatusBooked : t.dayStatusUnavailable}
                </Text>
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
  heading: { marginBottom: Spacing.xs },
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
  mid: { flex: 1, gap: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: Radius.sm },
  badgeTxt: { fontWeight: '700' },
  note: {},
  footerNote: { paddingTop: Spacing.sm },
});
