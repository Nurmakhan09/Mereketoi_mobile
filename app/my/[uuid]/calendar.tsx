import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Linking, Share, Pressable } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { Legend } from '@/features/calendar/Legend';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchOwnerCalendar, upsertOwnerCalendarDay } from '@/services/api/listings';
import {
  fetchProviderDay, acceptBooking, declineBooking, confirmChange, rejectChange,
  createInvite, cancelInvite,
} from '@/services/api/bookings';
import { OwnerCalendar, DayStatus, ProviderDay } from '@/types';

const STATUSES: DayStatus[] = ['free', 'booked', 'unavailable'];
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function OwnerCalendarScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { t } = useI18n();
  const navigation = useNavigation();

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [hall, setHall] = useState(0);
  const [data, setData] = useState<OwnerCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // day editor
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<DayStatus>('free');
  const [publicNote, setPublicNote] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [saving, setSaving] = useState(false);

  // bookings + invites for the open day (provider view)
  const [day, setDay] = useState<ProviderDay | null>(null);
  const [busy, setBusy] = useState(false);
  const [invPrice, setInvPrice] = useState('');
  const [invTime, setInvTime] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const isPast = editDate ? editDate < todayIso() : false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await fetchOwnerCalendar(uuid, month, hall);
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

  const loadDay = useCallback(async (date: string) => {
    setDay(null);
    setInviteUrl(null);
    setInvPrice('');
    setInvTime('');
    try {
      setDay(await fetchProviderDay(date));
    } catch {
      // bookings are a best-effort overlay; ignore failures
    }
  }, []);

  const openDay = (date: string, current: DayStatus) => {
    const existing = data?.days.find((d) => d.date === date);
    setEditDate(date);
    setEditStatus(current);
    setPublicNote(existing?.public_note ?? '');
    setPrivateNote(existing?.private_note ?? '');
    void loadDay(date);
  };

  const saveDay = async () => {
    if (!editDate) return;
    setSaving(true);
    try {
      await upsertOwnerCalendarDay(uuid, {
        date: editDate,
        status: editStatus,
        hall_id: hall,
        public_note: publicNote.trim() || undefined,
        private_note: privateNote.trim() || undefined,
      });
      setEditDate(null);
      await load();
    } catch {
      Alert.alert(t.error, t.errorNetwork);
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      if (editDate) await loadDay(editDate);
      await load();
    } catch (e: any) {
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvite = async () => {
    if (!editDate) return;
    setBusy(true);
    try {
      const res = await createInvite({
        date: editDate,
        hall_id: hall,
        price: invPrice ? parseInt(invPrice, 10) : null,
        time: invTime.trim() || null,
      });
      setInviteUrl(res.invite_url);
      if (editDate) await loadDay(editDate);
    } catch (e: any) {
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  const shareInvite = (url: string) => Share.share({ message: url }).catch(() => {});
  const waInvite = (url: string) => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`).catch(() => {});
  const onCall = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {});

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <Screen scroll padded>
      {data.is_venue && data.halls.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.halls}>
          {data.halls.map((h, i) => (
            <Pill key={i} label={h.name} selected={hall === i + 1} onPress={() => setHall(i + 1)} />
          ))}
        </ScrollView>
      ) : null}

      <CalendarHeader month={data.month} prevMonth={data.prev_month} nextMonth={data.next_month} onChange={setMonth} />
      <MonthGrid month={data.month} days={data.days} onDayPress={openDay} />
      <Legend />

      <Sheet visible={!!editDate} onClose={() => setEditDate(null)} title={editDate ?? ''}>
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          {isPast ? (
            <Text variant="small" color={Colors.textMuted} style={styles.pastNote}>{t.calPastReadonly}</Text>
          ) : (
            <>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <Pill
                    key={s}
                    label={s === 'free' ? t.dayStatusFree : s === 'booked' ? t.dayStatusBooked : t.dayStatusUnavailable}
                    selected={editStatus === s}
                    onPress={() => setEditStatus(s)}
                  />
                ))}
              </View>
              <TextInput value={publicNote} onChangeText={setPublicNote} placeholder={t.publicNote} placeholderTextColor={Colors.textFaint} maxLength={120} style={styles.input} />
              <TextInput value={privateNote} onChangeText={setPrivateNote} placeholder={t.privateNote} placeholderTextColor={Colors.textFaint} maxLength={500} multiline style={[styles.input, styles.textarea]} />
              <Button title={t.save} loading={saving} onPress={saveDay} />
            </>
          )}

          {/* Той сұраныстары + шақырту (owner-only) */}
          {day && (day.bookings.length > 0 || day.invites.length > 0 || !isPast) ? (
            <View style={styles.bkSection}>
              <Text variant="h3" color={Colors.text} style={styles.bkH}>{t.daysBookings}</Text>

              {day.bookings.length === 0 ? (
                <Text variant="small" color={Colors.textMuted} style={styles.bkEmpty}>{t.noBookingsForDay}</Text>
              ) : null}

              {day.bookings.map((b) => (
                <Card key={b.id} padded style={styles.bkCard}>
                  <View style={styles.bkRow}>
                    <Pill label={b.status === 'pending' ? t.bookingNewRequest : t.bookingStatusAccepted} selected={b.status === 'accepted'} />
                  </View>
                  <Text variant="small" color={Colors.text}>{t.bookingClient}: {b.contact.name}</Text>
                  {b.contact.phone ? (
                    <Pressable onPress={() => onCall(b.contact.phone)}><Text variant="small" color={Colors.secondary}>📞 {b.contact.phone}</Text></Pressable>
                  ) : null}
                  {b.note ? <Text variant="xsmall" color={Colors.textMuted}>{b.note}</Text> : null}
                  {b.status === 'accepted' ? (
                    <Text variant="xsmall" color={Colors.textMuted}>
                      {t.dealAgreed}: {b.price != null ? `${b.price} ₸` : '—'} · {t.dealTime}: {b.time || '—'}
                    </Text>
                  ) : null}

                  {b.status === 'pending' ? (
                    <View style={styles.bkActions}>
                      <Button title={t.bookingAcceptAct} small onPress={() => act(() => acceptBooking(b.id))} disabled={busy} style={styles.flex1} />
                      <Button title={t.bookingDeclineAct} small variant="outline" onPress={() => act(() => declineBooking(b.id))} disabled={busy} style={styles.flex1} />
                    </View>
                  ) : null}

                  {b.status === 'accepted' && b.pending && b.pending.requested_by === 'client' ? (
                    <View style={styles.bkActions}>
                      <Button title={t.changeConfirm} small onPress={() => act(() => confirmChange(b.id))} disabled={busy} style={styles.flex1} />
                      <Button title={t.changeReject} small variant="outline" onPress={() => act(() => rejectChange(b.id))} disabled={busy} style={styles.flex1} />
                    </View>
                  ) : null}
                  {b.status === 'accepted' && b.pending && b.pending.requested_by === 'provider' ? (
                    <Text variant="xsmall" color={Colors.textMuted} style={styles.pastNote}>{t.changeAwaiting}</Text>
                  ) : null}
                </Card>
              ))}

              {/* Той иесін тіркеу (invite link) */}
              {!isPast ? (
                <Card padded style={styles.bkCard}>
                  <Text variant="small" color={Colors.text} style={styles.inviteH}>{t.inviteCreate}</Text>
                  {inviteUrl ? (
                    <>
                      <Text variant="xsmall" color={Colors.success} style={styles.bkEmpty}>{t.inviteCreatedMsg}</Text>
                      <View style={styles.bkActions}>
                        <Button title={t.inviteCopy} small variant="outline" onPress={() => shareInvite(inviteUrl)} style={styles.flex1} />
                        <Button title={t.inviteShareWa} small onPress={() => waInvite(inviteUrl)} style={styles.flex1} />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.invGrid}>
                        <TextInput value={invPrice} onChangeText={(v) => setInvPrice(v.replace(/[^0-9]/g, ''))} placeholder={t.bookingPriceLabel} placeholderTextColor={Colors.textFaint} keyboardType="number-pad" style={[styles.input, styles.flex1]} />
                        <TextInput value={invTime} onChangeText={setInvTime} placeholder="18:00" placeholderTextColor={Colors.textFaint} maxLength={5} style={[styles.input, styles.flex1]} />
                      </View>
                      <Button title={t.inviteCreateSubmit} small loading={busy} onPress={onCreateInvite} />
                    </>
                  )}
                  {day.invites.map((inv) => (
                    <View key={inv.id} style={styles.invRow}>
                      <Text variant="xsmall" color={Colors.textMuted}>🔗 {inv.price != null ? `${inv.price} ₸` : ''} {inv.time}</Text>
                      <Pressable onPress={() => act(() => cancelInvite(inv.id))} disabled={busy}>
                        <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  halls: { marginBottom: Spacing.base },
  statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: Spacing.md, marginBottom: Spacing.md, color: Colors.textBody, fontSize: 15,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  sheetScroll: { maxHeight: 560 },
  pastNote: { marginBottom: Spacing.base },
  bkSection: { marginTop: Spacing.lg, paddingTop: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border },
  bkH: { marginBottom: Spacing.sm },
  bkEmpty: { marginBottom: Spacing.sm },
  bkCard: { marginBottom: Spacing.md, gap: 3 },
  bkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  bkActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex1: { flex: 1 },
  inviteH: { fontWeight: '700', marginBottom: Spacing.xs },
  invGrid: { flexDirection: 'row', gap: Spacing.sm },
  invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
});
