import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { GuestGate } from '@/components/GuestGate';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import {
  fetchMyListings,
  archiveListing,
  unarchiveListing,
  deleteListing,
} from '@/services/api/listings';
import { imageUrl } from '@/utils/imageUrl';
import { PackagesSheet } from '@/features/billing/PackagesSheet';
import { WEB_URL } from '@/constants/config';
import { OwnerListing, OwnerStats } from '@/types';

/**
 * "Хабарландыруым" — the ONE listing the user owns (one-listing model). Reached from
 * the middle nav CTA + the profile menu. A single ad with its actions + a 3-card
 * stats row (Көрулер · Таңдаулылар · Брондау — web hub parity), or an empty state.
 */
export default function MyListingScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const refreshMine = useMyListingStore((s) => s.refresh);

  const [listing, setListing] = useState<OwnerListing | null>(null);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pkgOpen, setPkgOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchMyListings();
      setListing(res.items.find((i) => i.status !== 'deleted') ?? null);
      setStats(res.stats ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (status === 'authed') void load();
    }, [status, load]),
  );

  if (status !== 'authed') return <GuestGate returnTo="/my-listings" />;

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
      await refreshMine(); // keep the nav (Calendar tab + middle CTA) in sync
    } catch {
      Alert.alert(t.error, t.errorNetwork);
    }
  };

  const confirmThen = (message: string, fn: () => Promise<unknown>) =>
    Alert.alert('', message, [
      { text: t.cancel, style: 'cancel' },
      { text: t.confirm, style: 'destructive', onPress: () => void act(fn) },
    ]);

  if (loading && !listing) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.titleRow}><Logo size="sm" /></View>
        <Loading />
      </View>
    );
  }

  // Promotion / paid packages — Android only (App Store IAP policy). iOS routes
  // the user to the website where Halyk checkout lives.
  const onPromote = () => {
    if (Platform.OS === 'android') {
      setPkgOpen(true);
    } else {
      Alert.alert(t.packagesTitle, t.packagesIosWeb, [
        { text: t.cancel, style: 'cancel' },
        { text: t.openWeb, onPress: () => Linking.openURL(WEB_URL).catch(() => {}) },
      ]);
    }
  };

  return (
    <>
      <ScrollView style={styles.fill} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.base }]}>
        <View style={styles.titleRow}><Logo size="sm" /></View>
        <Text variant="h1" color={Colors.text} style={styles.heading}>{t.myListing}</Text>

        {error && !listing ? (
          <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
        ) : !listing ? (
          <EmptyState
            icon="cube-outline"
            title={t.emptyMyListings}
            actionLabel={t.newListing}
            onAction={() => router.push('/create')}
          />
        ) : (
          <>
            <StatsRow stats={stats} t={t} />
            <Row
            item={listing}
            t={t}
            onEdit={() => router.push(`/my/${listing.uuid}/edit`)}
            onCalendar={() => router.push('/calendar')}
            onView={() => listing.public_code && router.push(`/listing/${listing.uuid}`)}
            // Both go-live actions are PAID (owner decision): a DRAFT publishes via the
            // payment page; an active/expired listing renews/extends via the same page in
            // renew mode (purchase_type listing_renew). The backend chokepoint
            // (InvoiceService::createInvoice) enforces the listing status per type, so
            // neither can be charged in the wrong state.
            onPublish={() => router.push(`/my/${listing.uuid}/publish`)}
            onRenew={() => router.push(`/my/${listing.uuid}/publish?mode=renew`)}
            onArchive={() => confirmThen(t.confirmArchive, () => archiveListing(listing.uuid))}
            onUnarchive={() => void act(() => unarchiveListing(listing.uuid))}
            onDelete={() => confirmThen(t.confirmDelete, () => deleteListing(listing.uuid))}
            onPromote={onPromote}
          />
          </>
        )}
      </ScrollView>

      {listing ? (
        <PackagesSheet
          visible={pkgOpen}
          onClose={() => setPkgOpen(false)}
          listingUuid={listing.uuid}
          onPaid={() => void load()}
        />
      ) : null}
    </>
  );
}

interface RowProps {
  item: OwnerListing;
  t: ReturnType<typeof useI18n>['t'];
  onEdit: () => void;
  onCalendar: () => void;
  onView: () => void;
  onPublish: () => void;
  onRenew: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onPromote: () => void;
}

