import { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useAppConfigStore, isForceUpdate } from '@/stores/appConfigStore';
import { useAuthStore, registerAuthHandlers } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import { Colors, Spacing } from '@/constants/theme';
import { Loading, EmptyState } from '@/components/ui/StateViews';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/locales';

/**
 * Startup gate: load app-config + locale + auth session, then enforce
 * maintenance / force-update (master-spec §7) before rendering the app.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false);
  const loadConfig = useAppConfigStore((s) => s.load);
  const config = useAppConfigStore((s) => s.config);
  const initLocale = useLocaleStore((s) => s.init);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    registerAuthHandlers();
    (async () => {
      await Promise.all([loadConfig(), initLocale()]);
      await bootstrap(); // needs locale-independent; runs after config so 401 handler is set
      setBooted(true);
    })();
  }, [loadConfig, initLocale, bootstrap]);

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
