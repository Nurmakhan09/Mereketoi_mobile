import { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Pill } from '@/components/ui/Pill';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { Legend } from '@/features/calendar/Legend';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchPublicCalendar, fetchListing } from '@/services/api/listings';
import { PublicCalendar } from '@/types';

/** Public read-only availability calendar. Venues let the viewer pick a hall. */
export default function PublicCalendarScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { t } = useI18n();
  const navigation = useNavigation();

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [halls, setHalls] = useState<{ name: string }[]>([]);
  const [hall, setHall] = useState(0); // 0 = general; venues default to 1 once halls load
  const [data, setData] = useState<PublicCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load the listing once to know its halls (so a venue can be viewed per-hall).
  useEffect(() => {
    fetchListing(uuid)
      .then((d) => {
        const h = d.halls ?? [];
        setHalls(h);
        if (h.length) setHall(1);
      })
      .catch(() => {});
  }, [uuid]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchPublicCalendar(uuid, month, hall);
      setData(d);
      setMonth(d.month);
      navigation.setOptions({ title: t.calendarTitle });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uuid, month, hall, navigation, t.calendarTitle]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hall, month]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <Screen scroll padded>
      {halls.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.base }}>
          {halls.map((h, i) => (
            <Pill key={i} label={h.name} selected={hall === i + 1} onPress={() => setHall(i + 1)} />
          ))}
        </ScrollView>
      ) : null}
      <CalendarHeader
        month={data.month}
        prevMonth={data.prev_month}
        nextMonth={data.next_month}
        onChange={setMonth}
      />
      <MonthGrid month={data.month} days={data.days} />
      <Legend />
    </Screen>
  );
}
