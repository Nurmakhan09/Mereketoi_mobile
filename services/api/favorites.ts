import { apiGet } from './client';
import { Endpoints } from './endpoints';
import { ListingCard } from '@/types';

/** GET /my/favorites — saved listings (public card shape). */
export function fetchFavorites() {
  return apiGet<{ items: ListingCard[] }>(Endpoints.myFavorites).then((d) => d.items);
}

// Unfavorite uses the same toggle as the detail/card heart:
export { toggleFavorite } from './listings';
