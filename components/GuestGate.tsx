import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from './ui/StateViews';
import { Colors } from '@/constants/theme';
import { useI18n } from '@/locales';

/** Shown inside an auth-gated tab when the user is a guest. */
export function GuestGate({ returnTo }: { returnTo: string }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { paddingTop: insets.top }]}>
      <EmptyState
        icon="lock-closed-outline"
        title={t.guestProfileTitle}
        subtitle={t.authRequired}
        actionLabel={t.loginRegister}
        onAction={() => router.push({ pathname: '/auth', params: { returnTo } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
});
