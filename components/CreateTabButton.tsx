import { Pressable, View, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Fonts } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

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

/**
 * Center "Хабарландыруым" button — once the user has a PUBLISHED listing the middle
 * CTA stops being the raised "+" and becomes a normal nav item that opens the
 * single ad (mirrors layouts/app.php: $_hasPublished → "myListing" item).
 */
export function ListingTabButton({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
}) {
  // Match the sibling tabs: navy when active, gold when not.
  const color = active ? Colors.primary : Colors.secondary;
  return (
    <Pressable onPress={onPress} style={styles.normalWrap} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={active ? 'albums' : 'albums-outline'} size={24} color={color} />
      <Text style={styles.normalLabel} color={color}>
        {label}
      </Text>
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
  normalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  normalLabel: { fontFamily: Fonts.medium, fontSize: 11 },
});
