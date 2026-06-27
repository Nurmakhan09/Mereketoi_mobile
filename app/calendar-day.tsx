import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, Alert, Linking, Share } from 'react-native';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useMyListingStore } from '@/stores/myListingStore';
import { fetchOwnerCalendar, upsertOwnerCalendarDay } from '@/services/api/listings';
import {
  fetchProviderDay, acceptBooking, declineBooking,
  confirmChange, rejectChange, requestChange, createInvite, cancelInvite,
} from '@/services/api/bookings';
import { DayStatus, ProviderDay, ProviderDayBooking } from '@/types';

const FLOOR_DATE = '2026-06-01';
const STATUSES: DayStatus[] = ['free', 'booked', 'unavailable'];
const todayIso = () => new Date().toISOString().slice(0, 10);

const MONTHS_KK = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD_KK = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'];
const WD_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

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

function shiftDate(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** One day's full page — owner availability + той booking management. */
export default function CalendarDayScreen() {
  const params = useLocalSearchParams<{ date?: string; hall?: string }>();
  const date = typeof params.date === 'string' ? params.date : todayIso();
  const hall = params.hall ? parseInt(params.hall, 10) || 0 : 0;
  const { t, locale } = useI18n();

  const uuid = useMyListingStore((s) => s.uuid);
  const hasPublished = useMyListingStore((s) => s.hasPublished);
  const storeLoaded = useMyListingStore((s) => s.loaded);

  const [status, setStatus] = useState<DayStatus>('free');
  const [publicNote, setPublicNote] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [day, setDay] = useState<ProviderDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  // invite create
  const [invPrice, setInvPrice] = useState('');
  const [invTime, setInvTime] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const isPast = date < todayIso();

  const load = useCallback(async () => {
    if (!uuid) { setError(true); setLoading(false); return; }
    setLoading(true);
    setError(false);
    setInviteUrl(null);
    setInvPrice('');
    setInvTime('');
    try {
      const cal = await fetchOwnerCalendar(uuid, date.slice(0, 7), hall);
      const saved = cal.days.find((d) => d.date === date);
      setStatus(saved?.status ?? 'free');
      setPublicNote(saved?.public_note ?? '');
      setPrivateNote(saved?.private_note ?? '');
      try { setDay(await fetchProviderDay(date)); } catch { setDay(null); }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uuid, date, hall]);

  useEffect(() => { void load(); }, [load]);

  const saveDay = async () => {
    if (!uuid) return;
    setSaving(true);
    try {
      await upsertOwnerCalendarDay(uuid, {
        date, status, hall_id: hall,
        public_note: publicNote.trim() || undefined,
        private_note: privateNote.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      // Show the ACTUAL error (not a blanket "internet error") so a server/validation
      // failure isn't mislabelled as a network problem when the connection is fine.
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await load(); }
    catch (e: any) { Alert.alert(t.error, e?.message ?? t.errorNetwork); }
    finally { setBusy(false); }
  };

  const onCreateInvite = async () => {
    setBusy(true);
    try {
      const res = await createInvite({
        date, hall_id: hall,
        price: invPrice ? parseInt(invPrice, 10) : null,
        time: invTime.trim() || null,
      });
      setInviteUrl(res.invite_url);
      // Refresh ONLY the day's invite list — calling load() here would reset
      // inviteUrl back to null and the freshly created link would never show.
      try { setDay(await fetchProviderDay(date)); } catch { /* keep current */ }
    } catch (e: any) {
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  const onCall = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});
  const shareInvite = (url: string) => Share.share({ message: url }).catch(() => {});
  const waInvite = (url: string) => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`).catch(() => {});

  // Day page is for published providers only — bounce to the calendar (publish prompt).
  if (storeLoaded && !hasPublished) return <Redirect href="/calendar" />;
  if (loading && !day) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const prevDate = shiftDate(date, -1);
  const nextDate = shiftDate(date, 1);
  const canPrev = prevDate >= FLOOR_DATE;
  const months = locale === 'ru' ? MONTHS_RU : MONTHS_KK;
  const wd = locale === 'ru' ? WD_RU : WD_KK;
  const js = new Date(date + 'T00:00:00');
  const pretty = `${js.getDate()} ${months[js.getMonth()]} ${js.getFullYear()}`;
  const weekday = wd[(js.getDay() + 6) % 7];
  const go = (d: string) => router.replace({ pathname: '/calendar-day', params: { date: d, hall: String(hall) } });

  return (
    <Screen scroll padded edgeTop>
      <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        <Text variant="small" color={Colors.primary}>{t.calBackToList}</Text>
      </Pressable>

      {/* Date header with prev/next */}
      <View style={styles.dayHead}>
        <Pressable disabled={!canPrev} onPress={() => go(prevDate)} style={[styles.arr, !canPrev && styles.arrOff]} hitSlop={6}>
          <Ionicons name="chevron-back" size={24} color={canPrev ? Colors.text : Colors.textFaint} />
        </Pressable>
        <View style={styles.dayCenter}>
          <Text variant="h2" color={Colors.text} center>{pretty}</Text>
          <Text variant="small" color={Colors.textMuted} center>{weekday}</Text>
        </View>
        <Pressable onPress={() => go(nextDate)} style={styles.arr} hitSlop={6}>
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {isPast ? (
        <Card padded style={styles.pastCard}>
          <Text variant="small" color={Colors.textMuted}>{t.calPastReadonlyHint}</Text>
        </Card>
      ) : null}

      {/* Бронь сұраныстары (owner-only) */}
      {day && day.bookings.length > 0 ? (
        <View style={styles.section}>
          <Text variant="h3" color={Colors.text} style={styles.sectionH}>{t.daysBookings}</Text>
          {day.bookings.map((b) => (
            <BookingCard key={b.id} b={b} t={t} busy={busy} isPast={isPast} onCall={onCall} act={act} />
          ))}
        </View>
      ) : null}

      {/* Той иесін тіркеу (invite) — not for past days */}
      {!isPast ? (
        <Card padded style={styles.section}>
          <Text variant="h3" color={Colors.text} style={styles.sectionH}>{t.inviteCreate}</Text>
          {inviteUrl ? (
            <>
              <Text variant="small" color={Colors.success} style={styles.gap}>{t.inviteCreatedMsg}</Text>
              <View style={styles.row2}>
                <Button title={t.inviteCopy} small variant="outline" onPress={() => shareInvite(inviteUrl)} style={styles.flex1} />
                <Button title={t.inviteShareWa} small onPress={() => waInvite(inviteUrl)} style={styles.flex1} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.row2}>
                <TextInput value={invPrice} onChangeText={(v) => setInvPrice(v.replace(/[^0-9]/g, ''))} placeholder={t.bookingPriceLabel} placeholderTextColor={Colors.textFaint} keyboardType="number-pad" style={[styles.input, styles.flex1]} />
                <TextInput value={invTime} onChangeText={(v) => setInvTime(maskTime(v))} keyboardType="number-pad" placeholder="18:00" placeholderTextColor={Colors.textFaint} maxLength={5} style={[styles.input, styles.flex1]} />
              </View>
              <Button title={t.inviteCreateSubmit} small loading={busy} onPress={onCreateInvite} />
            </>
          )}
          {day?.invites.map((inv) => (
            <View key={inv.id} style={styles.invRow}>
              <Text variant="xsmall" color={Colors.textMuted}>🔗 {inv.price != null ? `${inv.price} ₸` : ''} {inv.time}</Text>
              <Pressable onPress={() => act(() => cancelInvite(inv.id))} disabled={busy}>
                <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Day availability — status + notes (read-only when past) */}
      <View style={styles.section}>
        <Text variant="h3" color={Colors.text} style={styles.sectionH}>{t.calStatusLabel}</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => (
            <Pill
              key={s}
              label={s === 'free' ? t.dayStatusFree : s === 'booked' ? t.dayStatusBooked : t.dayStatusUnavailable}
              selected={status === s}
              onPress={() => !isPast && setStatus(s)}
            />
          ))}
        </View>
        <TextInput editable={!isPast} value={publicNote} onChangeText={setPublicNote} placeholder={t.publicNote} placeholderTextColor={Colors.textFaint} maxLength={120} style={styles.input} />
        <TextInput editable={!isPast} value={privateNote} onChangeText={setPrivateNote} placeholder={t.privateNote} placeholderTextColor={Colors.textFaint} maxLength={500} multiline style={[styles.input, styles.textarea]} />
        {!isPast ? <Button title={t.save} loading={saving} onPress={saveDay} /> : null}
      </View>
    </Screen>
  );
}

/** Provider's view of one booking on this day: accept/decline, deal, change-reconfirm, request-change. */
function BookingCard({
  b, t, busy, isPast, onCall, act,
}: {
  b: ProviderDayBooking;
  t: ReturnType<typeof useI18n>['t'];
  busy: boolean;
  isPast: boolean;
  onCall: (p: string) => void;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [cDate, setCDate] = useState(''); // empty = keep current date
  const [cPrice, setCPrice] = useState(b.price != null ? String(b.price) : '');
  const [cPaid, setCPaid] = useState(b.paid != null ? String(b.paid) : '');
  const [cTime, setCTime] = useState(b.time);
  const [cAddr, setCAddr] = useState(b.address);

  return (
    <Card padded style={StyleSheet.flatten([styles.bkCard, b.status === 'accepted' ? styles.bkAccepted : styles.bkPending])}>
      <View style={styles.bkRow}>
        <Pill label={b.status === 'pending' ? t.bookingNewRequest : t.bookingStatusAccepted} selected={b.status === 'accepted'} />
      </View>

      {/* Requester identity + phone (owner-only, private) */}
      <Text variant="small" color={Colors.text}>{t.bookingClient}: {b.contact.name}</Text>
      {b.contact.phone ? (
        <Pressable onPress={() => onCall(b.contact.phone)}><Text variant="small" color={Colors.secondary}>📞 {b.contact.phone}</Text></Pressable>
      ) : null}
      {b.note ? <Text variant="xsmall" color={Colors.textMuted} style={styles.gap}>{b.note}</Text> : null}

      {b.status === 'pending' && !isPast ? (
        <View style={styles.row2}>
          <Button title={t.bookingAcceptAct} small onPress={() => act(() => acceptBooking(b.id))} disabled={busy} style={styles.flex1} />
          <Button title={t.bookingDeclineAct} small variant="outline" onPress={() => act(() => declineBooking(b.id))} disabled={busy} style={styles.flex1} />
        </View>
      ) : null}

      {b.status === 'accepted' ? (
        <View style={styles.deal}>
          <DealRow label={t.dealAgreed} value={b.price != null ? `${b.price} ₸` : '—'} />
          <DealRow label={t.dealPaid} value={b.paid != null ? `${b.paid} ₸` : '—'} />
          <DealRow label={t.dealTime} value={b.time || '—'} />
          <DealRow label={t.dealAddress} value={b.address || '—'} />
        </View>
      ) : null}

      {/* Client-requested change → provider confirms/rejects (read-only when past) */}
      {b.status === 'accepted' && b.pending && b.pending.requested_by === 'client' ? (
        <View style={styles.changeBox}>
          <Text variant="small" color={Colors.text}>{t.calChangeRequested}</Text>
          <Text variant="xsmall" color={Colors.textMuted}>
            {b.pending.date}{b.pending.price != null ? ` · ${b.pending.price} ₸` : ''}{b.pending.time ? ` · ${b.pending.time}` : ''}{b.pending.address ? ` · ${b.pending.address}` : ''}
          </Text>
          {!isPast ? (
            <View style={styles.row2}>
              <Button title={t.changeConfirm} small onPress={() => act(() => confirmChange(b.id))} disabled={busy} style={styles.flex1} />
              <Button title={t.changeReject} small variant="outline" onPress={() => act(() => rejectChange(b.id))} disabled={busy} style={styles.flex1} />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Provider-requested change → awaiting the client */}
      {b.status === 'accepted' && b.pending && b.pending.requested_by === 'provider' ? (
        <Text variant="xsmall" color={Colors.textMuted} style={styles.gap}>{t.changeAwaiting}</Text>
      ) : null}

      {/* No staged change → provider can REQUEST one (client confirms). Hidden on past days. */}
      {b.status === 'accepted' && !b.pending && !isPast ? (
        <>
          <Button title={t.bookingEdit} small variant="ghost" onPress={() => setEditing((e) => !e)} disabled={busy} />
          {editing ? (
            <View style={styles.changeBox}>
              <FieldLabel label={t.toiMetaDate} />
              <TextInput value={cDate} onChangeText={setCDate} placeholder="2026-08-01" placeholderTextColor={Colors.textFaint} style={styles.input} />
              <FieldLabel label={t.dealAgreed} />
              <TextInput value={cPrice} onChangeText={(v) => setCPrice(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor={Colors.textFaint} style={styles.input} />
              <FieldLabel label={t.dealPaid} />
              <TextInput value={cPaid} onChangeText={(v) => setCPaid(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor={Colors.textFaint} style={styles.input} />
              <FieldLabel label={t.dealTime} />
              <TextInput value={cTime} onChangeText={(v) => setCTime(maskTime(v))} keyboardType="number-pad" placeholder="18:00" placeholderTextColor={Colors.textFaint} maxLength={5} style={styles.input} />
              <FieldLabel label={t.dealAddress} />
              <TextInput value={cAddr} onChangeText={setCAddr} placeholderTextColor={Colors.textFaint} style={styles.input} />
              <Button
                title={t.changeRequest}
                small
                loading={busy}
                onPress={() => act(async () => {
                  await requestChange(b.id, {
                    date: cDate.trim() || undefined,
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
    </Card>
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

function FieldLabel({ label }: { label: string }) {
  return <Text variant="xsmall" color={Colors.textMuted} style={styles.fieldLbl}>{label}</Text>;
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  dayCenter: { flex: 1 },
  arr: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md },
  arrOff: { opacity: 0.35 },
  pastCard: { marginBottom: Spacing.base, backgroundColor: Colors.surfaceMuted },
  section: { marginBottom: Spacing.lg },
  sectionH: { marginBottom: Spacing.sm },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, marginBottom: Spacing.md, color: Colors.textBody, fontSize: 15,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  bkCard: { marginBottom: Spacing.md, gap: 3 },
  bkPending: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },
  bkAccepted: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  bkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  gap: { marginTop: Spacing.xs },
  row2: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex1: { flex: 1 },
  deal: { marginTop: Spacing.sm },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: Colors.border },
  changeBox: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 },
  invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  fieldLbl: { marginBottom: 2 },
});
