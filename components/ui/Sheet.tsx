import { ReactNode } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet: dim overlay + rounded card sliding from the bottom. */
export function Sheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
