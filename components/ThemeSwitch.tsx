import { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Appearance } from 'react-native';
import * as Updates from 'expo-updates';

import { Text } from '@/components/ui/Text';
import { Colors, Radius, Spacing, THEME_PREF_KEY, ThemePref, bootThemePref } from '@/constants/theme';
import { setItem, deleteItem } from '@/services/storage';
import { useI18n } from '@/locales';

/**
 * Theme picker — Әдепкі (system, the default) · Жарық · Қараңғы. Shown in
 * Settings AND on the Profile tab so GUESTS can switch too (owner request
 * 2026-07-17: «тіркелмей де өзгертуге болатын болуы керек»). Switching persists
 * the choice and re-launches the JS bundle so every static StyleSheet
 * re-evaluates with the new palette (see constants/theme.ts).
 */
export function ThemeSwitch({
  showHint = true,
  compact = false,
}: {
  showHint?: boolean;
  /** Small centered pills (profile-bottom placement) instead of full-width segments. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [pref, setPref] = useState<ThemePref>(bootThemePref);
  const [switching, setSwitching] = useState(false);

  const options: { value: ThemePref; label: string }[] = [
    { value: 'system', label: t.themeSystem },
    { value: 'light', label: t.themeLight },
    { value: 'dark', label: t.themeDark },
  ];

  const onPick = async (value: ThemePref) => {
    if (value === pref || switching) return;
    setPref(value);
    setSwitching(true);
    try {
      if (value === 'system') {
        await deleteItem(THEME_PREF_KEY);
        Appearance.setColorScheme(null); // hand native chrome back to the OS
      } else {
        await setItem(THEME_PREF_KEY, value);
      }
      // Re-launch the JS bundle so the whole app repaints in the new theme.
      await Updates.reloadAsync();
    } catch {
      // Expo Go / dev: reload API unavailable — applies on the next launch.
      setSwitching(false);
      Alert.alert(t.appName, t.themeRestartHint);
    }
  };

  return (
    <View>
      <View style={[styles.row, compact && styles.rowCompact]}>
        {options.map((o) => {
          const active = pref === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => void onPick(o.value)}
              style={[
                compact ? styles.optCompact : styles.opt,
                active && styles.optActive,
              ]}
            >
              <Text
                variant={compact ? 'xsmall' : 'small'}
                color={active ? Colors.white : Colors.textBody}
                center
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showHint ? (
        <Text variant="xsmall" color={Colors.textMuted} style={styles.hint}>
          {t.themeHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  rowCompact: { justifyContent: 'center', gap: Spacing.xs },
  optCompact: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opt: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  hint: { marginTop: Spacing.md },
});
