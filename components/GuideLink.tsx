import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { Text } from './ui/Text';

interface Props {
  /** Help guide key (e.g. 'listing', 'categories', 'toi', 'calendar'). */
  anchor: string;
  label: string;
}

/**
 * Small link to a Help-page guide section (owner request 2026-07-19) — opens the
 * real web page (via the Help WebView, see page/[slug].tsx) so photos/videos the
 * owner adds there show up instantly, no app update needed.
 */
export function GuideLink({ anchor, label }: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/page/help?anchor=${anchor}`)}
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
