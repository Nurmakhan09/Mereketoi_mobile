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
  // Match the sibling tabs: navy when active, uniform grey when not (design prompt §3).
  const color = active ? Colors.primary : Colors.tabInactive;
  return (
    <Pressable onPress={onPress} style={styles.normalWrap} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={active ? 'albums' : 'albums-outline'} size={24} color={color} />
      <Text style={styles.normalLabel} color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
  normalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  // lineHeight must be set explicitly: <Text> defaults to the body variant
  // (lineHeight 24), which would inflate this 11px label's box and push the
  // icon+label block upward, misaligning it with the sibling tabs.
  // Full slot width + center so adjustsFontSizeToFit shrinks the long
  // "Хабарландыруым" to one line instead of wrapping ("хабарландыруы"+"м").
  normalLabel: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 14, alignSelf: 'stretch', textAlign: 'center' },
});
