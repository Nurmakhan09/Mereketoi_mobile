import { apiGet } from './client';
import { Endpoints } from './endpoints';
import { CmsPage } from '@/types';

/** GET /pages/{slug} — CMS page (about|help|privacy|terms|security|payments|contact). */
export function fetchPage(slug: string) {
  return apiGet<CmsPage>(Endpoints.pages(slug));
}
