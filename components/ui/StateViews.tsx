import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { Text } from './Text';
import { Button } from './Button';

/** Full-area loading spinner. */
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {label ? (
        <Text variant="small" color={Colors.textMuted} style={styles.gap}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Error state with a retry button. */
export function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={[styles.bubble, { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
      </View>
      <Text variant="body" center color={Colors.textMuted} style={styles.gap}>
        {message}
      </Text>
      {onRetry ? (
        <Button title={retryLabel} variant="outline" fullWidth={false} onPress={onRetry} style={styles.btn} />
      ) : null}
    </View>
  );
}

/** Empty state: icon bubble + title + subtitle + optional action. */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.bubble}>
        <Ionicons name={icon} size={32} color={Colors.primary} />
      </View>
      <Text variant="h3" center color={Colors.text} style={styles.gap}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="small" center color={Colors.textMuted} style={styles.gapSm}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} fullWidth={false} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: { marginTop: Spacing.base },
  gapSm: { marginTop: Spacing.sm, maxWidth: 280 },
  btn: { marginTop: Spacing.lg },
});
