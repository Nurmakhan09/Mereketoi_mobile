import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { updateProfile } from '@/services/api/auth';
import { ApiError } from '@/types/api';

/**
 * Enter your name — shown right after a fresh Google sign-up (OAuth users are
 * created with a NULL name; the website lets them set it later, we ask up front
 * in the app). Free-form person name (backend parity 2026-06-17: kk/ru/latin,
 * min 2 / max 120, not a unique handle).
 */
export default function SetNicknameScreen() {
  const { t } = useI18n();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const done = () => {
    if (returnTo) router.replace(returnTo as never);
    else router.replace('/');
  };

  const onSave = async () => {
    const v = nickname.trim();
    if (!v) { setError(t.nameRequired); return; }
    if (v.length < 2) { setError(t.nameInvalid); return; }
    setBusy(true);
    setError(undefined);
    try {
      const user = await updateProfile(v);
      if (token) await setSession(token, user);
      done();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.fieldErrors?.name ?? e.fieldErrors?.nickname ?? e.message);
      } else {
        setError(t.errorNetwork);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll padded edgeTop>
      <View style={styles.hero}>
        <Logo size="lg" style={styles.logo} />
        <Text variant="h2" color={Colors.text} center>{t.setNicknameTitle}</Text>
        <Text variant="small" color={Colors.textMuted} center style={styles.sub}>{t.setNicknameSub}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormField
          label={t.nameField}
          placeholder={t.namePlaceholder}
          hint={t.nameHint}
          autoCapitalize="words"
          maxLength={120}
          value={nickname}
          onChangeText={setNickname}
          error={error}
        />
        <Button title={t.save} loading={busy} onPress={onSave} style={styles.save} />
      </KeyboardAvoidingView>

      <Pressable onPress={done} hitSlop={8} style={styles.skip}>
        <Text variant="small" color={Colors.textMuted} center>{t.setNicknameLater}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  logo: { marginBottom: Spacing.base },
  sub: { marginTop: Spacing.sm, maxWidth: 320 },
  save: { marginTop: Spacing.base },
  skip: { marginTop: Spacing.xl, padding: Spacing.sm },
});
