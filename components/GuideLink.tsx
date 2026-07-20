import { Linking, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { Text } from './ui/Text';
import { useI18n } from '@/locales';
import { WEB_URL } from '@/constants/config';

interface Props {
  /** Help guide key (e.g. 'listing', 'categories', 'toi', 'calendar'). */
  anchor: string;
  label: string;
}

/**
 * Small link to a Help-page guide section (owner request 2026-07-20: opens the
 * real site in the external browser, not inside the app).
 */
export function GuideLink({ anchor, label }: Props) {
  const { locale } = useI18n();
  const url = `${WEB_URL}/${locale === 'ru' ? 'ru/' : ''}help#guide-${anchor}`;

  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={styles.row}
      hitSlop={6}
    >
      <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
      <Text variant="small" color={Colors.primary} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontWeight: '600' },
});
