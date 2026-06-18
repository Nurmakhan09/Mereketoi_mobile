import { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { login as apiLogin, register as apiRegister, fetchMe } from '@/services/api/auth';
import { runBrowserAuth } from '@/features/auth/browserAuth';
import { setItem, StorageKeys } from '@/services/storage';
import { ApiError } from '@/types/api';

type Mode = 'login' | 'register';

/** Auth screen — native login/register form (works in Expo Go) + Google via browser. */
export default function AuthScreen() {
  const { t } = useI18n();
  const setSession = useAuthStore((s) => s.setSession);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [mode, setMode] = useState<Mode>('login');
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'google' | null>(null);

  // After a SUCCESSFUL auth → go to the intended destination.
  const afterAuth = () => {
    if (returnTo) router.replace(returnTo as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // The ✕ (cancel) must NEVER use returnTo: some gated returnTo targets (e.g. the
  // "+" Create tab) bounce guests straight back to /auth, so honoring returnTo on
  // close trapped the user on this screen. Just dismiss to a safe public screen.
  const onClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const id = loginVal.trim();
    if (!id) {
      e.login = t.loginRequired;
    } else {
      // Accept an email OR a KZ phone (≥10 digits). On register we require a valid
      // shape so we never send garbage to the server.
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      const isPhone = id.replace(/\D/g, '').length >= 10;
      if (mode === 'register' && !isEmail && !isPhone) e.login = t.loginInvalid;
    }
    if (!password) e.password = t.passwordRequired;
    else if (mode === 'register' && password.length < 8) e.password = t.passwordTooShort;
    if (mode === 'register') {
      const nm = name.trim();
      // Free-form person name (backend parity 2026-06-17: kk/ru/latin, not a
      // unique handle; min 2 / max 120). Cyrillic names like "Нұрлан" are valid.
      if (!nm) e.name = t.nameRequired;
      else if (nm.length < 2) e.name = t.nameInvalid;
      if (password !== confirm) e.confirm = t.passwordMismatch;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setBusy('form');
    setErrors({});
    try {
      const res =
        mode === 'login'
          ? await apiLogin({ login: loginVal.trim(), password })
          : await apiRegister({ login: loginVal.trim(), password, name: name.trim() });
      await setSession(res.token, res.user);
      afterAuth();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors(err.fieldErrors);
        Alert.alert(t.error, err.message);
      } else {
        Alert.alert(t.error, t.errorNetwork);
      }
    } finally {
      setBusy(null);
    }
  };

  const onGoogle = async () => {
    setBusy('google');
    try {
      const res = await runBrowserAuth('google');
      if (res.status === 'cancel') return;
      if (res.status !== 'success' || !res.token) {
        Alert.alert(t.error, t.authFailed);
        return;
      }
      await setItem(StorageKeys.token, res.token);
      const user = await fetchMe();
      await setSession(res.token, user);
      // Fresh Google sign-ups have no name yet (OAuth creates it as NULL) —
      // ask them to enter one before continuing (website lets them set it later).
      if (!user.name?.trim()) {
        router.replace({ pathname: '/set-nickname', params: returnTo ? { returnTo } : {} });
        return;
      }
      afterAuth();
    } catch {
      Alert.alert(t.error, t.authFailed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll padded edgeTop>
      <View style={styles.closeRow}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Logo size="lg" style={styles.heroLogo} />
        <Text variant="body" center color={Colors.textMuted}>
          {t.authTitle}
        </Text>
      </View>

      {/* Segmented switch */}
      <View style={styles.segment}>
        {(['login', 'register'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.seg, mode === m && styles.segActive]}
            onPress={() => {
              setMode(m);
              setErrors({});
            }}
          >
            <Text variant="button" color={mode === m ? Colors.white : Colors.textMuted}>
              {m === 'login' ? t.loginTab : t.registerTab}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormField
          label={t.loginField}
          value={loginVal}
          onChangeText={setLoginVal}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.login}
        />
        {mode === 'register' ? (
          <FormField
            label={t.nameField}
            placeholder={t.namePlaceholder}
            hint={t.nameHint}
            autoCapitalize="words"
            maxLength={120}
            value={name}
            onChangeText={setName}
            error={errors.name}
          />
        ) : null}
        <FormField
          label={t.passwordField}
          placeholder={mode === 'register' ? t.passwordNewPlaceholder : t.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
          secure
          error={errors.password}
        />
        {mode === 'register' ? (
          <FormField
            label={t.confirmPasswordField}
            value={confirm}
            onChangeText={setConfirm}
            secure
            error={errors.confirm}
          />
        ) : null}

        <Button
          title={mode === 'login' ? t.loginAction : t.registerAction}
          loading={busy === 'form'}
          disabled={busy !== null}
          onPress={onSubmit}
          style={styles.submit}
        />
      </KeyboardAvoidingView>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text variant="xsmall" color={Colors.textFaint} style={styles.orText}>
          {t.orContinue}
        </Text>
        <View style={styles.line} />
      </View>

      <Button
        title={t.signInGoogle}
        variant="outline"
        icon="logo-google"
        loading={busy === 'google'}
        disabled={busy !== null}
        onPress={onGoogle}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end' },
  close: { padding: Spacing.xs },
  hero: { alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  heroLogo: { marginBottom: Spacing.sm },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  seg: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segActive: { backgroundColor: Colors.primary },
  submit: { marginTop: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md },
});
