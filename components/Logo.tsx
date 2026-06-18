import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Typography } from '@/constants/theme';

/**
 * Brand wordmark — the whole "mereketoi" is navy (design prompt §2.1/§3/§7:
 * "логотип mereketoi түгел көк"; gold is accent-only). `light` renders the whole
 * wordmark white for use over the navy hero.
 * NOTE: the web logo still renders "toi" in gold — align the web if full parity
 * is wanted.
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
  // Whole wordmark navy (or white over the navy hero) — gold is accent-only.
  const base = light ? Colors.white : Colors.text;
  const accent = base;
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
