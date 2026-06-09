import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { Locale } from '@/stores/localeStore';
import { fetchBookingHistory } from '@/services/api/weddingPlan';
import { BookingHistoryEntry } from '@/types';

// Action → human label (mirrors App.histAction_*). Keyed by the action minus "booking.".
const ACTIONS: Record<Locale, Record<string, string>> = {
  kk: {
    requested: 'Сұраныс жіберілді', accepted: 'Қабылданды', declined: 'Бас тартылды',
    cancelled: 'Болдырылмады', change_requested: 'Өзгеріс сұралды',
    change_confirmed: 'Өзгеріс расталды', change_rejected: 'Өзгеріс қабылданбады',
    invited: 'Шақыру жіберілді', invite_cancelled: 'Шақыру жойылды',
  },
  ru: {
    requested: 'Запрос отправлен', accepted: 'Принято', declined: 'Отклонено',
    cancelled: 'Отменено', change_requested: 'Запрошено изменение',
    change_confirmed: 'Изменение подтверждено', change_rejected: 'Изменение отклонено',
    invited: 'Приглашение отправлено', invite_cancelled: 'Приглашение удалено',
  },
};

const FIELDS: Record<Locale, Record<string, string>> = {
  kk: { date: 'Күні', price: 'Келісілген ақша', paid: 'Төленген ақша', time: 'Келу уақыты', address: 'Мекенжай', status: 'Күй', hall_id: 'Зал' },
  ru: { date: 'Дата', price: 'Согласованная сумма', paid: 'Оплачено', time: 'Время', address: 'Адрес', status: 'Статус', hall_id: 'Зал' },
};

const ROLES: Record<Locale, Record<string, string>> = {
  kk: { client: 'Той иесі', provider: 'Хабарландыру иесі' },
  ru: { client: 'Заказчик', provider: 'Исполнитель' },
};

const SKIP = ['requested_by', 'listing_id', 'category', 'client_user_id'];

type Tone = 'ok' | 'no' | 'wait' | 'neutral';
const TONE_COLOR: Record<Tone, string> = { ok: Colors.success, no: Colors.error, wait: Colors.warning, neutral: Colors.border };

function toneOf(a: string): Tone {
  if (a.includes('accepted') || a.includes('confirmed')) return 'ok';
  if (a.includes('declined') || a.includes('rejected') || a.includes('cancelled')) return 'no';
  if (a.includes('requested') || a.includes('invited')) return 'wait';
  return 'neutral';
}

function fmtVal(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '' || v === 0 || v === '0') return '—';
  if (key === 'price' || key === 'paid') return `${Number(v).toLocaleString('ru-RU').replace(/,/g, ' ')} ₸`;
  if (key === 'hall_id') return Number(v) > 0 ? `Зал ${Number(v)}` : '—';
  return String(v);
}

function fmtWhen(dt: string): string {
  const ts = Date.parse(dt);
  if (Number.isNaN(ts)) return dt;
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Diff { key: string; old: unknown; new: unknown; changed: boolean }

function buildDiffs(entry: BookingHistoryEntry): Diff[] {
  const oldV = (entry.old ?? {}) as Record<string, unknown>;
  const newV = (entry.new ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]));
  const out: Diff[] = [];
  for (const k of keys) {
    if (SKIP.includes(k)) continue;
    const ov = oldV[k] ?? null;
    const nv = newV[k] ?? null;
    out.push({ key: k, old: ov, new: nv, changed: JSON.stringify(ov) !== JSON.stringify(nv) });
  }
  return out;
}

/** Read-only change history of every booking the user is a party to (mirrors web). */
export default function BookingHistoryScreen() {
  const { t, locale } = useI18n();
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

  const actionLabel = (a: string) => ACTIONS[locale][a.replace(/^booking\./, '')] ?? a.replace(/^booking\./, '').replace(/_/g, ' ');
  const fieldLabel = (k: string) => FIELDS[locale][k] ?? k;
  const roleLabel = (r: string) => ROLES[locale][r] ?? r;

  return (
    <View style={styles.fill}>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const tone = toneOf(item.action);
          const diffs = buildDiffs(item).filter((d) => d.new !== null || d.old !== null);
          return (
            <Card padded style={StyleSheet.flatten([styles.row, { borderLeftWidth: 4, borderLeftColor: TONE_COLOR[tone] }])}>
              <View style={styles.head}>
                <Text variant="small" color={Colors.text} style={styles.action}>{actionLabel(item.action)}</Text>
                <Text variant="xsmall" color={Colors.textMuted}>{fmtWhen(item.created_at)}</Text>
              </View>
              <Text variant="xsmall" color={Colors.textMuted} style={styles.meta}>
                {item.actor_name ? `${item.actor_name} · ` : ''}{roleLabel(item.actor_role)} · #{item.booking_id}
              </Text>
              {diffs.length ? (
                <View style={styles.fields}>
                  {diffs.map((d) => (
                    <View key={d.key} style={[styles.field, d.changed && styles.fieldChanged]}>
                      <Text variant="xsmall" color={Colors.textMuted} style={styles.fkey}>{fieldLabel(d.key)}</Text>
                      {d.changed && d.old !== null && d.old !== '' ? (
                        <Text variant="xsmall" color={Colors.text}>
                          <Text variant="xsmall" color={Colors.textFaint} style={styles.oldVal}>{fmtVal(d.key, d.old)}</Text>
                          {'  →  '}{fmtVal(d.key, d.new)}
                        </Text>
                      ) : (
                        <Text variant="xsmall" color={Colors.text}>{fmtVal(d.key, d.new ?? d.old)}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : null}
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  action: { fontWeight: '800', flex: 1 },
  meta: { marginTop: 4 },
  fields: { marginTop: Spacing.sm, gap: 4 },
  field: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted },
  fieldChanged: { backgroundColor: '#FFFBEB' },
  fkey: { fontWeight: '700', marginBottom: 1 },
  oldVal: { textDecorationLine: 'line-through' },
  reason: { marginTop: Spacing.sm, fontStyle: 'italic' },
});
