import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { fetchWeddingPlan, saveWeddingPlan } from '@/services/api/weddingPlan';
import { cancelBooking, confirmChange, rejectChange } from '@/services/api/bookings';
import { formatPrice } from '@/utils/format';
import { WeddingPlan, WeddingPlanResponse, BookingCard } from '@/types';

export default function ToiScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { isAuthed, requireAuth } = useRequireAuth();

  const [data, setData] = useState<WeddingPlanResponse | null>(null);
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchWeddingPlan();
      setData(d);
      setPlan(d.plan);
      navigation.setOptions({ title: t.toiTitle });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigation, t.toiTitle]);

  useEffect(() => {
    if (isAuthed) void load();
    else { requireAuth(() => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const onSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      await saveWeddingPlan(plan);
      Alert.alert(t.appName, t.toiSaved);
    } catch {
      Alert.alert(t.error, t.errorNetwork);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (error || !data || !plan) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const setMeta = (patch: Partial<WeddingPlan['meta']>) => setPlan((p) => (p ? { ...p, meta: { ...p.meta, ...patch } } : p));
  const setItem = (key: string, patch: Partial<WeddingPlan['items'][number]>) =>
    setPlan((p) => (p ? { ...p, items: p.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) } : p));

  const cityOptions = data.cities.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }));

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Cost badge */}
        <Card style={styles.costCard} padded>
          <Text variant="xsmall" color={Colors.textMuted}>{t.toiCostBadge}</Text>
          <Text variant="h2" color={Colors.secondary}>
            {formatPrice(data.accepted_total, 'fixed', { negotiable: '', notSpecified: '', tenge: t.tenge })}
          </Text>
        </Card>

        {/* Той туралы (meta) */}
        <Text variant="h3" color={Colors.text} style={styles.section}>{t.toiStep0Title}</Text>
        <Card padded style={styles.metaCard}>
          <FormField label={t.toiMetaDate} value={plan.meta.date} onChangeText={(v) => setMeta({ date: v })} placeholder="2026-08-01" />
          <FormField label={t.toiMetaTime} value={plan.meta.time} onChangeText={(v) => setMeta({ time: v })} placeholder="18:00" maxLength={5} />
          <SelectField label={t.toiMetaCity} placeholder="—" value={plan.meta.city_id || null} options={cityOptions} onChange={(v) => setMeta({ city_id: Number(v) })} />
          <FormField label={t.toiMetaGuests} value={plan.meta.guests ? String(plan.meta.guests) : ''} onChangeText={(v) => setMeta({ guests: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })} keyboardType="number-pad" placeholder="0" />
          <FormField label={t.toiMetaBudget} value={plan.meta.budget ? String(plan.meta.budget) : ''} onChangeText={(v) => setMeta({ budget: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })} keyboardType="number-pad" placeholder="0" />
        </Card>

        {/* Checklist items */}
        {plan.items.map((it) => {
          const bk = data.bookings[it.category_slug] ?? null;
          return (
            <Card key={it.key} padded style={styles.itemCard}>
              <View style={styles.itemHead}>
                <Pressable style={styles.check} onPress={() => setItem(it.key, { done: !it.done })} hitSlop={6}>
                  <Ionicons name={it.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={it.done ? Colors.success : Colors.textFaint} />
                </Pressable>
                <Text variant="h3" color={Colors.text} style={styles.itemTitle}>
                  {(t as any)[`toiItem_${it.key}`] ?? it.key}
                </Text>
              </View>
              <FormField label={t.toiNotePlaceholder} value={it.note} onChangeText={(v) => setItem(it.key, { note: v })} maxLength={200} />

              {bk ? (
                <BookingCardView card={bk} onChanged={load} />
              ) : (
                <Button
                  title={t.toiSearch}
                  variant="outline"
                  icon="search-outline"
                  small
                  onPress={() => router.push({ pathname: '/search', params: { category: it.category_slug } })}
                />
              )}
            </Card>
          );
        })}

        <Button title={t.toiSave} loading={saving} onPress={onSave} style={styles.saveBtn} />
        <Pressable style={styles.histLink} onPress={() => router.push('/toi/history')}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text variant="small" color={Colors.primary} style={styles.histLabel}>{t.historyTitle}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** A booking attached to a той slot (client side): pending / accepted / change-reconfirm. */
function BookingCardView({ card, onChanged }: { card: BookingCard; onChanged: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const statusLabel: Record<string, string> = {
    pending: t.bookingStatusPending,
    accepted: t.bookingStatusAccepted,
    declined: t.bookingStatusDeclined,
    cancelled: t.bookingStatusCancelled,
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e: any) {
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  const onCall = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});

  return (
    <View style={[styles.bk, card.status === 'accepted' ? styles.bkAccepted : styles.bkPending]}>
      <View style={styles.bkRow}>
        <Pill label={statusLabel[card.status] ?? card.status} selected={card.status === 'accepted'} />
        {card.listing ? (
          <Text variant="small" color={Colors.primary} numberOfLines={1} style={styles.bkListing}>{card.listing.title}</Text>
        ) : null}
      </View>
      <Text variant="xsmall" color={Colors.textMuted}>{card.date}</Text>

      {card.status === 'pending' ? (
        <Text variant="xsmall" color={Colors.textMuted} style={styles.bkHint}>{t.bookingPendingHint}</Text>
      ) : null}

      {card.status === 'accepted' && card.contact ? (
        <View style={styles.bkContact}>
          <Text variant="small" color={Colors.text}>{card.contact.name}</Text>
          {card.contact.phone ? (
            <Pressable onPress={() => onCall(card.contact!.phone)}>
              <Text variant="small" color={Colors.secondary}>📞 {card.contact.phone}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {card.status === 'accepted' ? (
        <View style={styles.deal}>
          <DealRow label={t.dealAgreed} value={card.price != null ? `${card.price} ₸` : '—'} />
          <DealRow label={t.dealPaid} value={card.paid != null ? `${card.paid} ₸` : '—'} />
          <DealRow label={t.dealTime} value={card.time || '—'} />
          <DealRow label={t.dealAddress} value={card.address || '—'} />
        </View>
      ) : null}

      {/* Provider-requested change → the client confirms/rejects */}
      {card.status === 'accepted' && card.pending && card.pending.requested_by === 'provider' ? (
        <View style={styles.changeBox}>
          <Text variant="small" color={Colors.text}>{t.changeProviderRequested}</Text>
          <Text variant="xsmall" color={Colors.textMuted}>
            {card.pending.date}{card.pending.price != null ? ` · ${card.pending.price} ₸` : ''}{card.pending.time ? ` · ${card.pending.time}` : ''}
          </Text>
          <View style={styles.changeActions}>
            <Button title={t.changeConfirm} small onPress={() => act(() => confirmChange(card.id))} disabled={busy} style={styles.flex1} />
            <Button title={t.changeReject} small variant="outline" onPress={() => act(() => rejectChange(card.id))} disabled={busy} style={styles.flex1} />
          </View>
        </View>
      ) : null}

      {card.status === 'accepted' && card.pending && card.pending.requested_by === 'client' ? (
        <Text variant="xsmall" color={Colors.textMuted} style={styles.bkHint}>{t.changeAwaiting}</Text>
      ) : null}

      {(card.status === 'pending' || card.status === 'accepted') ? (
        <Button title={t.bookingCancel} small variant="ghost" onPress={() => act(() => cancelBooking(card.id))} disabled={busy} style={styles.cancelBtn} />
      ) : null}
    </View>
  );
}

function DealRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dealRow}>
      <Text variant="xsmall" color={Colors.textMuted}>{label}</Text>
      <Text variant="xsmall" color={Colors.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  costCard: { alignItems: 'flex-end', marginBottom: Spacing.base },
  section: { marginBottom: Spacing.sm, marginTop: Spacing.xs },
  metaCard: { marginBottom: Spacing.base },
  itemCard: { marginBottom: Spacing.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  check: { marginRight: Spacing.sm },
  itemTitle: { flex: 1 },
  saveBtn: { marginTop: Spacing.base },
  histLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  histLabel: { marginLeft: Spacing.xs },
  bk: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  bkPending: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  bkAccepted: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  bkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  bkListing: { flex: 1 },
  bkHint: { marginTop: Spacing.xs },
  bkContact: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, gap: 2 },
  deal: { marginTop: Spacing.sm },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: Colors.border },
  changeBox: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 },
  changeActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  flex1: { flex: 1 },
  cancelBtn: { marginTop: Spacing.sm },
});
