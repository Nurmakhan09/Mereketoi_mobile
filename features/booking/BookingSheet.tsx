import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { MonthGrid } from '@/features/calendar/MonthGrid';
import { CalendarHeader } from '@/features/calendar/CalendarHeader';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { fetchPublicCalendar } from '@/services/api/listings';
import { requestBooking } from '@/services/api/bookings';
import { formatPhoneInput } from '@/utils/format';
import { CalendarDay, DayStatus } from '@/types';

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

interface Props {
  visible: boolean;
  onClose: () => void;
  listingUuid: string;
  /** Venue hall names (from ListingDetail.halls); empty ⇒ not a venue. */
  halls?: { name: string }[];
  /** Best-guess category slug for the listing (preselects the slot). */
  defaultSlug?: string;
  onBooked: () => void;
}

/**
 * "Тойға қосу" request, driven by the listing's OWN availability calendar — the
 * client taps a FREE day (and a hall for venues), which is exactly the free/busy
 * calendar the listing shows (web R2/R3 parity). Then slot + phone + price/time/note.
 */
export function BookingSheet({ visible, onClose, listingUuid, halls = [], defaultSlug, onBooked }: Props) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isVenue = halls.length > 0;

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [hall, setHall] = useState(isVenue ? 1 : 0);
  const [cal, setCal] = useState<{ month: string; prev: string | null; next: string | null; days: CalendarDay[] } | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  const [date, setDate] = useState('');
  // Category is the listing's own — no picker (web R2/R3 parity).
  const slug = defaultSlug ?? '';
  const [phone, setPhone] = useState(user?.phone ? formatPhoneInput(user.phone) : '');
  const [price, setPrice] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCal = useCallback(async () => {
    setCalLoading(true);
    try {
      const d = await fetchPublicCalendar(listingUuid, month, hall);
      setCal({ month: d.month, prev: d.prev_month, next: d.next_month, days: d.days });
      if (!month) setMonth(d.month);
    } catch {
      // leave the grid empty on failure
    } finally {
      setCalLoading(false);
    }
  }, [listingUuid, month, hall]);

  useEffect(() => {
    if (visible) void loadCal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, month, hall]);

  const onDay = (d: string, status: DayStatus) => {
    if (status !== 'free') {
      Alert.alert('', `${t.statusBooked}`);
      return;
    }
    setDate(d);
  };

  const submit = async () => {
    if (!date) {
      Alert.alert('', t.bookPickFreeDay);
      return;
    }
    if (!phone.trim()) {
      Alert.alert('', t.bookingPhoneLabel);
      return;
    }
    setSubmitting(true);
    try {
      await requestBooking({
        listing_uuid: listingUuid,
        category_slug: slug,
        date,
        phone: phone.trim(),
        price: price ? parseInt(price, 10) : null,
        time: time.trim() || null,
        note: note.trim() || null,
        hall_id: isVenue ? hall : null,
      });
      onClose();
      onBooked();
      Alert.alert(t.appName, t.bookingRequested);
    } catch (e: any) {
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t.bookingAdd}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="xsmall" color={Colors.textMuted} style={styles.hint}>
          {t.bookPickFreeDay}
        </Text>

        {isVenue ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.halls}>
            {halls.map((h, i) => (
              <Pill key={i} label={h.name} selected={hall === i + 1} onPress={() => { setHall(i + 1); setDate(''); }} />
            ))}
          </ScrollView>
        ) : null}

        {cal ? (
          <>
            <CalendarHeader month={cal.month} prevMonth={cal.prev} nextMonth={cal.next} onChange={setMonth} />
            <MonthGrid month={cal.month} days={cal.days} onDayPress={onDay} />
          </>
        ) : (
          <Text variant="small" color={Colors.textMuted} center style={styles.calLoading}>
            {calLoading ? t.loading : '—'}
          </Text>
        )}

        {date ? (
          <Text variant="body" color={Colors.primary} style={styles.picked}>
            {t.bookingDate}: {date}
          </Text>
        ) : null}

        <View style={styles.form}>
          <FormField label={t.bookingPhoneLabel} value={phone} onChangeText={(v) => setPhone(formatPhoneInput(v))} keyboardType="phone-pad" required placeholder="+7 700 000 00 00" />
          <FormField label={t.bookingPriceLabel} value={price} onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" />
          <FormField label={t.bookingTimeLabel} value={time} onChangeText={(v) => setTime(maskTime(v))} keyboardType="number-pad" placeholder="18:00" maxLength={5} />
          <FormField label={t.bookingNoteLabel} value={note} onChangeText={setNote} multiline maxLength={500} />
          <Button title={t.bookSubmit} loading={submitting} onPress={submit} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 540 },
  hint: { marginBottom: Spacing.md },
  halls: { marginBottom: Spacing.md },
  calLoading: { paddingVertical: Spacing.xl },
  picked: { marginTop: Spacing.md, fontWeight: '700' },
  form: { marginTop: Spacing.base },
});
