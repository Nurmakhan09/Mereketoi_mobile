import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { updateProfile, changePassword } from '@/services/api/auth';
import { formatPhone } from '@/utils/format';
import { ApiError } from '@/types/api';

export default function SettingsScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);

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

  return (
    <Screen scroll padded>
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
          <Button title={t.changePassword} variant="outline" icon="lock-closed-outline" onPress={() => setEditingPw(true)} />
        )}
      </Card>
    </Screen>
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
  row: { marginBottom: Spacing.md },
  btn: { marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex1: { flex: 1 },
});
