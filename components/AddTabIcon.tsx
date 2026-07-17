import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius } from '@/constants/theme';

/**
 * Center "Жариялау" (Add) tab icon — mirrors the web bottom-nav `.add-btn`
 * (app/Views/partials/bottom_nav.php + app.css): a filled rounded-SQUARE
 * (radius-md) holding a white "+", sitting INLINE with the other tabs (not a
 * raised circle). Navy accent (#0B1F4D = Colors.secondary) by default; turns
 * primary-navy (#000099 = Colors.primary) on the create page, exactly like
 * `.bottom-nav-item.add-btn.is-active svg { background: var(--color-primary) }`.
 */
export function AddTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.square, { backgroundColor: focused ? Colors.primary : Colors.secondary }]}>
      <Ionicons name="add" size={22} color={Colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});