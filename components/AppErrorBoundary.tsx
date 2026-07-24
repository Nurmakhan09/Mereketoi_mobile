import { ScrollView, StyleSheet, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';

/**
 * Crash screen — wired up via `export { ErrorBoundary }` from the route layouts.
 *
 * WHY THIS EXISTS: the app had no error boundary anywhere, so a single throw
 * during render made React unmount the whole tree and the app went pure WHITE
 * (the owner's «навбар аппақ болып қалады» report). In a dev build you would see
 * a redbox; in a production/OTA build you get nothing at all — no message, no
 * stack, no way back.
 *
 * So this does two jobs:
 *   1. Fix — the user sees a recoverable screen with a Retry button instead of a
 *      dead white app.
 *   2. Diagnose — it PRINTS the error message and stack on screen, because that
 *      is the one piece of information missing to find the real cause. Screenshot
 *      this screen when it appears.
 *
 * The error text is intentionally not localized: it is a developer diagnostic,
 * and translating it would hide the very string we need to read.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2" color={Colors.error} style={styles.title}>
          Қате орын алды
        </Text>
        <Text variant="small" color={Colors.textMuted} style={styles.hint}>
          Осы экранның скриншотын жіберіңіз — төмендегі мәтін қатенің себебін
          көрсетеді.
        </Text>

        <View style={styles.box}>
          <Text variant="small" color={Colors.textBody} style={styles.mono}>
            {error?.name ? `${error.name}: ` : ''}
            {error?.message ?? 'Unknown error'}
          </Text>
        </View>

        {error?.stack ? (
          <View style={styles.box}>
            <Text variant="xsmall" color={Colors.textMuted} style={styles.mono}>
              {error.stack}
            </Text>
          </View>
        ) : null}

        <Button title="Қайталау" onPress={() => void retry()} style={styles.btn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xxxl + Spacing.lg },
  title: { marginBottom: Spacing.sm },
  hint: { marginBottom: Spacing.lg },
  box: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  // Monospace so a stack trace stays readable / line-aligned.
  mono: { fontFamily: undefined, fontSize: 12, lineHeight: 17 },
  btn: { marginTop: Spacing.base },
});
