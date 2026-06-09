/**
 * Booking + той-plan shapes — mirror the backend WeddingPlanApiController /
 * BookingApiController payloads (/api/v1/my/wedding-plan, /api/v1/bookings, …).
 *
 * Phone boundary: a `contact.phone` is only ever present on an ACCEPTED client
 * card or the PROVIDER day view — never on a public payload (the invite preview
 * carries a listing summary only).
 */

// ── Той-жоспарлау (wedding plan) ──────────────────────────────────────────

export interface WeddingPlanMeta {
  date: string;
  time: string;
  city_id: number;
  guests: number;
  budget: number;
}

export interface WeddingPlanItem {
  key: string;
  done: boolean;
  note: string;
  price: number;
  time: string;
  phone: string;
  category_slug: string;
}

export interface WeddingPlanCustomItem {
  title: string;
  done: boolean;
  note: string;
}

export interface WeddingPlan {
  meta: WeddingPlanMeta;
  items: WeddingPlanItem[];
  custom_items: WeddingPlanCustomItem[];
}

// ── Booking ────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface BookingContact {
  name: string;
  phone: string;
  profile: string | null;
}

export interface PendingChange {
  date: string;
  price: number | null;
  paid: number | null;
  time: string;
  address: string;
  requested_by: 'client' | 'provider';
}

export interface BookingListingRef {
  uuid: string;
  title: string;
  url: string;
}

/** A live booking attached to a wedding-plan category slot (client side). */
export interface BookingCard {
  id: number;
  status: BookingStatus;
  date: string;
  price: number | null;
  paid: number | null;
  time: string;
  address: string;
  listing: BookingListingRef | null;
  contact: BookingContact | null; // provider contact — accepted only
  pending: PendingChange | null;
}

export interface WeddingPlanResponse {
  plan: WeddingPlan;
  bookings: Record<string, BookingCard>; // category_slug → card
  accepted_total: number;
  cities: { id: number; name_kk: string; name_ru: string }[];
}

// ── Provider day view ────────────────────────────────────────────────────

export interface ProviderDayBooking {
  id: number;
  status: BookingStatus;
  price: number | null;
  paid: number | null;
  time: string;
  address: string;
  note: string;
  category: string;
  contact: BookingContact; // requester contact (owner-only)
  pending: PendingChange | null;
}

export interface ProviderInvite {
  id: number;
  price: number | null;
  time: string;
}

export interface ProviderDay {
  date: string;
  is_past: boolean;
  bookings: ProviderDayBooking[];
  invites: ProviderInvite[];
  invite_category_slug: string;
}

// ── Invites ────────────────────────────────────────────────────────────────

export type InviteState = 'valid' | 'alreadyUsed' | 'expired' | 'notFound';

export interface InvitePreview {
  token: string;
  state: InviteState;
  date: string;
  price: number | null;
  hall_id: number;
  category_label: string;
  listing: BookingListingRef | null; // summary only — never a phone
}

export interface InviteAcceptResult {
  category_slug: string;
  step: number;
}

// ── History ────────────────────────────────────────────────────────────────

export interface BookingHistoryEntry {
  action: string;
  actor_role: string;
  actor_name: string;
  booking_id: number;
  old: Record<string, unknown> | null;
  new: Record<string, unknown> | null;
  reason: string;
  created_at: string;
}

// ── Request bodies ───────────────────────────────────────────────────────

export interface BookingRequestInput {
  listing_uuid: string;
  category_slug: string;
  date: string;
  phone: string;
  price?: number | null;
  time?: string | null;
  note?: string | null;
  hall_id?: number | null;
}

export interface ChangeInput {
  date?: string;
  price?: number;
  paid?: number;
  time?: string;
  address?: string;
}

export interface CreateInviteInput {
  date: string;
  hall_id?: number;
  price?: number | null;
  time?: string | null;
  category_slug?: string | null;
}
