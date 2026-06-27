import * as WebBrowser from 'expo-web-browser';
import {
  createHalykPayment,
  fetchPaymentStatus,
  PaymentPurchaseType,
} from '@/services/api/billing';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type CheckoutResult = 'paid' | 'failed' | 'pending';

/**
 * Run one Halyk checkout end-to-end and report the outcome. Shared by the
 * publish payment page (app/my/[uuid]/publish.tsx) and the promote/boost sheet
 * (PackagesSheet) so the flow lives in one place:
 *   1. createHalykPayment — the SERVER prices it from the DB by package_id /
 *      purchase_type (client amount is never trusted) and returns a checkout_url.
 *   2. open that url in the in-app browser; resolves when the user returns.
 *   3. poll the invoice for ~40s (the server activates on Halyk's callback, which
 *      can land a moment after the browser closes).
 *
 * Throws on a create/network error (the caller surfaces it); a non-'paid' return
 * is a normal terminal/timeout state, not an error.
 */
export async function runHalykCheckout(params: {
  purchaseType: PaymentPurchaseType;
  packageId: number;
  /** Required for 'listing_publish' — ties the invoice to the listing being published. */
  listingUuid?: string;
}): Promise<CheckoutResult> {
  const res = await createHalykPayment({
    purchase_type: params.purchaseType,
    package_id: params.packageId,
    listing_uuid: params.purchaseType === 'listing_publish' ? params.listingUuid : undefined,
  });

  await WebBrowser.openBrowserAsync(res.checkout_url);

  for (let i = 0; i < 20; i++) {
    try {
      const s = await fetchPaymentStatus(res.invoice_id);
      if (s.status === 'paid') return 'paid';
      if (s.status === 'failed' || s.status === 'cancelled') return 'failed';
    } catch {
      // transient — keep polling
    }
    await sleep(2000);
  }
  return 'pending';
}
