import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useRequireAuth } from '@/features/auth/useRequireAuth';
import { fetchInvitePreview, acceptInvite } from '@/services/api/bookings';
import { InvitePreview } from '@/types';

/**
 * Provider-invite landing: shows a listing summary (NEVER a phone) + an Accept
 * button. Accepting requires auth → lands the client on their той plan.
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useI18n();
  const navigation = useNavigation();
  const { requireAuth } = useRequireAuth();

  const [data, setData] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchInvitePreview(token));
    } catch {
      setData({ token, state: 'notFound', date: '', price: null, hall_id: 0, category_label: '', listing: null });
    } finally {
      setLoading(false);
      navigation.setOptions({ title: t.inviteKicker });
    }
  }, [token, navigation, t.inviteKicker]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAccept = () =>
    requireAuth(async () => {
      setAccepting(true);
      try {
        await acceptInvite(token);
        Alert.alert(t.appName, t.inviteAcceptedMsg);
        router.replace('/toi');
      } catch (e: any) {
        Alert.alert(t.error, e?.message ?? t.errorNetwork);
      } finally {
        setAccepting(false);
      }
    });

  if (loading) return <Loading />;

  const stateMsg: Record<string, string> = {
    alreadyUsed: t.inviteStateUsed,
    expired: t.inviteStateExpired,
    notFound: t.inviteStateNotFound,
  };

  if (!data || data.state !== 'valid') {
    return (
      <Screen scroll padded>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textFaint} />
          <Text variant="body" color={Colors.textMuted} center style={styles.msg}>
            {data ? stateMsg[data.state] ?? t.inviteStateNotFound : t.inviteStateNotFound}
          </Text>
          <Button title={t.back} variant="outline" onPress={() => router.replace('/toi')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padded>
      <Text variant="h2" color={Colors.text} style={styles.kicker}>{t.inviteKicker}</Text>
      <Text variant="small" color={Colors.textMuted} style={styles.hint}>{t.inviteHint}</Text>

      <Card padded style={styles.card}>
        {data.listing ? <Text variant="h3" color={Colors.text}>{data.listing.title}</Text> : null}
        {data.category_label ? <Text variant="small" color={Colors.textMuted}>{data.category_label}</Text> : null}
        <View style={styles.metaRow}>
          <Text variant="small" color={Colors.text}>{t.bookingDate}: {data.date}</Text>
        </View>
        {data.price != null ? (
          <Text variant="small" color={Colors.text}>{t.dealAgreed}: {data.price} ₸</Text>
        ) : null}
      </Card>

      <Button title={t.inviteAcceptBtn} loading={accepting} onPress={onAccept} style={styles.acceptBtn} />
      <Button title={t.inviteLater} variant="ghost" onPress={() => router.replace('/toi')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.base },
  msg: { maxWidth: 300 },
  kicker: { marginTop: Spacing.sm },
  hint: { marginTop: Spacing.xs, marginBottom: Spacing.base },
  card: { marginBottom: Spacing.lg, gap: 4 },
  metaRow: { marginTop: Spacing.xs },
  acceptBtn: { marginBottom: Spacing.sm },
});
