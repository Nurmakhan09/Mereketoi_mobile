import { View, Pressable, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { CalendarDay, DayStatus } from '@/types';

const WEEKDAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс']; // Mon-first

const STATUS_BG: Record<DayStatus, string> = {
  free: '#D1FAE5',
  booked: '#FEE2E2',
  unavailable: '#F3F4F6',
};
const STATUS_FG: Record<DayStatus, string> = {
  free: '#047857',
  booked: '#B91C1C',
  unavailable: '#6B7280',
};

interface Props {
  month: string; // YYYY-MM
  days: CalendarDay[]; // statuses; missing days default to free
  onDayPress?: (date: string, current: DayStatus) => void;
}

/** 7-column month grid. Today is navy; days color-coded by status. */
export function MonthGrid({ month, days, onDayPress }: Props) {
  const [y, m] = month.split('-').map((n) => parseInt(n, 10));
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  // JS getDay: 0=Sun..6=Sat → convert to Mon-first index 0..6
  const startOffset = (first.getDay() + 6) % 7;
  const todayIso = new Date().toISOString().slice(0, 10);

  const statusByDate = new Map(days.map((d) => [d.date, d.status]));

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(iso);
  }

  return (
    <View>
      <View style={styles.week}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.cell}>
            <Text variant="xsmall" color={Colors.textMuted} center>
              {w}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={`e${i}`} style={styles.cell} />;
          const status: DayStatus = statusByDate.get(iso) ?? 'free';
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                disabled={!onDayPress || isPast}
                onPress={() => onDayPress?.(iso, status)}
                style={[
                  styles.day,
                  { backgroundColor: STATUS_BG[status] },
                  isToday && styles.today,
                  isPast && styles.past,
                ]}
              >
                <Text
                  variant="small"
                  center
                  color={isToday ? Colors.white : STATUS_FG[status]}
                >
                  {parseInt(iso.slice(8), 10)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', marginBottom: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { backgroundColor: Colors.primary },
  past: { opacity: 0.45 },
});
