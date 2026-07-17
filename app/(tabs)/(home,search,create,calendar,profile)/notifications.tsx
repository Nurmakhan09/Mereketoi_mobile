import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Sheet } from '@/components/ui/Sheet';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchReminders,
  createReminder,
  toggleReminder,
  deleteReminder,
} from '@/services/api/notifications';
import { formatDate } from '@/utils/format';
import { navigateFromActionUrl } from '@/utils/notificationLink';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { AppNotification, Reminder } from '@/types';

type Tab = 'inbox' | 'reminders';

/** Inbox + Reminders in one screen. A "+" adds a reminder (notifies at 9:00 on its date). */
export default function NotificationsScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const tabBarPad = useTabBarPadding();
  const [tab, setTab] = useState<Tab>('inbox');

  // inbox
  const [items, setItems] = useState<AppNotification[]>([]);
  // reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // add-reminder sheet
  const [addOpen, setAddOpen] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDate, setRDate] = useState('');
  const [rNote, setRNote] = useState('');
  const [rErrors, setRErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [inbox, rem] = await Promise.all([fetchNotifications({ limit: 50 }), fetchReminders()]);
      setItems(inbox.items);
      setReminders(rem.items);
      navigation.setOptions({ title: t.notificationsTitle });
      // Entering the inbox marks everything read (web parity: NotificationsController::index).
      // The per-row unread highlight stays for THIS view (you still see what was new); the
      // unread badge here and on the profile bell clears right away.
      if (inbox.unread > 0) markAllNotificationsRead().catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigation, t.notificationsTitle]);

  useEffect(() => {
    void load();
  }, [load]);

  const onItem = async (n: AppNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)));
      markNotificationRead(n.id).catch(() => {});
    }
    // Deep-link via the shared mapper (same logic as a push-notification tap).
    navigateFromActionUrl(n.action_url);
  };

  const onAddReminder = async () => {
    setSaving(true);
    setRErrors({});
    try {
      await createReminder({ title: rTitle.trim(), remind_at: rDate.trim(), note: rNote.trim() || undefined });
      setAddOpen(false);
      setRTitle('');
      setRDate('');
      setRNote('');
      await load();
      setTab('reminders');
    } catch (e: any) {
      if (e?.fieldErrors) setRErrors(e.fieldErrors);
      else Alert.alert(t.error, t.errorNetwork);
    } finally {
      setSaving(false);
    }
  };

  const onToggleReminder = (r: Reminder) => {
    setReminders((prev) => prev.map((i) => (i.id === r.id ? { ...i, is_done: !i.is_done } : i)));
    toggleReminder(r.id).catch(() => void load());
  };

  const onDeleteReminder = (r: Reminder) =>
    Alert.alert('', t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => {
          setReminders((prev) => prev.filter((i) => i.id !== r.id));
          deleteReminder(r.id).catch(() => void load());
        },
      },
    ]);

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <View style={styles.segment}>
        {(['inbox', 'reminders'] as Tab[]).map((tb) => (
          <Pressable key={tb} style={[styles.seg, tab === tb && styles.segActive]} onPress={() => setTab(tb)}>
            <Text variant="button" color={tab === tb ? Colors.white : Colors.textMuted}>
              {tb === 'inbox' ? t.notificationsTitle : t.remindersTitle}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'reminders' ? (
        <Button title={t.addReminder} icon="add" onPress={() => setAddOpen(true)} style={styles.addBtn} />
      ) : null}
    </View>
  );

  if (loading) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <View style={styles.fill}>
      {tab === 'inbox' ? (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + tabBarPad }]}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.is_read && styles.rowUnread]}
              onPress={() => onItem(item)}
            >
              <View style={styles.rowBody}>
                <Text variant="small" color={Colors.text}>
                  {item.title}
                </Text>
                {item.body ? (
                  <Text variant="xsmall" color={Colors.textMuted} numberOfLines={2} style={styles.body}>
                    {item.body}
                  </Text>
                ) : null}
                <Text variant="xsmall" color={Colors.textFaint} style={styles.time}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState icon="notifications-outline" title={t.emptyNotifications} />}
        />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(it) => String(it.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + tabBarPad }]}
          renderItem={({ item }) => (
            <Card style={styles.remRow} padded>
              <Pressable onPress={() => onToggleReminder(item)} hitSlop={6}>
                <Ionicons
                  name={item.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={item.is_done ? Colors.success : Colors.textFaint}
                />
              </Pressable>
              <View style={styles.remBody}>
                <Text
                  variant="body"
                  color={item.is_done ? Colors.textFaint : Colors.text}
                  style={item.is_done ? styles.strike : undefined}
                >
                  {item.title}
                </Text>
                <Text variant="xsmall" color={Colors.textMuted}>
                  {formatDate(item.remind_at)}
                  {item.note ? ` · ${item.note}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => onDeleteReminder(item)} hitSlop={6}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </Pressable>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="alarm-outline" title={t.emptyReminders} />}
        />
      )}

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title={t.addReminder}>
        <FormField label={t.reminderTitle} value={rTitle} onChangeText={setRTitle} required error={rErrors.title} />
        <FormField
          label={t.reminderDate}
          value={rDate}
          onChangeText={setRDate}
          placeholder="2026-07-01"
          required
          error={rErrors.remind_at}
        />
        <FormField label={t.reminderNote} value={rNote} onChangeText={setRNote} multiline />
        <Text variant="xsmall" color={Colors.textMuted} style={styles.remHint}>
          {t.reminderNotifyHint}
        </Text>
        <Button title={t.save} loading={saving} onPress={onAddReminder} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  headerWrap: { padding: Spacing.base },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: 4,
  },
  seg: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.sm, alignItems: 'center' },
  segActive: { backgroundColor: Colors.primary },
  addBtn: { marginTop: Spacing.md },
  list: { paddingBottom: Spacing.xxxl },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.surface,
  },
  // Unread row: navy border + navy-soft fill, no dot (design prompt §15).
  rowUnread: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  rowBody: { flex: 1 },
  body: { marginTop: 2 },
  time: { marginTop: Spacing.xs },
  remRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.base, marginBottom: Spacing.md, gap: Spacing.md },
  remBody: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
  remHint: { marginBottom: Spacing.md },
});
