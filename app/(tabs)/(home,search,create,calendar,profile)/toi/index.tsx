import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Linking, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { GuideLink } from '@/components/GuideLink';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { FormField } from '@/components/ui/FormField';
import { SelectField } from '@/components/ui/SelectField';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { fetchWeddingPlan, saveWeddingPlan } from '@/services/api/weddingPlan';
import { cancelBooking, confirmChange, rejectChange, requestChange } from '@/services/api/bookings';
import { formatPrice } from '@/utils/format';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { WeddingPlan, WeddingPlanResponse, BookingCard } from '@/types';

/**
 * Той ұйымдастыру — step-by-step wizard (mirrors app/Views/app/wedding/index.php):
 *   Step 0       = той meta (date / time / city / guests / budget)
 *   Steps 1..N   = one per category (checklist done + note + booking card / "Іздеу")
 *   Final step   = custom checklist items + review
 * Clickable step dots up top; Back / Next / Save at the bottom. Cost badge = the
 * sum of accepted bookings' agreed prices. Deep-linkable via ?step=N.
 */
/** HH:MM time mask — digits only, auto-colon, clamps hours ≤23 and minutes ≤59. */
function maskTime(v: string): string {
  const raw = v.replace(/[^0-9]/g, '').slice(0, 4);
  if (!raw) return '';
  let h = raw.slice(0, 2);
  let m = raw.slice(2, 4);
  if (raw.length >= 2 && parseInt(h, 10) > 23) h = '23';
  if (raw.length === 4 && parseInt(m, 10) > 59) m = '59';
  return raw.length <= 2 ? h : `${h}:${m}`;
}

