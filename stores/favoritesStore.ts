/**
 * Tracks which listing uuids are favorited (by the current user) so the heart
 * renders correctly across cards/detail. Source of truth is the server; this is
 * an in-memory mirror seeded from GET /my/favorites and updated on toggle.
 */

import { create } from 'zustand';
import { toggleFavorite as apiToggle } from '@/services/api/listings';

interface FavoritesState {
  ids: Set<string>;
  setAll: (uuids: string[]) => void;
  isFavorited: (uuid: string) => boolean;
  /** Optimistic toggle; reverts on error. Returns the new state. */
  toggle: (uuid: string) => Promise<boolean>;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),

  setAll: (uuids) => set({ ids: new Set(uuids) }),

  isFavorited: (uuid) => get().ids.has(uuid),

  toggle: async (uuid) => {
    const had = get().ids.has(uuid);
    // optimistic
    set((s) => {
      const next = new Set(s.ids);
      if (had) next.delete(uuid);
      else next.add(uuid);
      return { ids: next };
    });
    try {
      const favorited = await apiToggle(uuid);
      set((s) => {
        const next = new Set(s.ids);
        if (favorited) next.add(uuid);
        else next.delete(uuid);
        return { ids: next };
      });
      return favorited;
    } catch (e) {
      // revert
      set((s) => {
        const next = new Set(s.ids);
        if (had) next.add(uuid);
        else next.delete(uuid);
        return { ids: next };
      });
      throw e;
    }
  },

  clear: () => set({ ids: new Set() }),
}));
