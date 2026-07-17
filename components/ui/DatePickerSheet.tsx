import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Spacing } from '@/constants/theme';
import { Text } from './Text';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { useI18n } from '@/locales';

const MONTHS_KK = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WD_KK = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];
const WD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Currently selected day (YYYY-MM-DD), or undefined for "any date". */
  value?: string;
  /** Emits the picked day (YYYY-MM-DD) or undefined when cleared. */
  onSelect: (date: string | undefined) => void;
}

interface Cell {
  date: string;
  day: number;
  past: boolean;
  isToday: boolean;
}

/**
 * Dependency-free month-grid date picker in a bottom sheet. minDate = today (past
 * days are disabled), navigable forward up to +24 months. Matches the in-app
 * calendar look (navy selection, Nunito type) — no extra native module.
 */
export function DatePickerSheet({ visible, onClose, value, onSelect }: Props) {
  const { t, locale } = useI18n();
  const months = locale === 'ru' ? MONTHS_RU : MONTHS_KK;
  const weekdays = locale === 'ru' ? WD_RU : WD_KK;
  const today = todayIso();
  const minMonth = today.slice(0, 7); // YYYY-MM — can't go earlier
  const maxMonth = useMemo(() => {
    const d = new Date();
    const f = new Date(d.getFullYear(), d.getMonth() + 24, 1);
    return `${f.getFullYear()}-${pad(f.getMonth() + 1)}`;
  }, []);

  // The month shown in the grid. Reset to the selected day's month (or today) on open.
  const [view, setView] = useState(today.slice(0, 7));
  useEffect(() => {
    if (visible) setView((value ?? today).slice(0, 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const [vy, vm] = view.split('-').map(Number); // vm is 1-based
  const label = `${months[vm - 1]} ${vy}`;
  const canPrev = view > minMonth;
  const canNext = view < maxMonth;
  const shift = (delta: number) => {
    const d = new Date(vy, vm - 1 + delta, 1);
    setView(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const cells = useMemo<(Cell | null)[]>(() => {
    const daysInMonth = new Date(vy, vm, 0).getDate();
    const lead = (new Date(vy, vm - 1, 1).getDay() + 6) % 7; // 0=Mon … 6=Sun
    const out: (Cell | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${view}-${pad(d)}`;
      out.push({ date, day: d, past: date < today, isToday: date === today });
    }
    return out;
  }, [view, vy, vm, today]);

  const pick = (date: string) => {
    onSelect(date);
    onClose();
  };
  const clear = () => {
    onSelect(undefined);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t.filterDate}>
      {/* Month navigator */}
      <View style={styles.nav}>
        <Pressable disabled={!canPrev} onPress={() => shift(-1)} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={canPrev ? Colors.primary : Colors.textFaint} />
        </Pressable>
        <Text variant="h3" color={Colors.text}>{label}</Text>
        <Pressable disabled={!canNext} onPress={() => shift(1)} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={canNext ? Colors.primary : Colors.textFaint} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View style={styles.weekRow}>
        {weekdays.map((w) => (
          <View key={w} style={styles.cell}>
            <Text variant="xsmall" color={Colors.textFaint} center>{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((c, i) => {
          if (!c) return <View key={`e${i}`} style={styles.cell} />;
          const selected = c.date === value;
          return (
            <View key={c.date} style={styles.cell}>
              <Pressable
                disabled={c.past}
                onPress={() => pick(c.date)}
                style={[
                  styles.day,
                  c.isToday && !selected ? styles.dayToday : null,
                  selected ? styles.daySelected : null,
                ]}
              >
                <Text
                  variant="small"
                  color={selected ? Colors.white : c.past ? Colors.textFaint : Colors.textBody}
                >
                  {c.day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Button title={t.anyDate} variant="outline" onPress={clear} style={styles.clear} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  navBtn: { padding: Spacing.sm },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  dayToday: { borderWidth: 1, borderColor: Colors.primary },
  daySelected: { backgroundColor: Colors.primary },
  clear: { marginTop: Spacing.base },
});
