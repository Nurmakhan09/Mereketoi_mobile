import { PriceType } from '@/types';

/** Format a KZ phone for display: +7 700 000 00 00. Input may be raw digits or +7…. */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  // Normalise 8XXXXXXXXXX → 7XXXXXXXXXX, keep 11-digit 7… numbers.
  let d = digits;
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  if (d.length !== 11 || !d.startsWith('7')) return raw;
  const p = d.slice(1);
  return `+7 ${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8, 10)}`;
}

/** Format a price amount with thousands separators + ₸. */
export function formatPrice(
  amount: number | null | undefined,
  priceType: PriceType,
  labels: { negotiable: string; notSpecified: string; tenge: string },
): string {
  if (priceType === 'negotiable') return labels.negotiable;
  if (priceType === 'not_specified' || amount == null) return labels.notSpecified;
  return `${amount.toLocaleString('ru-RU')} ${labels.tenge}`;
}

/**
 * Live phone formatter for text input: as the user types digits, format toward
 * +7 700 000 00 00. Keeps a leading +7 and groups the 10 national digits.
 * Returns the formatted string to set back into the field.
 */
export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  // Normalise a leading 8 or 7 country code to a single 7.
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11); // 7 + 10 national digits
  const n = digits.slice(1); // national part
  let out = '+7';
  if (n.length > 0) out += ' ' + n.slice(0, 3);
  if (n.length > 3) out += ' ' + n.slice(3, 6);
  if (n.length > 6) out += ' ' + n.slice(6, 8);
  if (n.length > 8) out += ' ' + n.slice(8, 10);
  return out;
}

/** Short date for cards: "2026-06-30 10:00:00" → "30.06.2026". */
export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const datePart = iso.split(' ')[0].split('T')[0];
  const [y, m, day] = datePart.split('-');
  if (!y || !m || !day) return iso;
  return `${day}.${m}.${y}`;
}
