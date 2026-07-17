import { ReactNode } from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

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
  /**
   * Add bottom padding so content clears the translucent tab bar (iOS floats the
   * bar over the content). Turn OFF for screens whose own sticky footer already
   * handles the clearance (e.g. the listing detail CTA).
   */
  tabBarAware?: boolean;
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
  tabBarAware = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarPad = useTabBarPadding();
  const bottomPad = tabBarAware ? tabBarPad : 0;
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
            { paddingBottom: Spacing.xxxl + bottomPad },
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

  return (
    <View style={[base, padded && styles.padded, bottomPad ? { paddingBottom: bottomPad } : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: Spacing.base },
});