export default function ToiScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const tabBarPad = useTabBarPadding();
  const { isAuthed, requireAuth } = useRequireAuth();
  const params = useLocalSearchParams<{ step?: string }>();

  const [data, setData] = useState<WeddingPlanResponse | null>(null);
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const stepInit = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchWeddingPlan();
      setData(d);
      setPlan(d.plan);
      navigation.setOptions({ title: t.toiTitle });
      if (!stepInit.current) {
        const s = params.step ? parseInt(params.step, 10) : 0;
        if (!Number.isNaN(s) && s > 0) setStep(s);
        stepInit.current = true;
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigation, t.toiTitle, params.step]);

  useEffect(() => {
    if (isAuthed) void load();
    else requireAuth(() => {}, '/toi');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  if (loading) return <Loading />;
  if (error || !data || !plan) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const setMeta = (patch: Partial<WeddingPlan['meta']>) => setPlan((p) => (p ? { ...p, meta: { ...p.meta, ...patch } } : p));
  const setItem = (key: string, patch: Partial<WeddingPlan['items'][number]>) =>
    setPlan((p) => (p ? { ...p, items: p.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) } : p));
  const setCustom = (i: number, patch: Partial<WeddingPlan['custom_items'][number]>) =>
    setPlan((p) => (p ? { ...p, custom_items: p.custom_items.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) } : p));
  const addCustom = () =>
    setPlan((p) => (p ? { ...p, custom_items: [...p.custom_items, { title: '', done: false, note: '' }] } : p));

  const cityOptions = data.cities.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }));

  const totalSteps = plan.items.length + 2;
  const cur = Math.max(0, Math.min(step, totalSteps - 1));
  const isLast = cur === totalSteps - 1;

  const persist = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await saveWeddingPlan(plan);
      return true;
    } catch {
      Alert.alert(t.error, t.errorNetwork);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (await persist()) Alert.alert(t.appName, t.toiSaved);
  };

  // "Іздеу" → save the plan first (so meta/notes aren't lost), then open search.
  const onSearch = async (slug: string) => {
    await persist();
    router.push({ pathname: '/search', params: { category: slug } });
  };

  // ── Step body ──────────────────────────────────────────────────────────────
  let body: React.ReactNode = null;
  if (cur === 0) {
    body = (
      <>
        <Text variant="h3" color={Colors.text} style={styles.section}>{t.toiStep0Title}</Text>
        <Card padded>
          <FormField label={t.toiMetaDate} value={plan.meta.date} onChangeText={(v) => setMeta({ date: v })} placeholder="2026-08-01" />
          <FormField label={t.toiMetaTime} value={plan.meta.time} onChangeText={(v) => setMeta({ time: maskTime(v) })} keyboardType="number-pad" placeholder="18:00" maxLength={5} />
          <SelectField label={t.toiMetaCity} placeholder="—" value={plan.meta.city_id || null} options={cityOptions} onChange={(v) => setMeta({ city_id: Number(v) })} />
          <FormField label={t.toiMetaGuests} value={plan.meta.guests ? String(plan.meta.guests) : ''} onChangeText={(v) => setMeta({ guests: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })} keyboardType="number-pad" placeholder="0" />
          <FormField label={t.toiMetaBudget} value={plan.meta.budget ? String(plan.meta.budget) : ''} onChangeText={(v) => setMeta({ budget: parseInt(v.replace(/[^0-9]/g, ''), 10) || 0 })} keyboardType="number-pad" placeholder="0" />
        </Card>
      </>
    );
  } else if (cur <= plan.items.length) {
    const it = plan.items[cur - 1];
    const bk = data.bookings[it.category_slug] ?? null;
    body = (
      <Card padded>
        <View style={styles.itemHead}>
          <Text variant="h3" color={Colors.text} style={styles.itemTitle}>
            <Text variant="h3" color={Colors.primary}>{cur}. </Text>
            {(t as Record<string, string>)[`toiItem_${it.key}`] ?? it.key}
          </Text>
        </View>
        <Pressable style={styles.checkRow} onPress={() => setItem(it.key, { done: !it.done })}>
          <Ionicons name={it.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={it.done ? Colors.success : Colors.textFaint} />
          <Text variant="small" color={Colors.text} style={styles.checkLbl}>{t.toiMarkDone}</Text>
        </Pressable>
        <FormField label={t.toiNotePlaceholder} value={it.note} onChangeText={(v) => setItem(it.key, { note: v })} maxLength={200} />
        {bk ? (
          <BookingCardView card={bk} onChanged={load} />
        ) : (
          <Button title={t.toiSearch} variant="outline" icon="search-outline" small onPress={() => onSearch(it.category_slug)} />
        )}
      </Card>
    );
  } else {
    body = (
      <>
        <Text variant="h3" color={Colors.text} style={styles.section}>{t.toiCustomTitle}</Text>
        {plan.custom_items.map((c, i) => (
          <Card key={i} padded style={styles.itemCard}>
            <View style={styles.itemHead}>
              <Pressable style={styles.check} onPress={() => setCustom(i, { done: !c.done })} hitSlop={6}>
                <Ionicons name={c.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={c.done ? Colors.success : Colors.textFaint} />
              </Pressable>
              <View style={styles.itemTitle}>
                <FormField label="" value={c.title} onChangeText={(v) => setCustom(i, { title: v })} placeholder={t.toiCustomPlaceholder} maxLength={80} />
              </View>
            </View>
            <FormField label={t.toiNotePlaceholder} value={c.note} onChangeText={(v) => setCustom(i, { note: v })} maxLength={200} />
          </Card>
        ))}
        <Button title={t.toiAddItem} variant="outline" icon="add" small onPress={addCustom} style={styles.addBtn} />
        <Pressable style={styles.histLink} onPress={() => router.push('/toi/history')}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text variant="small" color={Colors.primary} style={styles.histLabel}>{t.historyTitle}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <View style={styles.fill}>
      {/* Guide link + cost badge */}
      <View style={styles.topbar}>
        <GuideLink anchor="toi" label={t.guideToi} />
        <Card style={styles.costCard} padded>
          <Text variant="xsmall" color={Colors.textMuted}>{t.toiCostBadge}</Text>
          <Text variant="h3" color={Colors.secondary}>
            {formatPrice(data.accepted_total, 'fixed', { negotiable: '', notSpecified: '', tenge: t.tenge })}
          </Text>
        </Card>
      </View>

      {/* Step dots */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dots} contentContainerStyle={styles.dotsInner}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = i >= 1 && i <= plan.items.length && plan.items[i - 1].done;
          return (
            <Pressable
              key={i}
              onPress={() => setStep(i)}
              style={[styles.dot, i === cur && styles.dotCur, done && i !== cur && styles.dotDone]}
            >
              <Text variant="xsmall" color={i === cur ? Colors.white : done ? Colors.success : Colors.textMuted} style={styles.dotTxt}>{i + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {body}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav — padded so it sits above the floating tab bar on iOS. */}
      <View style={[styles.bottomNav, tabBarPad ? { paddingBottom: Spacing.base + tabBarPad } : null]}>
        {cur > 0 ? (
          <Button title={t.toiStepBack} variant="outline" onPress={() => setStep(cur - 1)} style={styles.navBtn} />
        ) : <View style={styles.navBtn} />}
        {isLast ? (
          <Button title={t.toiSave} loading={saving} onPress={onSave} style={styles.navBtn} />
        ) : (
          <Button title={t.toiStepNext} onPress={() => setStep(cur + 1)} style={styles.navBtn} />
        )}
      </View>
    </View>
  );
}

/** A booking attached to a той slot (client side): pending / accepted / change-reconfirm. */
function BookingCardView({ card, onChanged }: { card: BookingCard; onChanged: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cDate, setCDate] = useState(card.date);
  const [cPrice, setCPrice] = useState(card.price != null ? String(card.price) : '');
  const [cPaid, setCPaid] = useState(card.paid != null ? String(card.paid) : '');
  const [cTime, setCTime] = useState(card.time);
  const [cAddr, setCAddr] = useState(card.address);

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
          <DealRow label={t.dealAgreed} value={card.price != null ? `${card.price} ${t.tenge}` : '—'} />
          <DealRow label={t.dealPaid} value={card.paid != null ? `${card.paid} ${t.tenge}` : '—'} />
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

      {/* Client-initiated change request (when nothing is staged) */}
      {card.status === 'accepted' && !card.pending ? (
        <>
          <Button title={t.bookingEdit} small variant="ghost" onPress={() => setEditing((e) => !e)} disabled={busy} />
          {editing ? (
            <View style={styles.changeBox}>
              <FormField label={t.toiMetaDate} value={cDate} onChangeText={setCDate} placeholder="2026-08-01" />
              <FormField label={t.dealAgreed} value={cPrice} onChangeText={(v) => setCPrice(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
              <FormField label={t.dealPaid} value={cPaid} onChangeText={(v) => setCPaid(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
              <FormField label={t.dealTime} value={cTime} onChangeText={(v) => setCTime(maskTime(v))} keyboardType="number-pad" placeholder="18:00" maxLength={5} />
              <FormField label={t.dealAddress} value={cAddr} onChangeText={setCAddr} />
              <Button
                title={t.changeRequest}
                small
                loading={busy}
                onPress={() => act(async () => {
                  await requestChange(card.id, {
                    date: cDate,
                    price: cPrice ? parseInt(cPrice, 10) : 0,
                    paid: cPaid ? parseInt(cPaid, 10) : 0,
                    time: cTime,
                    address: cAddr,
                  });
                  setEditing(false);
                })}
              />
            </View>
          ) : null}
        </>
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
  topbar: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, alignItems: 'flex-end', gap: Spacing.xs },
  costCard: { alignItems: 'flex-end' },
  dots: { maxHeight: 52, flexGrow: 0 },
  dotsInner: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm, alignItems: 'center' },
  dot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dotCur: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotDone: { borderColor: Colors.success, backgroundColor: '#F0FDF4' },
  dotTxt: { fontWeight: '700' },
  kav: { flex: 1 },
  bodyScroll: { flex: 1 },
  body: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  section: { marginBottom: Spacing.sm },
  itemCard: { marginBottom: Spacing.md },
  itemHead: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  itemTitle: { flex: 1 },
  check: { marginRight: Spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  checkLbl: { marginLeft: Spacing.sm },
  addBtn: { marginTop: Spacing.xs, alignSelf: 'flex-start' },
  histLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  histLabel: { marginLeft: Spacing.xs },
  bottomNav: {
    flexDirection: 'row', gap: Spacing.md, padding: Spacing.base,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface,
  },
  navBtn: { flex: 1 },
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
