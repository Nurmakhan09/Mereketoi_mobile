import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, Appearance } from 'react-native';
import { router, useNavigation } from 'expo-router';
import * as Updates from 'expo-updates';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Radius, Spacing, THEME_PREF_KEY, ThemePref, bootThemePref } from '@/constants/theme';
import { setItem, deleteItem } from '@/services/storage';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { updateProfile, changePassword } from '@/services/api/auth';
import { formatPhone } from '@/utils/format';
import { ApiError } from '@/types/api';

export default function SettingsScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const clearFav = useFavoritesStore((s) => s.clear);
  const [deleting, setDeleting] = useState(false);

  // Name section: read-only until "Edit" is pressed.
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  // Password section: collapsed until "Change password" is pressed.
  const [editingPw, setEditingPw] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: t.settingsTitle });
  }, [navigation, t.settingsTitle]);

  const onSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const updated = await updateProfile(name.trim());
      if (token) await setSession(token, updated);
      setEditingName(false);
      Alert.alert(t.appName, t.nameSaved);
    } catch (e) {
      Alert.alert(t.error, e instanceof ApiError ? e.message : t.errorNetwork);
    } finally {
      setSavingName(false);
    }
  };

  const cancelName = () => {
    setName(user?.name ?? '');
    setEditingName(false);
  };

  const onChangePassword = async () => {
    setSavingPw(true);
    setPwErrors({});
    try {
      await changePassword({ current_password: current, new_password: next, confirm_password: confirm });
      setCurrent('');
      setNext('');
      setConfirm('');
      setEditingPw(false);
      Alert.alert(t.appName, t.passwordChanged);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) setPwErrors(e.fieldErrors);
      Alert.alert(t.error, e instanceof ApiError ? e.message : t.errorNetwork);
    } finally {
      setSavingPw(false);
    }
  };

  const cancelPw = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setPwErrors({});
    setEditingPw(false);
  };

  // Permanent account deletion (store requirement). Two taps: button → confirm dialog.
  const onDeleteAccount = () => {
    Alert.alert(t.deleteAccount, t.deleteAccountConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteAccountAction,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            clearFav();
            router.replace('/');
            Alert.alert(t.appName, t.accountDeleted);
          } catch (e) {
            Alert.alert(t.error, e instanceof ApiError ? e.message : t.errorNetwork);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll padded>
      {/* Appearance / theme — «По умолчанию» (system) is the default. Applying
          needs a JS reload so every static StyleSheet re-reads the palette. */}
      <Text variant="h3" color={Colors.text} style={styles.section}>
        {t.themeTitle}
      </Text>
      <Card padded>
        <ThemePicker t={t} />
      </Card>

      {/* Account */}
      <Text variant="h3" color={Colors.text} style={styles.section}>
        {t.account}
      </Text>
      <Card padded>
        {editingName ? (
          <>
            <FormField label={t.name} value={name} onChangeText={setName} maxLength={120} autoFocus />
            <View style={styles.actionRow}>
              <Button title={t.cancel} variant="outline" onPress={cancelName} style={styles.flex1} />
              <Button title={t.save} loading={savingName} onPress={onSaveName} style={styles.flex1} />
            </View>
          </>
        ) : (
          <>
            <Row label={t.name} value={user?.name ?? '—'} />
            {user?.email ? <Row label={t.email} value={user.email} /> : null}
            {user?.phone ? <Row label={t.phone} value={formatPhone(user.phone)} /> : null}
            <Button title={t.editName} variant="outline" icon="create-outline" onPress={() => setEditingName(true)} style={styles.btn} />
          </>
        )}
      </Card>

      {/* Password */}
      <Text variant="h3" color={Colors.text} style={styles.section}>
        {t.changePassword}
      </Text>
      <Card padded>
        {editingPw ? (
          <>
            <FormField label={t.currentPassword} secure value={current} onChangeText={setCurrent} error={pwErrors.current_password} autoFocus />
            <FormField label={t.newPassword} secure value={next} onChangeText={setNext} error={pwErrors.new_password} />
            <FormField label={t.confirmNewPassword} secure value={confirm} onChangeText={setConfirm} error={pwErrors.confirm_password} />
            <View style={styles.actionRow}>
              <Button title={t.cancel} variant="outline" onPress={cancelPw} style={styles.flex1} />
              <Button title={t.save} loading={savingPw} onPress={onChangePassword} style={styles.flex1} />
            </View>
          </>
        ) : (
          <>
            <Button title={t.changePassword} variant="outline" icon="lock-closed-outline" onPress={() => setEditingPw(true)} />
            {/* Forgot the current password? Reset it by email (owner request: keep it in Settings). */}
            <Pressable onPress={() => router.push('/forgot-password')} hitSlop={6} style={styles.forgotLink}>
              <Text variant="small" color={Colors.primary}>{t.forgotLink}</Text>
            </Pressable>
          </>
        )}
      </Card>

      {/* Danger zone — permanent account deletion (App Store 5.1.1 v / Google Play). */}
      <Text variant="h3" color={Colors.error} style={styles.section}>
        {t.dangerZone}
      </Text>
      <Card padded>
        <Text variant="small" color={Colors.textMuted} style={styles.dangerHint}>
          {t.deleteAccountHint}
        </Text>
        <Button
          title={t.deleteAccount}
          variant="danger"
          icon="trash-outline"
          loading={deleting}
          onPress={onDeleteAccount}
        />
      </Card>
    </Screen>
  );
}

function ThemePicker({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  const [pref, setPref] = useState<ThemePref>(bootThemePref);
  const [switching, setSwitching] = useState(false);

  const options: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.themeSystem },
    { value: 'light', label: t.themeLight },
    { value: 'dark', label: t.themeDark },
  ];

  const onPick = async (value: ThemePref) => {
    if (value === pref || switching) return;
    setPref(value);
    setSwitching(true);
    try {
      if (value === 'system') {
        await deleteItem(THEME_PREF_KEY);
        Appearance.setColorScheme(null); // hand native chrome back to the OS
      } else {
        await setItem(THEME_PREF_KEY, value);
      }
      // Re-launch the JS bundle so the whole app repaints in the new theme.
      await Updates.reloadAsync();
    } catch {
      // Expo Go / dev: reload API unavailable — applies on the next launch.
      setSwitching(false);
      Alert.alert(t.appName, t.themeRestartHint);
    }
  };

  return (
    <>
      <View style={styles.themeRow}>
        {options.map((o) => {
          const active = pref === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => void onPick(o.value)}
              style={[styles.themeOpt, active && styles.themeOptActive]}
            >
              <Text variant="small" color={active ? Colors.white : Colors.textBody} center>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="xsmall" color={Colors.textMuted} style={styles.themeHint}>
        {t.themeHint}
      </Text>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="xsmall" color={Colors.textMuted}>
        {label}
      </Text>
      <Text variant="body" color={Colors.text}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeOpt: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  themeHint: { marginTop: Spacing.md },
  forgotLink: { alignSelf: 'center', marginTop: Spacing.md, paddingVertical: 4 },
  dangerHint: { marginBottom: Spacing.md },
  row: { marginBottom: Spacing.md },
  btn: { marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex1: { flex: 1 },
});
