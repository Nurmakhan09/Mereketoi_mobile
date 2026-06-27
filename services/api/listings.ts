import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';
import {
  Category,
  City,
  Region,
  District,
  ListingCard,
  ListingDetail,
  OwnerListing,
  OwnerListingDetail,
  OwnerStats,
  ListingFormData,
  CatalogFilters,
  Suggestion,
  PublicCalendar,
  OwnerCalendar,
  CalendarDay,
  ReportReason,
  PageMeta,
} from '@/types';

// ── Public reads ─────────────────────────────────────────────────────────────

export interface ListingsPage {
  items: ListingCard[];
  meta: PageMeta;
}

export function fetchListings(filters: CatalogFilters = {}) {
  const params: Record<string, string | number> = {};
  if (filters.q) params.q = filters.q;
  if (filters.city) params.city = filters.city;
  if (filters.category) params.category = filters.category;
  if (filters.price_type) params.price_type = filters.price_type;
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = filters.page;
  return apiGet<ListingsPage>(Endpoints.listings, { params });
}

export function suggestListings(q: string) {
  return apiGet<Suggestion[]>(Endpoints.listingsSuggest, { params: { q } });
}

export function fetchListing(uuid: string) {
  return apiGet<ListingDetail>(Endpoints.listing(uuid));
}

export function fetchPublicCalendar(uuid: string, month?: string, hall?: number) {
  const params: Record<string, string | number> = {};
  if (month) params.month = month;
  if (hall != null) params.hall = hall;
  return apiGet<PublicCalendar>(Endpoints.listingCalendar(uuid), { params });
}

export function fetchCategories() {
  return apiGet<Category[]>(Endpoints.categories);
}

export function fetchCities(regionId?: number) {
  const params = regionId ? { region_id: regionId } : undefined;
  return apiGet<City[]>(Endpoints.cities, { params });
}

export function fetchRegions() {
  return apiGet<Region[]>(Endpoints.regions);
}

export function fetchDistricts(params: { region_id?: number; city_id?: number }) {
  return apiGet<District[]>(Endpoints.districts, { params });
}

export function fetchPhone(uuid: string) {
  return apiPost<{ phone: string }>(Endpoints.listingPhone(uuid)).then((d) => d.phone);
}

// ── Favorite & report (Bearer) ───────────────────────────────────────────────

export function toggleFavorite(uuid: string) {
  return apiPost<{ favorited: boolean }>(Endpoints.listingFavorite(uuid)).then((d) => d.favorited);
}

export function reportListing(uuid: string, reason: ReportReason, comment?: string) {
  return apiPost<{ received: boolean }>(Endpoints.listingReport(uuid), { reason, comment });
}

// ── Cabinet — my listings (Bearer) ───────────────────────────────────────────

export interface MyListingsResponse {
  items: OwnerListing[];
  stats: OwnerStats;
}

export function fetchMyListings() {
  return apiGet<MyListingsResponse>(Endpoints.myListings);
}

/** Creates a blank draft (or with fields) → returns the new uuid. */
export function createListing(data: ListingFormData = {}) {
  return apiPost<{ uuid: string }>(Endpoints.myListings, data).then((d) => d.uuid);
}

export function fetchMyListing(uuid: string) {
  return apiGet<OwnerListingDetail>(Endpoints.myListing(uuid));
}

export function updateListing(uuid: string, data: ListingFormData) {
  return apiPost<{ uuid: string }>(Endpoints.myListing(uuid), data);
}

export function archiveListing(uuid: string) {
  return apiPost<{ uuid: string }>(Endpoints.myListingArchive(uuid));
}

export function unarchiveListing(uuid: string) {
  return apiPost<{ uuid: string }>(Endpoints.myListingUnarchive(uuid));
}

export function deleteListing(uuid: string) {
  return apiPost<{ uuid: string }>(Endpoints.myListingDelete(uuid));
}

export function deleteListingImage(uuid: string, id: number) {
  return apiPost<{ deleted: boolean }>(Endpoints.myListingImageDelete(uuid, id));
}

/** Reorder images; the first id becomes the cover (is_main). */
export function reorderListingImages(uuid: string, order: number[]) {
  return apiPost<{ reordered: boolean }>(Endpoints.myListingImagesReorder(uuid), { order });
}

/**
 * Upload one image (multipart, field `image`). On RN, pass the picked asset uri;
 * we build a FormData file part. ≤8MB, jpeg/png/webp, ≤10 per listing (backend enforced).
 */
export function uploadListingImage(uuid: string, asset: { uri: string; name?: string; type?: string }) {
  const form = new FormData();
  const name = asset.name ?? guessFileName(asset.uri);
  const type = asset.type ?? guessMime(name);
  // React Native FormData file part shape.
  form.append('image', { uri: asset.uri, name, type } as unknown as Blob);
  return apiPost<{ path: string }>(Endpoints.myListingImages(uuid), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

function guessFileName(uri: string): string {
  const last = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  return last.includes('.') ? last : `${last}.jpg`;
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// ── Owner calendar editor (Bearer) ───────────────────────────────────────────

export function fetchOwnerCalendar(uuid: string, month?: string, hall?: number) {
  const params: Record<string, string | number> = {};
  if (month) params.month = month;
  if (hall != null) params.hall = hall;
  return apiGet<OwnerCalendar>(Endpoints.myListingCalendar(uuid), { params });
}

export function upsertOwnerCalendarDay(
  uuid: string,
  input: { date: string; status: CalendarDay['status']; hall_id?: number; public_note?: string; private_note?: string },
) {
  return apiPost<{ hall: number; day: CalendarDay }>(Endpoints.myListingCalendar(uuid), input);
}
