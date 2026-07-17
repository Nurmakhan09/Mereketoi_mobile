import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { login as apiLogin, register as apiRegister, fetchMe, oauthSignIn } from '@/services/api/auth';
import { runBrowserAuth } from '@/features/auth/browserAuth';
import { setItem, StorageKeys } from '@/services/storage';
import { formatPhoneInput } from '@/utils/format';
import { ApiError } from '@/types/api';

type Mode = 'login' | 'register';
/** Register wizard (owner decision 2026-07-17 evening — NO email code step):
 *  1 = email (or phone) → «Келесі» · 2 = name + password → «Тіркелу». */
type RegStep = 1 | 2;

/** Auth screen — native login/register form (works in Expo Go) + Google via browser. */
export default function AuthScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [mode, setMode] = useState<Mode>('login');
  const [regStep, setRegStep] = useState<RegStep>(1);
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'google' | 'apple' | null>(null);

  const trimmedLogin = loginVal.trim();
  const isEmailLogin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedLogin);
  const loginLooksPhone = loginVal.startsWith('+7');

  // Mirrors the website's combined login field (app.js initLoginField): typing a
  // digit or '+' switches the field to PHONE mode instantly (digits → «+7 707 …»);
  // any letter keeps free-text email mode.
  const onLoginChange = (v: string) => {
    const trimmed = v.trim();
    const digits = v.replace(/\D/g, '');
    const looksPhone = trimmed !== '' && /^[\s+\d(]/.test(trimmed) && !/[A-Za-z@]/.test(v);
    if (!looksPhone) {
      setLoginVal(v);
      return;
    }
    // Deleting down to the bare «+7» prefix clears the field (backspace works).
    if (v.length < loginVal.length && digits.length <= 1) {
      setLoginVal('');
      return;
    }
    setLoginVal(formatPhoneInput(v));
  };

  // Sign in with Apple exists on iOS 13+ only. App Store guideline 4.8 requires it
  // wherever we offer a third-party login (we offer Google), so it must be shown.
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

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

  const switchMode = (m: Mode) => {
    setMode(m);
    setRegStep(1);
    setErrors({});
  };

  const showApiError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      Alert.alert(t.error, err.message);
    } else {
      Alert.alert(t.error, t.errorNetwork);
    }
  };

  // ── Register wizard steps ──────────────────────────────────────────────────

  // Step 2 — name + password, then create the account.
  const onRegister = async () => {
    const e: Record<string, string> = {};
    const nm = name.trim();
    // Free-form person name (backend parity 2026-06-17: kk/ru/latin, min 2 / max 120).
    if (!nm) e.name = t.nameRequired;
    else if (nm.length < 2) e.name = t.nameInvalid;
    if (!password) e.password = t.passwordRequired;
    else if (password.length < 8) e.password = t.passwordTooShort;
    if (password !== confirm) e.confirm = t.passwordMismatch;
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setBusy('form');
    setErrors({});
    try {
      const res = await apiRegister({ login: trimmedLogin, password, name: nm });
      await setSession(res.token, res.user);
      afterAuth();
    } catch (err) {
      // A login-field error (e.g. email taken) belongs to step 1.
      if (err instanceof ApiError && err.fieldErrors?.login) setRegStep(1);
      showApiError(err);
    } finally {
      setBusy(null);
    }
  };

  const onLogin = async () => {
    const e: Record<string, string> = {};
    if (!trimmedLogin) e.login = t.loginRequired;
    if (!password) e.password = t.passwordRequired;
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setBusy('form');
    setErrors({});
    try {
      const res = await apiLogin({ login: trimmedLogin, password });
      await setSession(res.token, res.user);
      afterAuth();
      // The login just revived a soft-deleted account (30-day window).
      if (res.restored) Alert.alert(t.appName, t.accountRestored);
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = () => {
    if (mode === 'login') return void onLogin();
    if (regStep === 1) {
      const eObj: Record<string, string> = {};
      if (!trimmedLogin) eObj.login = t.loginRequired;
      else {
        // Register accepts an email OR a KZ phone (mirrors the backend LoginIdentifier:
        // +7/7/8 + 10 digits, or a bare 10-digit number).
        const digits = trimmedLogin.replace(/\D/g, '');
        const isPhone = digits.length === 10 || (digits.length === 11 && /^[78]/.test(digits));
        if (!isEmailLogin && !isPhone) eObj.login = t.loginInvalid;
      }
      if (Object.keys(eObj).length) {
        setErrors(eObj);
        return;
      }
      setRegStep(2); // straight to name + password (no code step — owner decision)
      setErrors({});
      return;
    }
    return void onRegister();
  };

  const submitTitle =
    mode === 'login' ? t.loginAction : regStep === 1 ? t.next : t.registerAction;

  return (
    <View style={styles.fill}>
    <Screen scroll padded edgeTop>
      <View style={styles.hero}>
        <Logo size="lg" style={styles.heroLogo} />
        <Text variant="body" center color={Colors.textMuted}>
          {t.authTitle}
        </Text>
      </View>

      {/* Segmented switch */}
      <View style={styles.segment}>
        {(['login', 'register'] as Mode[]).map((m) => (
          <Pressable key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => switchMode(m)}>
            <Text variant="button" color={mode === m ? Colors.white : Colors.textMuted}>
              {m === 'login' ? t.loginTab : t.registerTab}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Login mode + register step 1: the email/phone field.
            Register step 2: show the chosen login with a change link instead. */}
        {mode === 'login' || regStep === 1 ? (
          <FormField
            label={t.loginField}
            placeholder={t.loginPlaceholder}
            value={loginVal}
            onChangeText={onLoginChange}
            autoCapitalize="none"
            keyboardType={loginLooksPhone ? 'phone-pad' : 'default'}
            error={errors.login}
          />
        ) : (
          <View style={styles.loginSummary}>
            <Text variant="small" color={Colors.textBody} numberOfLines={1} style={styles.loginSummaryTxt}>
              {trimmedLogin}
            </Text>
            <Pressable
              onPress={() => {
                setRegStep(1);
                setErrors({});
              }}
              hitSlop={6}
            >
              <Text variant="small" color={Colors.primary}>{t.changeLogin}</Text>
            </Pressable>
          </View>
        )}

        {/* Register step 2: name + password */}
        {mode === 'register' && regStep === 2 ? (
          <>
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
            <FormField
              label={t.passwordField}
              placeholder={t.passwordNewPlaceholder}
              value={password}
              onChangeText={setPassword}
              secure
              error={errors.password}
            />
            <FormField
              label={t.confirmPasswordField}
              value={confirm}
              onChangeText={setConfirm}
              secure
              error={errors.confirm}
            />
          </>
        ) : null}

        {/* Login mode: password + forgot link */}
        {mode === 'login' ? (
          <>
            <FormField
              label={t.passwordField}
              placeholder={t.passwordPlaceholder}
              value={password}
              onChangeText={setPassword}
              secure
              error={errors.password}
            />
            <Pressable onPress={() => router.push('/forgot-password')} hitSlop={6} style={styles.forgotLink}>
              <Text variant="small" color={Colors.primary}>{t.forgotLink}</Text>
            </Pressable>
          </>
        ) : null}

        <Button
          title={submitTitle}
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

      {/* Sign in with Apple — custom HIG-compliant button (black, Apple logo) so the
          label follows the APP language (kk/ru); the native AppleAuthenticationButton
          only speaks the device language (owner request 2026-07-17). */}
      {appleAvailable ? (
        <Button
          title={t.signInApple}
          icon="logo-apple"
          loading={busy === 'apple'}
          disabled={busy !== null}
          onPress={onApple}
          style={styles.appleButton}
        />
      ) : null}

      <Button
        title={t.signInGoogle}
        variant="outline"
        icon="logo-google"
        loading={busy === 'google'}
        disabled={busy !== null}
        onPress={onGoogle}
        style={appleAvailable ? styles.googleButton : undefined}
      />
    </Screen>

      {/* ✕ — ALWAYS visible (owner 2026-07-17): floats over the scroll content. */}
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={[styles.closeFloat, { top: insets.top + Spacing.sm }]}
        accessibilityRole="button"
        accessibilityLabel={t.close}
      >
        <Ionicons name="close" size={24} color={Colors.textMuted} />
      </Pressable>
    </View>
  );

  // ── OAuth handlers (hoisted below JSX for readability) ─────────────────────

  async function onGoogle() {
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
  }

  async function onApple() {
    setBusy('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert(t.error, t.authFailed);
        return;
      }
      // The server verifies the token against Apple's keys and issues OUR token.
      const res = await oauthSignIn('apple', credential.identityToken);
      await setItem(StorageKeys.token, res.token);
      await setSession(res.token, res.user);
      // Apple never puts a name in the id-token, so a fresh account has none yet.
      if (!res.user.name?.trim()) {
        router.replace({ pathname: '/set-nickname', params: returnTo ? { returnTo } : {} });
        return;
      }
      afterAuth();
    } catch (e) {
      // Dismissing the Apple sheet is a cancel, not a failure.
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(t.error, e instanceof ApiError ? e.message : t.authFailed);
    } finally {
      setBusy(null);
    }
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  appleButton: { backgroundColor: '#000000', borderColor: '#000000' },
  googleButton: { marginTop: Spacing.sm },
  closeFloat: {
    position: 'absolute',
    right: Spacing.base,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
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
  loginSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  loginSummaryTxt: { flex: 1, fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginTop: Spacing.sm },
  submit: { marginTop: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md },
});
