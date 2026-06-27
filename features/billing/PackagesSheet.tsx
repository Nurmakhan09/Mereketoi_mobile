import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import { fetchPackages, BillingPackage, PaymentPurchaseType } from '@/services/api/billing';
import { runHalykCheckout } from '@/features/billing/checkout';
import { formatPrice } from '@/utils/format';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When set, listing_publish packages tie the invoice to this listing. */
  listingUuid?: string;
  /** Called after a payment is confirmed 'paid' (refresh the listing/UI). */
  onPaid?: () => void;
}

/**
 * Package picker + Halyk checkout for PROMOTE/BOOST of an active listing. Lists the
 * site's billing packages, creates a server-priced invoice, opens the returned
 * checkout_url in a browser, then polls the invoice until it is paid. Secrets never
 * reach the app — only the checkout_url. The caller (my-listings onPromote) renders
 * this ONLY on Android; iOS routes the user to the website. (Publishing a draft uses
 * the separate app/my/[uuid]/publish.tsx page, which runs in-app on both platforms.)
 */
export function PackagesSheet({ visible, onClose, listingUuid, onPaid }: Props) {
  const { t, locale } = useI18n();
  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setPackages(await fetchPackages(locale));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const onSelect = async (pkg: BillingPackage) => {
    setBusyId(pkg.id);
    try {
      const purchaseType = (pkg.package_type || 'package') as PaymentPurchaseType;
      setChecking(true);
      const result = await runHalykCheckout({
        purchaseType,
        packageId: pkg.id,
        listingUuid: purchaseType === 'listing_publish' ? listingUuid : undefined,
      });
      setChecking(false);

      if (result === 'paid') {
        onClose();
        onPaid?.();
        Alert.alert(t.appName, t.paymentSuccess);
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

  return (
    <Sheet visible={visible} onClose={onClose} title={t.packagesTitle}>
      {checking ? (
        <View style={styles.checking}>
          <ActivityIndicator color={Colors.primary} />
          <Text variant="small" color={Colors.textMuted} center style={styles.checkingTxt}>
            {t.paymentChecking}
          </Text>
        </View>
      ) : loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />
      ) : packages.length === 0 ? (
        <EmptyState icon="pricetags-outline" title={t.packagesEmpty} />
      ) : (
        <View>
          {packages.map((pkg) => (
            <View key={pkg.id} style={styles.pkg}>
              <View style={styles.pkgHead}>
                <Text variant="h3" color={Colors.text} style={styles.pkgName}>{pkg.name}</Text>
                <Text variant="h3" color={Colors.primary}>
                  {formatPrice(pkg.price, 'fixed', { negotiable: '', notSpecified: '', tenge: t.tenge })}
                </Text>
              </View>
              {pkg.description ? (
                <Text variant="small" color={Colors.textMuted} style={styles.pkgDesc}>{pkg.description}</Text>
              ) : null}
              {pkg.duration_days ? (
                <Text variant="xsmall" color={Colors.textFaint}>{pkg.duration_days} {t.daysShort}</Text>
              ) : null}
              <Button
                title={t.packagesPay}
                small
                loading={busyId === pkg.id}
                disabled={busyId !== null}
                onPress={() => onSelect(pkg)}
                style={styles.pkgBtn}
              />
            </View>
          ))}
          <Text variant="xsmall" color={Colors.textFaint} center style={styles.note}>{t.paymentSecureNote}</Text>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  checking: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  checkingTxt: { marginTop: Spacing.md },
  pkg: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  pkgHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkgName: { flex: 1, marginRight: Spacing.sm },
  pkgDesc: { marginTop: Spacing.xs },
  pkgBtn: { marginTop: Spacing.md },
  note: { marginTop: Spacing.sm },
});
