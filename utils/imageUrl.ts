import { UPLOADS_BASE_URL } from '@/constants/config';

/**
 * Build a full image URL from a relative listing-image path
 * (e.g. "listings/123/abc.jpg" → "{WEB}/uploads/listings/123/abc.jpg").
 * Already-absolute URLs are returned unchanged. Null/empty → null.
 */
export function imageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${UPLOADS_BASE_URL}/${path.replace(/^\/+/, '')}`;
}
