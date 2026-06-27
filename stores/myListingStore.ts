/**
 * One-listing model state (zustand). The website caps each user to ONE listing.
 * `hasPublished` (a listing exists AND is past draft) drives the calendar SCREEN's
 * publish-first gate (calendar.tsx) — it does NOT change the bottom bar, which is a
 * FIXED 5-item bar (Басты бет · Іздеу · ＋Жариялау · Күнтізбе · Профиль) that never
 * varies by auth/published state (see app/(tabs)/_layout.tsx, mirroring the web's
 * app/Views/partials/bottom_nav.php). `pendingBookings` feeds the red pending-той-
 * booking badge on the Calendar tab.
 *
 * Resolved from GET /my/listings (the single non-deleted listing). Refreshed on
 * auth + after any listing mutation (publish/archive/delete/create).
 */

import { create } from 'zustand';
import { fetchMyListings } from '@/services/api/listings';
import { ListingStatus } from '@/types';

interface MyListingState {
  uuid: string | null;
  status: ListingStatus | null;
  /** A listing exists AND is past draft (active/expired/archived/blocked). */
  hasPublished: boolean;
  /** Pending той requests addressed to this provider → calendar badge. */
  pendingBookings: number;
  loaded: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const useMyListingStore = create<MyListingState>((set) => ({
  uuid: null,
  status: null,
  hasPublished: false,
  pendingBookings: 0,
  loaded: false,

  refresh: async () => {
    try {
      const res = await fetchMyListings();
      const listing = res.items.find((i) => i.status !== 'deleted') ?? null;
      set({
        uuid: listing?.uuid ?? null,
        status: listing?.status ?? null,
        hasPublished: !!listing && listing.status !== 'draft' && listing.status !== 'deleted',
        pendingBookings: res.stats.pending_bookings ?? 0,
        loaded: true,
      });
    } catch {
      // Best-effort: keep the last known value, just mark we tried.
      set({ loaded: true });
    }
  },

  reset: () => set({ uuid: null, status: null, hasPublished: false, pendingBookings: 0, loaded: false }),
}));
