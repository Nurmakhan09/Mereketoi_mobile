import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { GuestGate } from '@/components/GuestGate';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchMyListings,
  archiveListing,
  unarchiveListing,
  deleteListing,
  publishListing,
} from '@/services/api/listings';
import { imageUrl } from '@/utils/imageUrl';
import { OwnerListing, OwnerStats, ListingStatus } from '@/types';

const TABS: ListingStatus[] = ['active', 'draft', 'expired', 'archived', 'blocked'];

/** My Listings — bottom-nav tab (replaces the Notifications tab for logged-in users). */
export default function MyListingsTab() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);

  const [items, setItems] = useState<OwnerListing[]>([]);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [tab, setTab] = useState<ListingStatus>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchMyListings();
      setItems(res.items);
      setStats(res.stats);
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
    } catch {
      Alert.alert(t.error, t.errorNetwork);
    }
  };

  const confirmThen = (message: string, fn: () => Promise<unknown>) =>
    Alert.alert('', message, [
      { text: t.cancel, style: 'cancel' },
      { text: t.confirm, style: 'destructive', onPress: () => void act(fn) },
    ]);

  const tabLabels: Record<ListingStatus, string> = {
    active: t.tabActive,
    draft: t.tabDraft,
    expired: t.tabExpired,
    archived: t.tabArchived,
    blocked: t.tabBlocked,
    deleted: t.actDelete,
  };

  const filtered = items.filter((i) => i.status === tab);
  // One-listing model: a user has at most one non-deleted listing. If one exists,
  // the "+ New" CTA reopens its editor (the backend rejects a 2nd create).
  const existing = items.find((i) => i.status !== 'deleted');
  const onPrimary = () => router.push(existing ? `/my/${existing.uuid}/edit` : '/create');

  const header = (
    <View style={{ paddingTop: insets.top + Spacing.base }}>
      <View style={styles.titleRow}>
        <Logo size="sm" />
      </View>
      <Text variant="h1" color={Colors.text} style={styles.heading}>
        {t.myListings}
      </Text>
      <Button title={existing ? t.menuMyListings : t.newListing} icon={existing ? 'create-outline' : 'add'} onPress={onPrimary} style={styles.newBtn} />

      {stats ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
          <StatCard label={t.statTotal} value={stats.total} />
          <StatCard label={t.statActive} value={stats.active} />
          <StatCard label={t.statDraft} value={stats.draft} />
          <StatCard label={t.statExpired} value={stats.expired} />
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((s) => (
          <Pill key={s} label={tabLabels[s]} selected={tab === s} onPress={() => setTab(s)} />
        ))}
      </ScrollView>
    </View>
  );

  if (loading && !items.length) {
    return (
      <View style={styles.fill}>
        {header}
        <Loading />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.fill}
      data={filtered}
      keyExtractor={(it) => it.uuid}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <Row
          item={item}
          t={t}
          onEdit={() => router.push(`/my/${item.uuid}/edit`)}
          onCalendar={() => router.push(`/my/${item.uuid}/calendar`)}
          onView={() => item.public_code && router.push(`/listing/${item.uuid}`)}
          onPublish={() => void act(() => publishListing(item.uuid))}
          onArchive={() => confirmThen(t.confirmArchive, () => archiveListing(item.uuid))}
          onUnarchive={() => void act(() => unarchiveListing(item.uuid))}
          onDelete={() => confirmThen(t.confirmDelete, () => deleteListing(item.uuid))}
        />
      )}
      ListEmptyComponent={
        error ? (
          <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
        ) : (
          <EmptyState
            icon="cube-outline"
            title={t.emptyMyListings}
            actionLabel={t.newListing}
            onAction={() => router.push('/create')}
          />
        )
      }
    />
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.statCard} padded>
      <Text variant="h2" color={Colors.primary}>
        {value}
      </Text>
      <Text variant="xsmall" color={Colors.textMuted}>
        {label}
      </Text>
    </Card>
  );
}

interface RowProps {
  item: OwnerListing;
  t: ReturnType<typeof useI18n>['t'];
  onEdit: () => void;
  onCalendar: () => void;
  onView: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

function Row({ item, t, onEdit, onCalendar, onView, onPublish, onArchive, onUnarchive, onDelete }: RowProps) {
  const img = imageUrl(item.main_image);
  const s = item.status;
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
          <Text variant="h3" color={Colors.text} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.rowBadge}>
            <StatusBadge status={s} t={t} />
          </View>
        </View>
      </Pressable>

      <View style={styles.rowActions}>
        {s === 'active' && item.public_code ? <ActBtn icon="eye-outline" label={t.actView} color={Colors.primary} onPress={onView} /> : null}
        <ActBtn icon="create-outline" label={t.actEdit} color={Colors.primary} onPress={onEdit} />
        {s === 'draft' ? <ActBtn icon="rocket-outline" label={t.actPublish} color={Colors.success} onPress={onPublish} /> : null}
        {s === 'expired' ? <ActBtn icon="refresh-outline" label={t.actRenew} color={Colors.success} onPress={onPublish} /> : null}
        {s !== 'archived' && s !== 'blocked' ? <ActBtn icon="calendar-outline" label={t.actCalendar} color={Colors.secondary} onPress={onCalendar} /> : null}
        {s === 'archived' ? <ActBtn icon="arrow-undo-outline" label={t.actUnarchive} color={Colors.success} onPress={onUnarchive} /> : null}
        {s !== 'archived' && s !== 'blocked' ? <ActBtn icon="archive-outline" label={t.actArchive} color={Colors.warning} onPress={onArchive} /> : null}
        <ActBtn icon="trash-outline" label={t.actDelete} color={Colors.error} onPress={onDelete} />
      </View>
    </Card>
  );
}

/** Action chip — colored icon + label on a soft tinted background. */
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
      <Text variant="xsmall" color={color} style={styles.actLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl },
  titleRow: { alignItems: 'center', marginBottom: Spacing.md },
  heading: { marginBottom: Spacing.base },
  newBtn: { marginBottom: Spacing.base },
  statsRow: { marginBottom: Spacing.base },
  statCard: { width: 96, marginRight: Spacing.sm, alignItems: 'flex-start' },
  tabs: { marginBottom: Spacing.base },
  row: { marginBottom: Spacing.md },
  rowTop: { flexDirection: 'row' },
  rowImg: { width: 64, height: 64, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted },
  rowImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, marginLeft: Spacing.md },
  rowBadge: { marginTop: Spacing.sm },
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
