import { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import * as Updates from 'expo-updates';
import { useAppConfigStore, isForceUpdate } from '@/stores/appConfigStore';
import { useAuthStore, registerAuthHandlers } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Loading, EmptyState } from '@/components/ui/StateViews';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useI18n } from '@/locales';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';

/**
 * Background OTA check (EAS Update) — separate from the force-update/maintenance
 * gate above: this is for JS-only changes that ship without any app-store review.
 * `expo-updates` already auto-applies a fetched update on the NEXT cold start with
 * zero code; this adds an optional same-session "Жаңарту бар" banner so an update
 * doesn't have to wait for the user to fully quit and reopen the app.
 */
function useOtaUpdateBanner(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || __DEV__ || !Updates.isEnabled) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          setReady(true);
        }
      } catch {
        // Offline or update service unreachable — silently skip, next cold start retries.
      }
    })();
  }, [enabled]);
  return ready;
}

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

  // OTA (EAS Update) — separate from the maintenance/force-update gate: a JS-only
  // update was fetched in the background and is ready to apply this session.
  const otaReady = useOtaUpdateBanner(booted);

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

  return (
    <>
      {children}
      {otaReady ? <OtaBanner /> : null}
    </>
  );
}

function OtaBanner() {
  const { t } = useI18n();
  return (
    <View style={styles.otaBanner} pointerEvents="box-none">
      <View style={styles.otaCard}>
        <Text variant="small" color={Colors.white} style={styles.otaText}>
          {t.otaUpdateReady}
        </Text>
        <Button
          title={t.otaUpdateApply}
          small
          fullWidth={false}
          onPress={() => Updates.reloadAsync()}
        />
      </View>
    </View>
  );
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
  otaBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.md },
  otaCard: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  otaText: { flex: 1 },
});
