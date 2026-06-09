import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/locales';

/** Color legend for the calendar grid (free / booked / unavailable). */
export function Legend() {
  const { t } = useI18n();
  const items = [
    { color: '#D1FAE5', label: t.dayStatusFree },
    { color: '#FEE2E2', label: t.dayStatusBooked },
    { color: '#F3F4F6', label: t.dayStatusUnavailable },
  ];
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <View key={it.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: it.color }]} />
          <Text variant="xsmall" color={Colors.textMuted}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.lg, gap: Spacing.base },
  item: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 14, height: 14, borderRadius: Radius.xs, marginRight: Spacing.xs },
});
