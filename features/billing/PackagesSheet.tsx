import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Loading, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';
import {
  fetchPackages,
  createHalykPayment,
  fetchPaymentStatus,
  BillingPackage,
  PaymentPurchaseType,
} from '@/services/api/billing';
import { formatPrice } from '@/utils/format';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When set, listing_publish packages tie the invoice to this listing. */
  listingUuid?: string;
  /** Called after a payment is confirmed 'paid' (refresh the listing/UI). */
  onPaid?: () => void;
}

/**
 * Package picker + Halyk checkout (Android). Lists the site's billing packages,
 * creates a server-priced invoice, opens the returned checkout_url in a browser,
 * then polls the invoice until it is paid. Secrets never reach the app — only the
 * checkout_url. The caller renders this ONLY on Android (App Store IAP policy);
 * iOS routes the user to the website instead.
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

  // Poll the invoice for up to ~40s after the browser closes (the server activates
  // on Halyk's callback, which can land a moment after the user returns).
  const pollStatus = useCallback(async (invoiceId: string): Promise<'paid' | 'failed' | 'pending'> => {
    for (let i = 0; i < 20; i++) {
      try {
        const s = await fetchPaymentStatus(invoiceId);
        if (s.status === 'paid') return 'paid';
        if (s.status === 'failed' || s.status === 'cancelled') return 'failed';
      } catch {
        // transient — keep polling
      }
      await sleep(2000);
    }
    return 'pending';
  }, []);

  const onSelect = async (pkg: BillingPackage) => {
    setBusyId(pkg.id);
    try {
      const purchaseType = (pkg.package_type || 'package') as PaymentPurchaseType;
      const res = await createHalykPayment({
        purchase_type: purchaseType,
        package_id: pkg.id,
        listing_uuid: purchaseType === 'listing_publish' ? listingUuid : undefined,
      });

      // Open the Halyk checkout; resolves when the user returns to the app.
      await WebBrowser.openBrowserAsync(res.checkout_url);

      setChecking(true);
      const result = await pollStatus(res.invoice_id);
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
