import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SimpleHtml } from '@/components/SimpleHtml';
import { Loading, ErrorState } from '@/components/ui/StateViews';
import { Colors, Spacing } from '@/constants/theme';
import { useI18n, localized } from '@/locales';
import { fetchPage } from '@/services/api/pages';
import { CmsPage } from '@/types';
import { WEB_URL } from '@/constants/config';

/**
 * CMS page. `help` is a real WebView onto the public site (owner request
 * 2026-07-19: content there — including photos/videos — updates instantly,
 * no app-store release needed). Everything else (about/terms/privacy/…) stays
 * the lightweight native prose renderer — plain legal text gains nothing from
 * a network-dependent WebView.
 */
export default function CmsPageScreen() {
  const { slug, anchor } = useLocalSearchParams<{ slug: string; anchor?: string }>();
  const { t, locale } = useI18n();
  const navigation = useNavigation();

  if (slug === 'help') {
    return <HelpWebView anchor={anchor} />;
  }

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

  return (
    <Screen scroll padded>
      <Text variant="h1" color={Colors.text} style={styles.title}>
        {title}
      </Text>
      <SimpleHtml html={content} />
    </Screen>
  );
}

function HelpWebView({ anchor }: { anchor?: string }) {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const [error, setError] = useState(false);
  const url = `${WEB_URL}/${locale === 'ru' ? 'ru/' : ''}help?embed=1${anchor ? `#guide-${anchor}` : ''}`;

  useEffect(() => {
    navigation.setOptions({ title: t.menuHelp });
  }, [navigation, t.menuHelp]);

  if (error) {
    return (
      <Screen>
        <ErrorState message={t.errorNetwork} retryLabel={t.retry} onRetry={() => setError(false)} />
      </Screen>
    );
  }

  return (
    <Screen tabBarAware={false}>
      <WebView
        key={url}
        source={{ uri: url }}
        style={styles.fill}
        startInLoadingState
        renderLoading={() => <Loading />}
        onError={() => setError(true)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: Spacing.base },
  fill: { flex: 1 },
});
