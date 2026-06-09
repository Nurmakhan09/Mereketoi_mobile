import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { Legend } from '@/features/calendar/Legend';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { useI18n } from '@/locales';
import { fetchPublicCalendar } from '@/services/api/listings';
import { PublicCalendar } from '@/types';

/** Public read-only availability calendar. */
export default function PublicCalendarScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { t } = useI18n();
  const navigation = useNavigation();

  const [month, setMonth] = useState<string | undefined>(undefined);
  const hall = 0; // public calendar shows the general/first-hall view
  const [data, setData] = useState<PublicCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
