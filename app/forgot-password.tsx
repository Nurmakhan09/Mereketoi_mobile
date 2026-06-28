import { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { forgotPassword, verifyReset, resetPassword } from '@/services/api/auth';
import { ApiError } from '@/types/api';

type Step = 1 | 2 | 3;

/**
 * Forgot-password — 3-step OTP reset on one screen (web AuthController parity):
 *   1) email/phone → send a code   2) enter the 6-digit code   3) set a new password.
 * The backend never reveals whether the account exists (anti-enumeration). On success
 * we return to /auth with a "password updated" message.
 */
export default function ForgotPasswordScreen() {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>(1);
  const [login, setLogin] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      if (e.fieldErrors) setErrors(e.fieldErrors);
      Alert.alert(t.error, e.message);
    } else {
      Alert.alert(t.error, t.errorNetwork);
    }
  };

  const onSendCode = async () => {
    setErrors({});
    if (!login.trim()) { setErrors({ login: t.loginRequired }); return; }
    setBusy(true);
    try {
      const res = await forgotPassword(login.trim());
      setChannel(res.channel);
      setStep(2);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const onVerify = async () => {
    setErrors({});
    if (code.trim().length < 4) { setErrors({ code: t.codeRequired }); return; }
    setBusy(true);
    try {
      await verifyReset(login.trim(), code.trim());
      setStep(3);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const onReset = async () => {
    setErrors({});
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = t.passwordTooShort;
    if (password !== confirm) e.confirm = t.passwordMismatch;
    if (Object.keys(e).length) { setErrors(e); return; }
    setBusy(true);
    try {
      await resetPassword(login.trim(), code.trim(), password);
      Alert.alert(t.appName, t.forgotDone);
      router.replace('/auth');
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const codeSent = channel === 'sms' ? t.forgotCodeSentSms : t.forgotCodeSentEmail;

  return (
    <Screen scroll padded edgeTop>
      <View style={styles.closeRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Logo size="lg" style={styles.heroLogo} />
        <Text variant="h3" center color={Colors.text}>{t.forgotTitle}</Text>
        <Text variant="small" center color={Colors.textMuted} style={styles.heroSub}>
          {step === 1 ? t.forgotSubtitle : codeSent}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 1 ? (
          <>
            <FormField
              label={t.loginField}
              placeholder={t.loginPlaceholder}
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.login}
            />
            <Button title={t.forgotSendCode} loading={busy} onPress={onSendCode} style={styles.submit} />
          </>
        ) : step === 2 ? (
          <>
            <FormField
              label={t.forgotCodeLabel}
              placeholder={t.forgotCodePlaceholder}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              error={errors.code}
            />
            <Button title={t.forgotVerify} loading={busy} onPress={onVerify} style={styles.submit} />
            <Button title={t.back} variant="ghost" onPress={() => setStep(1)} style={styles.back} />
          </>
        ) : (
          <>
            <FormField
              label={t.newPassword}
              placeholder={t.passwordNewPlaceholder}
              value={password}
              onChangeText={setPassword}
              secure
              error={errors.password}
            />
            <FormField
              label={t.confirmNewPassword}
              value={confirm}
              onChangeText={setConfirm}
              secure
              error={errors.confirm}
            />
            <Button title={t.save} loading={busy} onPress={onReset} style={styles.submit} />
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end' },
  close: { padding: Spacing.xs },
  hero: { alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  heroLogo: { marginBottom: Spacing.md },
  heroSub: { marginTop: Spacing.sm, maxWidth: 320 },
  submit: { marginTop: Spacing.sm },
  back: { marginTop: Spacing.xs },
});
