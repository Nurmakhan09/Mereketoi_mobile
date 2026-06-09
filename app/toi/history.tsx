import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchBookingHistory } from '@/services/api/weddingPlan';
import { formatDate } from '@/utils/format';
import { BookingHistoryEntry } from '@/types';

/** Read-only change history of every booking the user is a party to. */
export default function BookingHistoryScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const [items, setItems] = useState<BookingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await fetchBookingHistory());
      navigation.setOptions({ title: t.historyTitle });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigation, t.historyTitle]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <View style={styles.fill}>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const action = item.action.replace(/^booking\./, '').replace(/_/g, ' ');
          return (
            <Card padded style={styles.row}>
              <Text variant="small" color={Colors.text}>#{item.booking_id} · {action}</Text>
              <Text variant="xsmall" color={Colors.textMuted}>
                {item.actor_name || item.actor_role} · {formatDate(item.created_at)}
              </Text>
              {item.reason ? (
                <Text variant="xsmall" color={Colors.textMuted} style={styles.reason}>{item.reason}</Text>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState icon="time-outline" title={t.historyEmpty} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  row: { marginBottom: Spacing.md },
  reason: { marginTop: Spacing.xs, fontStyle: 'italic' },
});
