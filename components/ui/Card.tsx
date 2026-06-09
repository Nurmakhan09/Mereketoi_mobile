import { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  /** Gold 1px border (home white cards, master-spec §1.1 gold chrome). */
  gold?: boolean;
}

export function Card({ children, onPress, style, padded = true, gold = false }: Props) {
  const cardStyle = [
    styles.card,
    padded && styles.padded,
    gold && { borderColor: Colors.secondary },
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
