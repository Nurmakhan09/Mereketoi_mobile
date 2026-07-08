import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Typography } from '@/constants/theme';

// New brand mark — the blue "M-in-circle" monogram. Blue variant for light
// surfaces, white variant for the navy hero (`light`). Relative requires so the
// asset resolves regardless of the path alias.
const MARK = require('../assets/images/logo.png');
const MARK_WHITE = require('../assets/images/logo-white.png');

/**
 * Brand logo — the new blue monogram + the "mereketoi" wordmark.
 * `lg` stacks the mark above the wordmark (auth/hero screens); `md`/`sm` lay them
 * out side-by-side (headers). `light` renders the white mark + white wordmark for
 * use over the navy hero.
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
  const markSize = size === 'lg' ? 72 : size === 'sm' ? 24 : 34;
  const stacked = size === 'lg';
  const base = light ? Colors.white : Colors.text;
  return (
    <View style={[stacked ? styles.col : styles.row, style]}>
      <Image
        source={light ? MARK_WHITE : MARK}
        style={{ width: markSize, height: markSize }}
        resizeMode="contain"
      />
      <View style={styles.wordRow}>
        <Text style={[styles.word, { fontSize, color: base }]}>mereke</Text>
        <Text style={[styles.word, { fontSize, color: base }]}>toi</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline' },
  word: { fontFamily: Typography.h2.fontFamily, letterSpacing: -0.3 },
});
