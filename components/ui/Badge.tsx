import { View, StyleSheet } from 'react-native';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';
import { ListingStatus, TodayStatus } from '@/types';
import { Strings } from '@/locales';

/** Small colored pill used for status / availability. */
export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[Typography.xsmall, styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const STATUS_COLORS: Record<ListingStatus, { color: string; bg: string }> = {
  active: { color: '#047857', bg: '#D1FAE5' },
  draft: { color: '#92600A', bg: '#FEF3C7' },
  expired: { color: '#6B7280', bg: '#F3F4F6' },
  archived: { color: '#6B7280', bg: '#F3F4F6' },
  blocked: { color: '#B91C1C', bg: '#FEE2E2' },
  deleted: { color: '#6B7280', bg: '#F3F4F6' },
};

export function StatusBadge({ status, t }: { status?: ListingStatus | null; t: Strings }) {
  const safe: ListingStatus = status && STATUS_COLORS[status] ? status : 'draft';
  const c = STATUS_COLORS[safe];
  const label: Record<ListingStatus, string> = {
    active: t.tabActive,
    draft: t.tabDraft,
    expired: t.tabExpired,
    archived: t.tabArchived,
    blocked: t.tabBlocked,
    deleted: t.actDelete,
  };
  return <Badge label={label[safe]} color={c.color} bg={c.bg} />;
}

const AVAIL_COLORS: Record<TodayStatus, { color: string; bg: string }> = {
  free: { color: '#047857', bg: '#D1FAE5' },
  booked: { color: '#B91C1C', bg: '#FEE2E2' },
  unavailable: { color: '#6B7280', bg: '#F3F4F6' },
};

export function AvailabilityBadge({ status, t }: { status?: TodayStatus | null; t: Strings }) {
  // Guard against a missing/unknown status (e.g. a payload without today_status) —
  // fall back to "free" so we never crash on AVAIL_COLORS[undefined].
  const safe: TodayStatus = status && AVAIL_COLORS[status] ? status : 'free';
  const c = AVAIL_COLORS[safe];
  const label: Record<TodayStatus, string> = {
    free: t.statusFree,
    booked: t.statusBooked,
    unavailable: t.statusUnavailable,
  };
  return <Badge label={label[safe]} color={c.color} bg={c.bg} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.xs,
    alignSelf: 'flex-start',
  },
  text: { fontFamily: Typography.button.fontFamily },
});
