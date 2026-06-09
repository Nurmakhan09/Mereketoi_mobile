import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import { Pill } from '@/components/ui/Pill';
import { useI18n } from '@/locales';

const MONTHS_KK = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface Props {
  month: string; // YYYY-MM
  prevMonth: string | null;
  nextMonth: string | null;
  onChange: (month: string) => void;
}

/** Month navigator with a tappable label that opens a year+month picker
 * (jump straight to any month within [this month, +36 months]). */
export function CalendarHeader({ month, prevMonth, nextMonth, onChange }: Props) {
  const { locale } = useI18n();
  const months = locale === 'ru' ? MONTHS_RU : MONTHS_KK;
  const [open, setOpen] = useState(false);

  const [y, m] = month.split('-').map((n) => parseInt(n, 10));
  const label = `${months[m - 1]} ${y}`;

  // Build the allowed window: from the current real month to +36 months.
  const now = new Date();
  const startY = now.getFullYear();
  const startM = now.getMonth(); // 0-based
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i <= 36; i++) {
    const d = new Date(startY, startM + i, 1);
    const yy = d.getFullYear();
    const mm = d.getMonth();
    options.push({ value: `${yy}-${String(mm + 1).padStart(2, '0')}`, label: `${months[mm]} ${yy}` });
  }

  return (
    <View style={styles.row}>
      <Pressable disabled={!prevMonth} onPress={() => prevMonth && onChange(prevMonth)} style={styles.navBtn} hitSlop={6}>
        <Ionicons name="chevron-back" size={22} color={prevMonth ? Colors.primary : Colors.textFaint} />
      </Pressable>

      <Pressable onPress={() => setOpen(true)} style={styles.label} hitSlop={6}>
        <Text variant="h3" color={Colors.text}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={styles.labelIco} />
      </Pressable>

      <Pressable disabled={!nextMonth} onPress={() => nextMonth && onChange(nextMonth)} style={styles.navBtn} hitSlop={6}>
        <Ionicons name="chevron-forward" size={22} color={nextMonth ? Colors.primary : Colors.textFaint} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={styles.picker}>
          <View style={styles.grid}>
            {options.map((o) => (
              <View key={o.value} style={styles.cell}>
                <Pill
                  label={o.label}
                  selected={o.value === month}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  navBtn: { padding: Spacing.sm },
  label: { flexDirection: 'row', alignItems: 'center' },
  labelIco: { marginLeft: 4 },
  picker: { maxHeight: 360 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: { marginBottom: Spacing.sm },
});
