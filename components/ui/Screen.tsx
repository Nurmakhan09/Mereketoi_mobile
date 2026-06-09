import { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Apply top safe-area inset (for screens without a header). */
  edgeTop?: boolean;
}

/** Page container: background + bottom safe-area + optional scroll/refresh. */
export function Screen({
  children,
  scroll = false,
  padded = false,
  style,
  contentStyle,
  refreshing,
  onRefresh,
  edgeTop = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const base: ViewStyle = {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: edgeTop ? insets.top : 0,
  };

  if (scroll) {
    return (
      <View style={[base, style]}>
        <ScrollView
          contentContainerStyle={[
            padded && styles.padded,
            { paddingBottom: Spacing.xxxl },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[base, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  padded: { padding: Spacing.base },
});
