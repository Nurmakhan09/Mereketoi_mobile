import { Pressable, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

/** Labeled checkbox row (e.g. listing form's "Келісімді" negotiable-price flag). */
export function Checkbox({ label, checked, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
      </View>
      <Text style={[Typography.small, styles.label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  boxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label: { color: Colors.textBody },
});
