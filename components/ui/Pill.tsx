import { Pressable, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Rounded chip; selected = navy bg + white text (category strip, sub-pills, sort). */
export function Pill({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[Typography.small, { color: selected ? Colors.white : Colors.textBody }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unselected: { backgroundColor: Colors.surface, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
});
