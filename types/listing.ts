/**
 * Listing shapes — mirrored from ListingsApiController::publicShape() and
 * MyListingsApiController ownerShape() / full owner detail (master-spec §5.2, §5.5).
 *
 * Public/private boundary: public shapes NEVER carry contact_phone, contact_name,
 * full_description (in the LIST shape), or a raw integer id. Identify by uuid / public_code.
 */

export type PriceType = 'fixed' | 'negotiable' | 'not_specified';

/** 6 exhaustive statuses. `hidden` is forbidden; `pending_review` is not used. */
export type ListingStatus = 'draft' | 'active' | 'expired' | 'archived' | 'blocked' | 'deleted';

/** Today's availability badge value. */
export type TodayStatus = 'free' | 'booked' | 'unavailable';

export interface LocaleNamed {
  slug: string;
  name_kk: string;
  name_ru: string;
}

/** Public listing card (list shape). */
export interface ListingCard {
  uuid: string;
  public_code: string | null;
  url: string;
  title: string;
  short_description: string | null;
  price_amount: number | null;
  price_type: PriceType;
  main_image: string | null; // relative path → {WEB}/uploads/{path}
  published_at: string | null;
  expires_at: string | null;
  is_free: boolean; // promo flag (free_until window), NOT availability
  today_status: TodayStatus;
  district: LocaleNamed | null;
}

export interface ListingImage {
  path: string;
  is_main: boolean;
}

/** Public listing detail = card + these. full_description IS public on detail. */
export interface ListingDetail extends ListingCard {
  full_description: string;
  images: ListingImage[];
  category: LocaleNamed | null;
  city: LocaleNamed | null;
  halls?: { name: string }[];
}

/** Owner list row (ownerShape) — owners see `status`. */
export interface OwnerListing {
  uuid: string;
  public_code: string | null;
  title: string;
  short_description: string | null;
  status: ListingStatus;
  price_amount: number | null;
  price_type: PriceType;
  category_id: number | null;
  city_id: number | null;
  region_id: number | null;
  district_id: number | null;
  main_image: string | null;
  expires_at: string | null;
  created_at: string | null;
}

/** Owner full detail (GET /my/listings/{uuid}) = ownerShape + private fields. */
export interface OwnerListingDetail extends OwnerListing {
  full_description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  details: ListingDetails;
  images: { id: number; path: string; is_main: boolean }[];
}

/** Whitelisted extra details (master-spec §5.5). Only send what the category needs. */
export interface ListingDetails {
  capacity?: number;
  cars_count?: number;
  hall_type?: string;
  address?: string;
  gis_link?: string;
  portfolio_link?: string;
  instagram?: string;
  halls?: { name: string }[];
}

/** Create/update body (server whitelists; never send uuid/status/user_id/public_code). */
export interface ListingFormData {
  category_id?: number | null;
  city_id?: number | null;
  region_id?: number | null;
  district_id?: number | null;
  title?: string;
  short_description?: string;
  full_description?: string;
  price_amount?: number | null;
  price_type?: PriceType;
  contact_name?: string;
  contact_phone?: string;
  details?: ListingDetails;
}

export interface OwnerStats {
  total: number;
  active: number;
  draft: number;
  expired: number;
  // Hub-card metrics (GET /my/listings → data.stats; web↔app parity). views/favs are
  // for the user's single listing; pending_bookings is той requests to this provider.
  views: number;
  favs: number;
  pending_bookings: number;
  [key: string]: number;
}

// ── Taxonomy ──────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  slug: string;
  name_kk: string;
  name_ru: string;
  icon: string | null;
  description_kk?: string | null;
  description_ru?: string | null;
  children?: Category[];
}

export interface City {
  id: number;
  slug: string;
  name_kk: string;
  name_ru: string;
  region_kk?: string;
  region_ru?: string;
}

export interface Region {
  id: number;
  slug: string;
  name_kk: string;
  name_ru: string;
  is_city: boolean;
}

export interface District {
  id: number;
  slug: string;
  name_kk: string;
  name_ru: string;
}

// ── Calendar ────────────────────────────────────────────────────────────────

export type DayStatus = 'free' | 'booked' | 'unavailable';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  public_note?: string;
  private_note?: string;
}

/** Public read-only calendar (GET /listings/{uuid}/calendar). */
export interface PublicCalendar {
  month: string; // YYYY-MM
  hall?: number;
  prev_month: string | null;
  next_month: string | null;
  days: CalendarDay[];
}

/** Owner calendar editor (GET /my/listings/{uuid}/calendar) — adds halls + notes. */
export interface OwnerCalendar extends PublicCalendar {
  is_venue: boolean;
  halls: { name: string }[];
  /** date → 'pending' | 'accepted' той markers for the month (owner-only). */
  bookings?: Record<string, string>;
  /** date → live booking count for that day (number badge on the day). */
  booking_counts?: Record<string, number>;
  /** live booking totals in the adjacent months → red number on the prev/next nav. */
  adjacent_bookings?: { prev: number; next: number };
  /** total pending той requests for this provider (calendar badge). */
  pending_bookings?: number;
}

// ── Filters / catalog query ──────────────────────────────────────────────────

export type SortOption = 'newest' | 'oldest' | 'price_asc' | 'price_desc';

export interface CatalogFilters {
  q?: string;
  city?: string; // slug
  category?: string; // slug
  price_type?: PriceType;
  price_min?: number; // ₸ — backend filters price_amount >= when > 0
  price_max?: number; // ₸ — backend filters price_amount <= when > 0
  date?: string; // YYYY-MM-DD — availability filter (only listings free that day)
  sort?: SortOption;
  page?: number;
}

export interface Suggestion {
  title: string;
  url: string;
}

/** Report reasons (master-spec §5.4). */
export type ReportReason = 'spam' | 'fake' | 'inappropriate' | 'wrong_info' | 'other';