function Row({ item, t, onEdit, onCalendar, onView, onPublish, onRenew, onArchive, onUnarchive, onDelete, onPromote }: RowProps) {
  const img = imageUrl(item.main_image);
  const s = item.status;
  // Days until expiry (active listings). Drives the "X күн қалды" hint + the
  // "Созу" CTA that appears as the free period runs out (≤5 days) — not only
  // after it expires.
  const daysLeft = s === 'active' && item.expires_at
    ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000)
    : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 5;
  return (
    <Card style={styles.row} padded>
      <Pressable style={styles.rowTop} onPress={onEdit}>
        {img ? (
          <Image source={{ uri: img }} style={styles.rowImg} contentFit="cover" />
        ) : (
          <View style={[styles.rowImg, styles.rowImgPlaceholder]}>
            <Ionicons name="image-outline" size={22} color={Colors.textFaint} />
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text variant="h3" color={Colors.text} numberOfLines={2}>{item.title}</Text>
          <View style={styles.rowBadge}><StatusBadge status={s} t={t} /></View>
          {daysLeft !== null ? (
            <View style={styles.daysLeftRow}>
              <Ionicons name="time-outline" size={13} color={expiringSoon ? Colors.warning : Colors.textFaint} />
              <Text variant="xsmall" color={expiringSoon ? Colors.warning : Colors.textMuted} style={styles.daysLeftTxt}>
                {Math.max(0, daysLeft)} {t.daysShort}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.rowActions}>
        {s === 'active' && item.public_code ? <ActBtn icon="eye-outline" label={t.actView} color={Colors.primary} onPress={onView} /> : null}
        {expiringSoon ? <ActBtn icon="refresh-outline" label={t.actExtend} color={Colors.success} onPress={onRenew} /> : null}
        {s === 'active' ? <ActBtn icon="rocket-outline" label={t.actPromote} color={Colors.secondary} onPress={onPromote} /> : null}
        <ActBtn icon="create-outline" label={t.actEdit} color={Colors.primary} onPress={onEdit} />
        {s === 'draft' ? <ActBtn icon="rocket-outline" label={t.actPublish} color={Colors.success} onPress={onPublish} /> : null}
        {s === 'expired' ? <ActBtn icon="refresh-outline" label={t.actRenew} color={Colors.success} onPress={onRenew} /> : null}
        {s !== 'archived' && s !== 'blocked' ? <ActBtn icon="calendar-outline" label={t.actCalendar} color={Colors.secondary} onPress={onCalendar} /> : null}
        {s === 'archived' ? <ActBtn icon="arrow-undo-outline" label={t.actUnarchive} color={Colors.success} onPress={onUnarchive} /> : null}
        {s !== 'archived' && s !== 'blocked' ? <ActBtn icon="archive-outline" label={t.actArchive} color={Colors.warning} onPress={onArchive} /> : null}
        <ActBtn icon="trash-outline" label={t.actDelete} color={Colors.error} onPress={onDelete} />
      </View>
    </Card>
  );
}

/** 3-card metrics row (web "Менің хабарландыруым" hub parity): views · favourites · bookings. */
function StatsRow({ stats, t }: { stats: OwnerStats | null; t: ReturnType<typeof useI18n>['t'] }) {
  const cells: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t.statViews, value: stats?.views ?? 0, icon: 'eye-outline' },
    { label: t.statFavorites, value: stats?.favs ?? 0, icon: 'heart-outline' },
    { label: t.statBookings, value: stats?.pending_bookings ?? 0, icon: 'calendar-outline' },
  ];
  return (
    <View style={styles.statsRow}>
      {cells.map((c) => (
        <View key={c.label} style={styles.statCard}>
          <Ionicons name={c.icon} size={16} color={Colors.secondary} />
          <Text variant="h3" color={Colors.text} style={styles.statValue}>{c.value}</Text>
          <Text variant="xsmall" color={Colors.textMuted} numberOfLines={1}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ActBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.actBtn, { borderColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={color} />
      <Text variant="xsmall" color={color} style={styles.actLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  titleRow: { alignItems: 'center', marginBottom: Spacing.md },
  heading: { marginBottom: Spacing.base },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    gap: 2,
  },
  statValue: {},
  row: { marginBottom: Spacing.md },
  rowTop: { flexDirection: 'row' },
  rowImg: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted },
  rowImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, marginLeft: Spacing.md },
  rowBadge: { marginTop: Spacing.sm },
  daysLeftRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  daysLeftTxt: {},
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceMuted,
  },
  actBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
  },
  actLabel: { marginLeft: 4 },
});
