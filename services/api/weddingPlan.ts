import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';
import { WeddingPlan, WeddingPlanResponse, BookingHistoryEntry } from '@/types';

// ── Той-жоспарлау (wedding plan) — Bearer ─────────────────────────────────────

/** Plan data + per-category-slot booking cards + accepted total + cities. */
export function fetchWeddingPlan() {
  return apiGet<WeddingPlanResponse>(Endpoints.weddingPlan);
}

/** Save the whole plan (server rebuilds items from defaults — safe to send all). */
export function saveWeddingPlan(plan: WeddingPlan) {
  return apiPost<{ plan: WeddingPlan }>(Endpoints.weddingPlan, plan).then((d) => d.plan);
}

/** Change history of every booking the user is a party to (read-only diff). */
export function fetchBookingHistory() {
  return apiGet<{ entries: BookingHistoryEntry[] }>(Endpoints.bookingsHistory).then((d) => d.entries);
}
