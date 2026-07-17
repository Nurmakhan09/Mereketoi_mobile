import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SimpleHtml } from '@/components/SimpleHtml';
import { HelpContent } from '@/components/HelpContent';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { fetchPage } from '@/services/api/pages';
import { CmsPage } from '@/types';

/** CMS page — renders the active locale's HTML content natively (no WebView). */
export default function CmsPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, locale } = useI18n();
  const navigation = useNavigation();

  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const p = await fetchPage(slug);
      setPage(p);
      navigation.setOptions({ title: localized(p, 'title', locale) });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, navigation, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;
  if (error || !page) return <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={load} />;

  const content = localized(page, 'content', locale);
  const title = localized(page, 'title', locale);
  // The help page stores structured JSON (guide + FAQ), not HTML — render it natively.
  const isHelp = page.content_type === 'help' || page.slug === 'help';

  return (
    <Screen scroll padded>
      <Text variant="h1" color={Colors.text} style={styles.title}>
        {title}
      </Text>
      {isHelp ? <HelpContent json={content} /> : <SimpleHtml html={content} />}
    </Screen>
  );
}

const styles = { title: { marginBottom: Spacing.base } } as const;
