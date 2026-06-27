import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/authStore';
import { useMyListingStore } from '@/stores/myListingStore';
import { fetchPackages, BillingPackage } from '@/services/api/billing';
import { runHalykCheckout } from '@/features/billing/checkout';
import { formatPrice } from '@/utils/format';

/**
 * Listing payment page (web parity: /app/listings/{uuid}/publish). Going live is a
 * PAID action — the user picks one admin-managed package (price + duration come
 * straight from GET /api/v1/billing/packages, edited at /admin/packages) and pays via
 * Halyk. The benefit applies only after the server confirms payment (Halyk callback),
 * priced ALWAYS server-side from package_id — the app only sends the choice.
 *
 * Two modes via the `mode` param (the SAME listing_publish packages back both):
 *   - default / 'publish' → purchase_type 'listing_publish' (DRAFT listing → active).
 *   - 'renew'            → purchase_type 'listing_renew'  (ACTIVE/EXPIRED → extend).
 * The backend chokepoint (InvoiceService::createInvoice) enforces the listing status
 * per type, so a wrong-status charge is rejected before any money moves.
 *
 * Per owner decision (2026-06-27): both Android AND iOS open the Halyk checkout in the
 * in-app browser (no website redirect); every publish/renew requires a package.
 */
export default function PublishPaymentScreen() {
  const { uuid, mode } = useLocalSearchParams<{ uuid: string; mode?: string }>();
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const refreshMine = useMyListingStore((s) => s.refresh);

  const isRenew = mode === 'renew';
  const title = isRenew ? t.renewPayTitle : t.publishPayTitle;
  const intro = isRenew ? t.renewPayIntro : t.publishPayIntro;

  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const all = await fetchPackages(locale);
      // Only packages that publish a listing (web showPublish filters the same way).
      setPackages(all.filter((p) => p.package_type === 'listing_publish'));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPay = async (pkg: BillingPackage) => {
    setBusyId(pkg.id);
    setChecking(true);
    try {
      const result = await runHalykCheckout({
        purchaseType: isRenew ? 'listing_renew' : 'listing_publish',
        packageId: pkg.id,
        listingUuid: uuid,
      });
      setChecking(false);

      if (result === 'paid') {
        await refreshMine(); // keep the nav (calendar tab + badge) in sync
        await refreshUser(); // first publish upgrades the role to provider
        Alert.alert(t.appName, isRenew ? t.listingRenewed : t.published);
        router.replace('/my-listings');
      } else if (result === 'failed') {
        Alert.alert(t.error, t.paymentFailed);
      } else {
        Alert.alert(t.appName, t.paymentPending);
      }
    } catch (e: any) {
      setChecking(false);
      Alert.alert(t.error, e?.message ?? t.errorNetwork);
    } finally {
      setBusyId(null);
    }
  };

  if (checking) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
          <Text variant="small" color={Colors.textMuted} center style={styles.checkingTxt}>
            {t.paymentChecking}
          </Text>
        </View>
      </Screen>
    );
  }
  if (loading) return <Loading />;
  if (error) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  return (
    <Screen scroll padded>
      <Text variant="small" color={Colors.textMuted} style={styles.intro}>{intro}</Text>

      {packages.length === 0 ? (
        <EmptyState icon="pricetags-outline" title={t.packagesEmpty} />
      ) : (
        <View style={styles.list}>
          {packages.map((pkg) => (
            <View key={pkg.id} style={styles.pkg}>
              <View style={styles.pkgHead}>
                <Text variant="h3" color={Colors.text} style={styles.pkgName}>{pkg.name}</Text>
                <Text variant="h3" color={Colors.primary}>
                  {formatPrice(pkg.price, 'fixed', { negotiable: '', notSpecified: '', tenge: t.tenge })}
                </Text>
              </View>
              {pkg.duration_days ? (
                <View style={styles.durationRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.textFaint} />
                  <Text variant="xsmall" color={Colors.textFaint} style={styles.durationTxt}>
                    {pkg.duration_days} {t.daysShort}
                  </Text>
                </View>
              ) : null}
              {pkg.description ? (
                <Text variant="small" color={Colors.textMuted} style={styles.pkgDesc}>{pkg.description}</Text>
              ) : null}
              <Button
                title={t.packagesPay}
                icon="card-outline"
                loading={busyId === pkg.id}
                disabled={busyId !== null}
                onPress={() => onPay(pkg)}
                style={styles.pkgBtn}
              />
            </View>
          ))}
          <Text variant="xsmall" color={Colors.textFaint} center style={styles.note}>{t.paymentSecureNote}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  checkingTxt: { marginTop: Spacing.md },
  intro: { marginBottom: Spacing.lg },
  list: {},
  pkg: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  pkgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkgName: { flex: 1, marginRight: Spacing.sm },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 },
  durationTxt: {},
  pkgDesc: { marginTop: Spacing.xs },
  pkgBtn: { marginTop: Spacing.md },
  note: { marginTop: Spacing.sm },
});
