import { useLocaleStore, Locale } from '@/stores/localeStore';
import kk, { Strings } from './kk';
import ru from './ru';

const dictionaries: Record<Locale, Strings> = { kk, ru };

/** Pick a localized field from a {name_kk, name_ru} backend object. */
export function localized<T extends Record<string, any>>(
  obj: T | null | undefined,
  base: string,
  locale: Locale,
): string {
  if (!obj) return '';
  return (obj[`${base}_${locale}`] as string) ?? (obj[`${base}_kk`] as string) ?? '';
}

/** Hook: returns the current strings + locale + setter. Re-renders on switch. */
export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  return { t: dictionaries[locale], locale, setLocale };
}

export type { Strings };
export { kk, ru };
