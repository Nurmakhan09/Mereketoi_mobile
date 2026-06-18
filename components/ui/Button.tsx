import { Pressable, ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

/** Primary action button. Disabled automatically while `loading`. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  small = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const palette = variantStyle(variant, isDisabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        fullWidth && styles.fullWidth,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} style={styles.icon} />}
          <Text style={[Typography.button, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

function variantStyle(variant: Variant, disabled: boolean) {
  const base = (() => {
    switch (variant) {
      case 'outline':
        return { bg: 'transparent', fg: Colors.primary, border: Colors.border };
      case 'danger':
        return { bg: Colors.error, fg: Colors.white, border: Colors.error };
      case 'ghost':
        return { bg: 'transparent', fg: Colors.primary, border: 'transparent' };
      default:
        return { bg: Colors.primary, fg: Colors.white, border: Colors.primary };
    }
  })();
  if (disabled) return { ...base, bg: base.bg === 'transparent' ? 'transparent' : Colors.border, fg: Colors.textFaint, border: Colors.border };
  return base;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52, // design prompt §3: button height ≥ 52
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  small: { minHeight: 38, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: Spacing.sm },
});
