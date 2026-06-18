import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';

/**
 * Billing — packages + Halyk payments, consuming the site's /api/v1 billing API.
 *
 * The backend is the single source of truth: amount/duration ALWAYS come from the
 * DB (client values are ignored), secrets stay server-side, and the app only ever
 * receives a `checkout_url`. Flow: createHalykPayment → open checkout_url in a
 * browser → Halyk posts to the server callback (activates) → the app polls
 * fetchPaymentStatus until 'paid'.
 *
 * Платформа: payments are wired on Android only (App Store IAP policy) — the caller
 * gates by Platform.OS; iOS points the user to the website.
 */

export type PackageType =
  | 'listing_publish'
  | 'listing_boost'
  | 'featured_listing'
  | 'plan'
  | 'credit_pack';

export interface BillingPackage {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  package_type: PackageType | string;
  price: number;
  currency: string;
  duration_days: number | null;
}

export type PaymentPurchaseType =
  | 'package'
  | 'listing_publish'
  | 'listing_boost'
  | 'featured_listing'
  | 'plan'
  | 'credit_pack';

export interface PaymentCreateResult {
  invoice_id: string;
  amount: number;
  currency: string;
  checkout_url: string;
}

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | string;

export interface PaymentStatus {
  invoice_id: string;
  purchase_type: string;
  item_name: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  is_test: boolean;
  paid_at: string | null;
  activated_at: string | null;
  created_at: string | null;
}

/** Public package catalogue (localized server-side via ?lang). */
export function fetchPackages(lang: 'kk' | 'ru') {
  return apiGet<BillingPackage[]>(Endpoints.billingPackages, { params: { lang } });
}

/**
 * Create a Halyk invoice. The server prices it from the DB by package_id /
 * purchase_type — never trust a client amount. Returns the checkout_url to open.
 */
export function createHalykPayment(body: {
  purchase_type: PaymentPurchaseType;
  package_id?: number;
  plan_id?: number;
  listing_uuid?: string;
}) {
  return apiPost<PaymentCreateResult>(Endpoints.paymentCreate, body);
}

/** Poll one invoice's status (own invoices only — server enforces). */
export function fetchPaymentStatus(invoiceId: string) {
  return apiGet<PaymentStatus>(Endpoints.paymentStatus(invoiceId));
}

/** Own payment history (newest first). */
export function fetchPayments(params: { limit?: number; offset?: number } = {}) {
  return apiGet<PaymentStatus[]>(Endpoints.payments, { params });
}
