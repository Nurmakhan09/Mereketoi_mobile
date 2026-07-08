import { useEffect } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAppConfigStore } from '@/stores/appConfigStore';

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
});
