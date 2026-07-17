import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';

/** Header back button — navy chevron only, no label. */
export function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={10}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Ionicons name="chevron-back" size={26} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingRight: 8, paddingVertical: 4 },
});
