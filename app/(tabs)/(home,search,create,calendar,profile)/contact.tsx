import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAppConfigStore } from '@/stores/appConfigStore';
import { useImagePicker } from '@/features/listings/useImagePicker';
import { submitFeedback, FeedbackType } from '@/services/api/feedback';
import { ApiError } from '@/types/api';

/**
 * Байланыс — platform contact channels. Single source of truth: the editable
 * ContactSettingModel on the backend, delivered via /api/v1/app-config → contact.
 * Editing it in Admin → Байланыс updates the site and this screen at once.
 */

/** Fallback contacts so the page is never empty before app-config delivers the
 * editable ones (older prod app-config has no `contact` block yet). */
const DEFAULT_CONTACT = {
  phone: '+7 700 000 00 00',
  whatsapp: '77000000000',
  email: 'info@mereketoi.kz',
  instagram: 'mereketoi.kz',
  telegram: '',
  address_kk: '',
  address_ru: '',
};

export default function ContactScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const contact = useAppConfigStore((s) => s.config?.contact) ?? DEFAULT_CONTACT;

  useEffect(() => {
    navigation.setOptions({ title: t.contactTitle });
  }, [navigation, t.contactTitle]);

  const digits = (s: string) => s.replace(/\D+/g, '');
  const handle = (s: string) => s.trim().replace(/^@/, '');

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; url?: string }[] = [];
  if (contact?.phone) rows.push({ icon: 'call-outline', label: 'Телефон', value: contact.phone, url: `tel:${contact.phone.replace(/[^\d+]/g, '')}` });
  if (contact?.whatsapp) rows.push({ icon: 'logo-whatsapp', label: 'WhatsApp', value: contact.phone || contact.whatsapp, url: `https://wa.me/${digits(contact.whatsapp)}` });
  if (contact?.email) rows.push({ icon: 'mail-outline', label: 'Email', value: contact.email, url: `mailto:${contact.email}` });
  if (contact?.instagram) rows.push({ icon: 'logo-instagram', label: 'Instagram', value: `@${handle(contact.instagram)}`, url: `https://instagram.com/${handle(contact.instagram)}` });
  if (contact?.telegram) rows.push({ icon: 'paper-plane-outline', label: 'Telegram', value: `@${handle(contact.telegram)}`, url: `https://t.me/${handle(contact.telegram)}` });

  const address = locale === 'ru' ? contact?.address_ru : contact?.address_kk;
  if (address) rows.push({ icon: 'location-outline', label: t.contactAddress, value: address });

  // ── Feedback form (suggestion / complaint + optional image) → admin inbox ──
  const { pick, picking } = useImagePicker(t.contactTitle);
  const [fbType, setFbType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [fbContact, setFbContact] = useState('');
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (message.trim().length < 5) {
      Alert.alert(t.appName, t.feedbackMessageRequired);
      return;
    }
    setSending(true);
    try {
      await submitFeedback({ type: fbType, message: message.trim(), contact: fbContact.trim() || undefined, image });
      setMessage('');
      setFbContact('');
      setImage(null);
      setFbType('suggestion');
      Alert.alert(t.appName, t.feedbackSent);
    } catch (e) {
      Alert.alert(t.error, e instanceof ApiError ? e.message : t.errorNetwork);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll padded>
      <Card style={styles.card} padded={false}>
        {rows.length === 0 ? (
          <View style={styles.item}>
            <Text variant="body" color={Colors.textMuted}>—</Text>
          </View>
        ) : (
          rows.map((r, i) => {
            const last = i === rows.length - 1;
            const body = (
              <View style={[styles.item, !last && styles.divider]}>
                <Ionicons name={r.icon} size={22} color={Colors.primary} />
                <View style={styles.texts}>
                  <Text variant="small" color={Colors.textMuted}>{r.label}</Text>
                  <Text variant="body" color={Colors.textBody}>{r.value}</Text>
                </View>
                {r.url ? <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} /> : null}
              </View>
            );
            return r.url ? (
              <Pressable key={r.label} onPress={() => Linking.openURL(r.url!).catch(() => {})}>
                {body}
              </Pressable>
            ) : (
              <View key={r.label}>{body}</View>
            );
          })
        )}
      </Card>

      {/* Feedback: suggestion / complaint */}
      <Text variant="h3" color={Colors.text} style={styles.fbHeading}>{t.feedbackTitle}</Text>
      <Text variant="small" color={Colors.textMuted} style={styles.fbIntro}>{t.feedbackIntro}</Text>

      <Card style={styles.fbCard} padded>
        <View style={styles.fbTypes}>
          {(['suggestion', 'complaint'] as FeedbackType[]).map((tp) => (
            <Pressable
              key={tp}
              onPress={() => setFbType(tp)}
              style={[styles.fbType, fbType === tp && styles.fbTypeActive]}
            >
              <Text variant="button" color={fbType === tp ? Colors.white : Colors.textMuted}>
                {tp === 'suggestion' ? t.feedbackTypeSuggestion : t.feedbackTypeComplaint}
              </Text>
            </Pressable>
          ))}
        </View>

        <FormField
          label={t.feedbackMessage}
          placeholder={t.feedbackMessagePlaceholder}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          maxLength={4000}
          style={styles.fbTextarea}
        />

        {image ? (
          <View style={styles.fbImageRow}>
            <Ionicons name="image" size={18} color={Colors.primary} />
            <Text variant="small" color={Colors.textBody} style={styles.fbImageTxt}>{t.feedbackImageAttached}</Text>
            <Pressable onPress={() => setImage(null)} hitSlop={8}>
              <Text variant="small" color={Colors.error}>{t.feedbackRemoveImage}</Text>
            </Pressable>
          </View>
        ) : (
          <Button
            title={t.feedbackAddImage}
            variant="outline"
            icon="image-outline"
            loading={picking}
            onPress={async () => { const a = await pick(); if (a) setImage(a); }}
            style={styles.fbBtn}
          />
        )}

        <FormField
          label={t.feedbackContact}
          hint={t.feedbackContactHint}
          value={fbContact}
          onChangeText={setFbContact}
          autoCapitalize="none"
          maxLength={190}
        />

        <Button
          title={t.feedbackSubmit}
          icon="send-outline"
          loading={sending}
          disabled={sending}
          onPress={onSend}
          style={styles.fbBtn}
        />
      </Card>

      <Text variant="xsmall" color={Colors.textFaint} center style={styles.copyright}>
        © {new Date().getFullYear()} Mereketoi.kz · {t.allRightsReserved}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.base },
  item: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  texts: { flex: 1 },
  copyright: { marginTop: Spacing.lg },
  fbHeading: { marginTop: Spacing.xl },
  fbIntro: { marginTop: Spacing.xs, marginBottom: Spacing.md },
  fbCard: {},
  fbTypes: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  fbType: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceMuted,
  },
  fbTypeActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  fbTextarea: { minHeight: 110, textAlignVertical: 'top' },
  fbImageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  fbImageTxt: { flex: 1 },
  fbBtn: { marginTop: Spacing.sm },
});
