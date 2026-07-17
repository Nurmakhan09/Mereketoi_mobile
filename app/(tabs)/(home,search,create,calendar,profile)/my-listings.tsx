import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { GuestGate } from '@/components/GuestGate';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import {
  fetchMyListings,
  fetchMyListing,
  archiveListing,
  unarchiveListing,
  deleteListing,
} from '@/services/api/listings';
import { imageUrl } from '@/utils/imageUrl';
import { formatDate, formatPrice } from '@/utils/format';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { OwnerListing, OwnerListingDetail, OwnerStats } from '@/types';

/**
 * "Менің хабарландыруым" — the ONE listing the user owns (one-listing model), an exact
 * port of the web hub (app/Views/app/listings/hub.php). Order:
 *   preview hero → status notice → primary actions → view-public → stats →
 *   full info → secondary actions. Empty / blank-draft → a «Қосу» CTA instead.
 */
export default function MyListingScreen() {
  const { t, locale } = useI18n();
  const tabBarPad = useTabBarPadding();
  const status = useAuthStore((s) => s.status);
  const refreshMine = useMyListingStore((s) => s.refresh);

  const [listing, setListing] = useState<OwnerListing | null>(null);
  const [detail, setDetail] = useState<OwnerListingDetail | null>(null);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchMyListings(locale);
      const mine = res.items.find((i) => i.status !== 'deleted') ?? null;
      setListing(mine);
      setStats(res.stats ?? null);
      // Detail fills the full-info block + image count (contact phone, full description and
      // images are omitted from the list shape). Best-effort — the hub degrades without it.
      if (mine) {
        fetchMyListing(mine.uuid, locale).then(setDetail).catch(() => setDetail(null));
      } else {
        setDetail(null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
      <View style={[styles.fill, { paddingTop: Spacing.base }]}>
        <View style={styles.titleRow}><Logo size="sm" /></View>
        <Loading />
      </View>
    );
  }

  // A blank draft (no title AND no images) is treated like "no listing yet" — show the
  // start CTA instead of an empty preview (web hub.php $hasContent).
  const imageCount = detail?.images?.length ?? 0;
  const hasContent = !!listing && ((listing.title ?? '').trim() !== '' || imageCount > 0);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Spacing.base, paddingBottom: Spacing.xxxl + tabBarPad },
      ]}
    >
      <View style={styles.titleRow}><Logo size="sm" /></View>
      <Text variant="h1" color={Colors.text} style={styles.heading}>{t.myListing}</Text>

      {error && !listing ? (
        <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
      ) : !hasContent ? (
        <EmptyState
          icon="cube-outline"
          title={t.emptyMyListings}
          actionLabel={t.newListing}
          // A blank draft already exists → open ITS editor directly. Going through
          // /create bounced right back here (create saw the draft → my-listings →
          // «Жаңа хабарландыру» → /create → …), so publishing was impossible.
          onAction={() =>
            listing ? router.push(`/my/${listing.uuid}/edit`) : router.push('/create')
          }
        />
      ) : listing ? (
        <>
          <PreviewHero item={listing} imageCount={imageCount} t={t} />
          <StatusNotice item={listing} t={t} />
          <PrimaryActions
            item={listing}
            t={t}
            onEdit={() => router.push(`/my/${listing.uuid}/edit`)}
            onPublish={() => router.push(`/my/${listing.uuid}/publish`)}
            onRenew={() => router.push(`/my/${listing.uuid}/publish?mode=renew`)}
            onUnarchive={() => void act(() => unarchiveListing(listing.uuid))}
          />
          {listing.status === 'active' && listing.public_code ? (
            <Pressable style={styles.viewPublic} onPress={() => router.push(`/listing/${listing.uuid}`)}>
              <Ionicons name="eye-outline" size={16} color={Colors.primary} />
              <Text variant="small" color={Colors.primary} style={styles.viewPublicTxt}>{t.hubViewPublic}</Text>
            </Pressable>
          ) : null}
          <StatsRow stats={stats} t={t} />
          <InfoBlock item={listing} detail={detail} t={t} />
          <SecondaryActions
            item={listing}
            t={t}
            onCalendar={() => router.push('/calendar')}
            onArchive={() => confirmThen(t.confirmArchive, () => archiveListing(listing.uuid))}
            onDelete={() => confirmThen(t.confirmDelete, () => deleteListing(listing.uuid))}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

type T = ReturnType<typeof useI18n>['t'];

/** Preview hero (web .lh-preview): 16:9 image + status badge (top-left) + image count
 *  (bottom-right); body = name → "category · location" → price (large, primary). */
function PreviewHero({ item, imageCount, t }: { item: OwnerListing; imageCount: number; t: T }) {
  const img = imageUrl(item.main_image);
  const meta = [item.category_name, item.location_text].filter(Boolean).join(' · ');
  const price = formatPrice(item.price_amount ?? 0, item.price_type, {
    negotiable: t.priceNegotiable,
    notSpecified: '—',
    tenge: t.tenge,
  });
  return (
    <Card padded={false} style={styles.hero}>
      <View style={styles.heroImgWrap}>
        {img ? (
          <Image source={{ uri: img }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <View style={[styles.heroImg, styles.heroImgPlaceholder]}>
            <Ionicons name="image-outline" size={34} color={Colors.textFaint} />
          </View>
        )}
        <View style={styles.heroBadge}><StatusBadge status={item.status} t={t} /></View>
        {imageCount > 0 ? (
          <View style={styles.heroCount}>
            <Text variant="xsmall" color={Colors.white}>{imageCount} {t.imagesShort}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.heroBody}>
        <Text variant="h3" color={Colors.text} numberOfLines={2}>{item.title || '—'}</Text>
        {meta ? <Text variant="small" color={Colors.textMuted} style={styles.heroMeta}>{meta}</Text> : null}
        <Text variant="h2" color={Colors.primary} style={styles.heroPrice}>{price}</Text>
      </View>
    </Card>
  );
}

/** ONE status notice (web .lh-notice): blocked / draft / expired / active≤5 days. */
function StatusNotice({ item, t }: { item: OwnerListing; t: T }) {
  const s = item.status;
  const daysLeft = s === 'active' && item.expires_at
    ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  let text = '';
  let tone: 'block' | 'draft' | 'warn' | null = null;
  if (s === 'blocked') { text = t.hubBlockedHint; tone = 'block'; }
  else if (s === 'draft') { text = t.hubDraftHint; tone = 'draft'; }
  else if (s === 'expired') { text = t.hubExpiredHint; tone = 'warn'; }
  else if (daysLeft !== null && daysLeft <= 5) { text = `${Math.max(0, daysLeft)} ${t.daysShort} ${t.daysLeftWord}`; tone = 'warn'; }
  if (!tone) return null;

  const palette = tone === 'block'
    ? { bg: '#fee2e2', fg: '#b91c1c' }
    : tone === 'draft'
      ? { bg: '#fef9c3', fg: '#854d0e' }
      : { bg: '#fff7ed', fg: '#9a3412' };
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Text variant="small" color={palette.fg}>{text}</Text>
    </View>
  );
}

/** Primary actions (web .lh-actions): Edit always + exactly ONE go-live action
 *  (draft→Publish · active|expired→Созу · archived→Unarchive). blocked/pending → only Edit. */
function PrimaryActions({
  item, t, onEdit, onPublish, onRenew, onUnarchive,
}: {
  item: OwnerListing;
  t: T;
  onEdit: () => void;
  onPublish: () => void;
  onRenew: () => void;
  onUnarchive: () => void;
}) {
  const s = item.status;
  return (
    <View style={styles.primaryRow}>
      <Button title={t.actEdit} variant="outline" icon="create-outline" onPress={onEdit} style={styles.flex1} />
      {s === 'draft' ? (
        <Button title={t.actPublish} icon="rocket-outline" onPress={onPublish} style={styles.flex1} />
      ) : s === 'active' || s === 'expired' ? (
        <Button title={t.actExtend} icon="refresh-outline" onPress={onRenew} style={styles.flex1} />
      ) : s === 'archived' ? (
        <Button title={t.actUnarchive} icon="arrow-undo-outline" onPress={onUnarchive} style={styles.flex1} />
      ) : null}
    </View>
  );
}

/** 3-card metrics row (web .lh-stats): views · favourites · bookings. */
function StatsRow({ stats, t }: { stats: OwnerStats | null; t: T }) {
  const cells: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t.statViews, value: stats?.views ?? 0, icon: 'eye-outline' },
    { label: t.statFavorites, value: stats?.favs ?? 0, icon: 'heart-outline' },
    { label: t.statBookings, value: stats?.pending_bookings ?? 0, icon: 'calendar-outline' },
  ];
  return (
    <>
      <Text variant="small" color={Colors.textMuted} style={styles.sectionTitle}>{t.hubStatsTitle}</Text>
      <View style={styles.statsRow}>
        {cells.map((c) => (
          <View key={c.label} style={styles.statCard}>
            <Ionicons name={c.icon} size={16} color={Colors.secondary} />
            <Text variant="h3" color={Colors.text}>{c.value}</Text>
            <Text variant="xsmall" color={Colors.textMuted} numberOfLines={1}>{c.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

/** Full-info block — web .lh-info (label/value rows). */
function InfoBlock({ item, detail, t }: { item: OwnerListing; detail: OwnerListingDetail | null; t: T }) {
  const price = formatPrice(item.price_amount ?? 0, item.price_type, {
    negotiable: t.priceNegotiable,
    notSpecified: '—',
    tenge: t.tenge,
  });
  const rows: { label: string; value: string }[] = [
    { label: t.fieldTitle, value: item.title || '—' },
    { label: t.fieldCategory, value: item.category_name || '—' },
    { label: t.fieldRegion, value: item.location_text || '—' },
    { label: t.fieldPrice, value: price },
    { label: t.fieldPhone, value: detail?.contact_phone || '—' },
  ];
  if (item.short_description) rows.push({ label: t.fieldShortDesc, value: item.short_description });
  if (detail?.full_description) rows.push({ label: t.fieldDescription, value: detail.full_description });
  if (item.published_at) rows.push({ label: t.listingPublished, value: formatDate(item.published_at) });
  if (item.expires_at) rows.push({ label: t.listingExpires, value: formatDate(item.expires_at) });

  return (
    <>
      <Text variant="small" color={Colors.textMuted} style={styles.sectionTitle}>{t.hubInfoTitle}</Text>
      <Card padded={false} style={styles.infoCard}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.infoRow, i > 0 && styles.infoDivider]}>
            <Text variant="xsmall" color={Colors.textMuted} style={styles.infoLabel}>{r.label}</Text>
            <Text variant="small" color={Colors.text} style={styles.infoValue}>{r.value}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

/** Secondary actions (web .lh-secondary): Calendar (status≠draft) · Archive
 *  (active|draft|expired) · Delete (always). */
function SecondaryActions({
  item, t, onCalendar, onArchive, onDelete,
}: {
  item: OwnerListing;
  t: T;
  onCalendar: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const s = item.status;
  return (
    <View style={styles.secondaryRow}>
      {s !== 'draft' ? <SecBtn icon="calendar-outline" label={t.actCalendar} color={Colors.text} onPress={onCalendar} /> : null}
      {s === 'active' || s === 'draft' || s === 'expired' ? (
        <SecBtn icon="archive-outline" label={t.actArchive} color={Colors.text} onPress={onArchive} />
      ) : null}
      <SecBtn icon="trash-outline" label={t.actDelete} color={Colors.error} onPress={onDelete} />
    </View>
  );
}

function SecBtn({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secBtn} onPress={onPress}>
      <Ionicons name={icon} size={17} color={color} />
      <Text variant="small" color={color} style={styles.secLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  titleRow: { alignItems: 'center', marginBottom: Spacing.md },
  heading: { marginBottom: Spacing.base },

  // Preview hero
  hero: { marginBottom: Spacing.md, overflow: 'hidden' },
  heroImgWrap: { position: 'relative', width: '100%', aspectRatio: 16 / 9, backgroundColor: Colors.surfaceMuted },
  heroImg: { width: '100%', height: '100%' },
  heroImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: 12, left: 12 },
  heroCount: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: Radius.pill,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  heroBody: { padding: Spacing.base },
  heroMeta: { marginTop: 4 },
  heroPrice: { marginTop: Spacing.sm },

  // Status notice
  notice: { borderRadius: Radius.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, marginBottom: Spacing.md },

  // Primary actions
  primaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  flex1: { flex: 1 },

  // View public
  viewPublic: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: Spacing.md, paddingVertical: 2 },
  viewPublicTxt: { fontWeight: '600' },

  // Sections
  sectionTitle: { fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: Spacing.sm, marginBottom: Spacing.sm },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, gap: 2,
  },

  // Full info
  infoCard: { marginBottom: Spacing.sm },
  infoRow: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base },
  infoDivider: { borderTopWidth: 1, borderTopColor: Colors.surfaceMuted },
  infoLabel: { width: 104 },
  infoValue: { flex: 1 },

  // Secondary actions
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  secBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface,
  },
  secLabel: { fontWeight: '600' },
});
