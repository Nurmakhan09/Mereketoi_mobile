import { Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Rounded chip; selected = navy bg + white text (category strip, sub-pills, sort). */
export function Pill({ label, selected = false, onPress, icon }: Props) {
  const color = selected ? Colors.white : Colors.textBody;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={color} style={styles.icon} /> : null}
      <Text style={[Typography.small, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  icon: { marginRight: 4 },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unselected: { backgroundColor: Colors.surface, borderColor: Colors.border },
  pressed: { opacity: 0.85 },
});
