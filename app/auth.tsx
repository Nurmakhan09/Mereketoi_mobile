import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import {
  login as apiLogin,
  register as apiRegister,
  sendRegisterCode,
  verifyRegisterCode,
  fetchMe,
  oauthSignIn,
} from '@/services/api/auth';
import { runBrowserAuth } from '@/features/auth/browserAuth';
import { setItem, StorageKeys } from '@/services/storage';
import { ApiError } from '@/types/api';

type Mode = 'login' | 'register';
/** Register wizard (owner request 2026-07-17 — strict order):
 *  1 = email (or phone) → «Код жіберу» · 2 = enter + verify the emailed code ·
 *  3 = name + password → «Тіркелу». Phone logins skip step 2 (no email to verify). */
type RegStep = 1 | 2 | 3;

/** Auth screen — native login/register form (works in Expo Go) + Google via browser. */
export default function AuthScreen() {
  const { t, locale } = useI18n();
  const setSession = useAuthStore((s) => s.setSession);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [mode, setMode] = useState<Mode>('login');
  const [regStep, setRegStep] = useState<RegStep>(1);
  const [loginVal, setLoginVal] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'google' | 'apple' | null>(null);

  const trimmedLogin = loginVal.trim();
  const isEmailLogin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedLogin);

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
    setCode('');
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

  // Step 1 (email path) — send the verification code. The backend rejects an
  // invalid / already-registered email here, so a bad email never advances.
  const onSendCode = async () => {
    setBusy('form');
    setErrors({});
    try {
      await sendRegisterCode(trimmedLogin, locale);
      setRegStep(2);
      Alert.alert(t.appName, t.registerCodeSent);
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  };

  // Step 2 — verify the code on the server (without consuming it) before the
  // name+password step opens.
  const onVerifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ code: t.codeRequired });
      return;
    }
    setBusy('form');
    setErrors({});
    try {
      await verifyRegisterCode(trimmedLogin, code.trim());
      setRegStep(3);
    } catch (err) {
      showApiError(err);
    } finally {
      setBusy(null);
    }
  };

  // Step 3 — name + password, then create the account (the code is consumed
  // server-side here; email ownership is already proven).
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
      const res = await apiRegister({
        login: trimmedLogin,
        password,
        name: nm,
        code: isEmailLogin ? code.trim() : undefined,
      });
      await setSession(res.token, res.user);
      afterAuth();
    } catch (err) {
      // Code expired while the form was being filled → back to the code step.
      if (err instanceof ApiError && err.fieldErrors?.code) setRegStep(2);
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
      if (isEmailLogin) return void onSendCode();
      setRegStep(3); // phone registration: no email code to verify
      setErrors({});
      return;
    }
    if (regStep === 2) return void onVerifyCode();
    return void onRegister();
  };

  const submitTitle =
    mode === 'login'
      ? t.loginAction
      : regStep === 1
        ? trimmedLogin && !isEmailLogin
          ? t.next
          : t.forgotSendCode
        : regStep === 2
          ? t.forgotVerify
          : t.registerAction;

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
          <Pressable key={m} style={[styles.seg, mode === m && styles.segActive]} onPress={() => switchMode(m)}>
            <Text variant="button" color={mode === m ? Colors.white : Colors.textMuted}>
              {m === 'login' ? t.loginTab : t.registerTab}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Login mode + register step 1: the email/phone field.
            Register steps 2–3: show the chosen login with a change link instead. */}
        {mode === 'login' || regStep === 1 ? (
          <FormField
            label={t.loginField}
            placeholder={t.loginPlaceholder}
            value={loginVal}
            onChangeText={setLoginVal}
            autoCapitalize="none"
            keyboardType="default"
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
                setCode('');
                setErrors({});
              }}
              hitSlop={6}
            >
              <Text variant="small" color={Colors.primary}>{t.changeLogin}</Text>
            </Pressable>
          </View>
        )}

        {/* Register step 2: the emailed verification code */}
        {mode === 'register' && regStep === 2 ? (
          <>
            <FormField
              label={t.forgotCodeLabel}
              placeholder={t.forgotCodePlaceholder}
              hint={t.registerCodeSent}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
              error={errors.code}
              autoFocus
            />
            <Pressable onPress={busy === null ? onSendCode : undefined} hitSlop={6} style={styles.resendLink}>
              <Text variant="small" color={Colors.primary}>{t.resendCode}</Text>
            </Pressable>
          </>
        ) : null}

        {/* Register step 3: name + password (email is verified by now) */}
        {mode === 'register' && regStep === 3 ? (
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
  appleButton: { backgroundColor: '#000000', borderColor: '#000000' },
  googleButton: { marginTop: Spacing.sm },
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
  resendLink: { alignSelf: 'flex-end', marginBottom: Spacing.sm },
  submit: { marginTop: Spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { marginHorizontal: Spacing.md },
});
