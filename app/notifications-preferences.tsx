import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchPreferences, updatePreferences } from '@/services/api/notifications';
import { NotificationChannel } from '@/types';

const CHANNELS: NotificationChannel[] = ['in_app', 'email', 'telegram', 'push'];

export default function NotificationPreferencesScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();

  const [channels, setChannels] = useState<Record<NotificationChannel, boolean>>({
    in_app: true,
    email: false,
    telegram: false,
    push: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchPreferences();
      setChannels({ ...channels, ...res.channels, in_app: true });
      navigation.setOptions({ title: t.preferences });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, t.preferences]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (ch: NotificationChannel, value: boolean) => {
    if (ch === 'in_app') return; // forced on
    const next = { ...channels, [ch]: value };
    setChannels(next);
    try {
      const saved = await updatePreferences(next);
      setChannels({ ...saved, in_app: true });
    } catch {
      setChannels(channels); // revert
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const labels: Record<NotificationChannel, string> = {
    in_app: t.channelInApp,
    email: t.channelEmail,
    telegram: t.channelTelegram,
    push: t.channelPush,
  };

  return (
    <Screen scroll padded>
      <Card padded>
        {CHANNELS.map((ch, i) => (
          <View key={ch} style={[styles.row, i < CHANNELS.length - 1 && styles.divider]}>
            <View style={styles.flex}>
              <Text variant="body" color={Colors.text}>
                {labels[ch]}
              </Text>
              {ch === 'in_app' ? (
                <Text variant="xsmall" color={Colors.textMuted}>
                  {t.channelInAppNote}
                </Text>
              ) : ch !== 'email' ? (
                <Text variant="xsmall" color={Colors.textFaint}>
                  {t.channelComingSoon}
                </Text>
              ) : null}
            </View>
            <Switch
              value={channels[ch]}
              disabled={ch === 'in_app'}
              onValueChange={(v) => toggle(ch, v)}
              trackColor={{ true: Colors.primary, false: Colors.border }}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: Colors.surfaceMuted },
  flex: { flex: 1 },
});
