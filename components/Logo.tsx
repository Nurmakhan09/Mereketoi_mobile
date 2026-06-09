import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Typography } from '@/constants/theme';

/**
 * Brand wordmark — "mereke" navy + "toi" gold, matching the website logo
 * (app/Views/partials/auth_box.php + site_footer.php). Used in screen headers.
 * `light` renders white "mereke" for use over the navy hero.
 */
export function Logo({
  size = 'md',
  light = false,
  style,
}: {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
  style?: ViewStyle;
}) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 18 : 22;
  // Over the navy hero the whole wordmark is white; elsewhere it's navy "mereke" + gold "toi".
  const base = light ? Colors.white : Colors.text;
  const accent = light ? Colors.white : Colors.secondary;
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.word, { fontSize, color: base }]}>mereke</Text>
      <Text style={[styles.word, { fontSize, color: accent }]}>toi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  word: { fontFamily: Typography.h2.fontFamily, letterSpacing: -0.3 },
});
