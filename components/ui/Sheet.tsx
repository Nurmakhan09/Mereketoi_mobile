import { ReactNode } from 'react';
import { Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet: BLURRED backdrop (owner request 2026-07-17 — «артқы фоны бұлдыр
 *  болсын», not just dark) + rounded card sliding from the bottom. */
export function Sheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView
        intensity={35}
        tint="dark"
        // Real blur on Android too (default there is a plain translucent view).
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.base }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            {title ? (
              <Text variant="h3" color={Colors.text} style={styles.title}>
                {title}
              </Text>
            ) : null}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    // Light veil on top of the blur — keeps the sheet readable without going dark.
    backgroundColor: 'rgba(15,23,42,0.18)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    marginBottom: Spacing.base,
  },
  title: { marginBottom: Spacing.base },
});
