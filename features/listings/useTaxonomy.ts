import { useEffect, useState } from 'react';
import { Category, City } from '@/types';
import { fetchCategories, fetchCities } from '@/services/api/listings';

let categoriesCache: Category[] | null = null;
let citiesCache: City[] | null = null;

/** Categories + cities, fetched once and cached for the session. */
export function useTaxonomy() {
  const [categories, setCategories] = useState<Category[]>(categoriesCache ?? []);
  const [cities, setCities] = useState<City[]>(citiesCache ?? []);
  const [loading, setLoading] = useState(!categoriesCache);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [cats, cts] = await Promise.all([
        categoriesCache ? Promise.resolve(categoriesCache) : fetchCategories(),
        citiesCache ? Promise.resolve(citiesCache) : fetchCities(),
      ]);
      categoriesCache = cats;
      citiesCache = cts;
      setCategories(cats);
      setCities(cts);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!categoriesCache || !citiesCache) void load();
  }, []);

  return { categories, cities, loading, error, reload: load };
}
