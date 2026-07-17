import { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useAppConfigStore, isForceUpdate } from '@/stores/appConfigStore';
import { useAuthStore, registerAuthHandlers } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import { Colors, Spacing } from '@/constants/theme';
import { Loading, EmptyState } from '@/components/ui/StateViews';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/locales';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';

/**
 * Startup gate: load app-config + locale + auth session, then enforce
 * maintenance / force-update (master-spec §7) before rendering the app.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false);
  const loadConfig = useAppConfigStore((s) => s.load);
  const hydrateConfig = useAppConfigStore((s) => s.hydrate);
  const config = useAppConfigStore((s) => s.config);
  const initLocale = useLocaleStore((s) => s.init);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    registerAuthHandlers();
    (async () => {
      // Cold-start path is LOCAL-first: cached config + locale (disk reads only).
      // The fresh-config network fetch runs in the background AFTER boot — the
      // maintenance/force-update gates below read zustand state, so a blocker
      // still appears reactively the moment fresh config lands.
      await Promise.all([hydrateConfig(), initLocale()]);
      await bootstrap(); // 4s-capped /me; network failure keeps the cached session
      setBooted(true);
      void loadConfig(); // background refresh (persists for the next cold start)
    })();
  }, [hydrateConfig, loadConfig, initLocale, bootstrap]);

  // Native push: register the device once authed; deep-link on tap (shared mapper).
  usePushNotifications(booted);

  if (!booted) {
    return (
      <View style={styles.fill}>
        <Loading />
      </View>
    );
  }

  if (config?.maintenance) {
    return <Blocker kind="maintenance" />;
  }
  if (isForceUpdate(config)) {
    return <Blocker kind="update" storeUrl={config?.store_url} />;
  }

  return <>{children}</>;
}

function Blocker({ kind, storeUrl }: { kind: 'maintenance' | 'update'; storeUrl?: string }) {
  const { t } = useI18n();
  const isUpdate = kind === 'update';
  return (
    <View style={[styles.fill, styles.padded]}>
      <EmptyState
        icon={isUpdate ? 'cloud-download-outline' : 'construct-outline'}
        title={isUpdate ? t.updateTitle : t.maintenanceTitle}
        subtitle={isUpdate ? t.updateBody : t.maintenanceBody}
      />
      {isUpdate && storeUrl ? (
        <Button title={t.updateButton} fullWidth={false} onPress={() => Linking.openURL(storeUrl)} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.background },
  padded: { padding: Spacing.lg },
  btn: { alignSelf: 'center', marginTop: Spacing.lg },
});
