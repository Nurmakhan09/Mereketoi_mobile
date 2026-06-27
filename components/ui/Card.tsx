import { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  /**
   * Home white-card accent border. Kept as a prop for API compatibility, but the
   * colored (formerly gold) border was dropped 2026-06-25 to match the web — these
   * cards now use the same neutral grey border as every other card.
   */
  gold?: boolean;
}

export function Card({ children, onPress, style, padded = true, gold = false }: Props) {
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    gold && { borderColor: Colors.border },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  padded: { padding: Spacing.base },
  pressed: { opacity: 0.95, transform: [{ scale: 0.995 }] },
});
