export * from './api';
export * from './user';
export * from './listing';
export * from './notification';
export * from './booking';

/** CMS page (master-spec §5.6). */
export interface CmsPage {
  slug: string;
  title_kk: string;
  title_ru: string;
  content_kk: string;
  content_ru: string;
  /** 'help' → content is structured JSON ({guide,faq}); otherwise HTML/prose. */
  content_type?: string;
}
