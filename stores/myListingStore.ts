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
 * auth + after any listing mutation (publish/archive/delete/create) + after a
 * booking is accepted/declined (calendar-day.tsx) so the badge stays truthful.
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
  /** The last refresh() FAILED — the values below are unknown, not "empty". */
  error: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Bumped by reset(). A refresh() captures it before awaiting and drops its result
 * if it changed meanwhile — otherwise a request that was still in flight when the
 * user logged out would land AFTER reset() and repopulate the store with the
 * PREVIOUS account's listing and badge count (which the next user then saw).
 */
let epoch = 0;

export const useMyListingStore = create<MyListingState>((set) => ({
  uuid: null,
  status: null,
  hasPublished: false,
  pendingBookings: 0,
  loaded: false,
  error: false,

  refresh: async () => {
    const mine = epoch;
    try {
      const res = await fetchMyListings();
      if (mine !== epoch) return; // logged out / switched account mid-flight
      const listing = res.items.find((i) => i.status !== 'deleted') ?? null;
      set({
        uuid: listing?.uuid ?? null,
        status: listing?.status ?? null,
        hasPublished: !!listing && listing.status !== 'draft' && listing.status !== 'deleted',
        pendingBookings: res.stats.pending_bookings ?? 0,
        loaded: true,
        error: false,
      });
    } catch {
      if (mine !== epoch) return;
      // Keep the last known values but RECORD the failure: marking a failed fetch as
      // a completed load made a transient network error look like "this user has no
      // listing", so a published provider got the publish-first gate and lost their
      // badge for the rest of the session, with no path back.
      set({ loaded: true, error: true });
    }
  },

  reset: () => {
    epoch += 1;
    set({
      uuid: null,
      status: null,
      hasPublished: false,
      pendingBookings: 0,
      loaded: false,
      error: false,
    });
  },
}));
