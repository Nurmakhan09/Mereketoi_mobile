import { Pressable, View, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/constants/theme';

/** Center "+" Create button — a gold filled pill with a white plus (master-spec §1.1). */
export function CreateTabButton({ onPress }: { onPress?: (e: GestureResponderEvent) => void }) {
  return (
    <Pressable onPress={onPress} style={styles.wrap} accessibilityRole="button" accessibilityLabel="Жариялау">
      <View style={styles.pill}>
        <Ionicons name="add" size={30} color={Colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: {
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Shadow.md,
  },
});
