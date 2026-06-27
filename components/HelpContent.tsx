import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useI18n } from '@/locales';

/**
 * Native renderer for the Help-center page. The CMS stores help as JSON, not HTML:
 *   { "guide": [{ key, title, steps: [] }], "faq": [{ cat, items: [{ q, a }] }] }
 * Legacy form — a bare FAQ array [{ cat, items }] — is also accepted (mirrors the web help.php).
 * Renders numbered guide cards + a searchable, collapsible FAQ accordion.
 */

interface GuideItem { key?: string; title?: string; steps?: string[] }
interface FaqItem { q?: string; a?: string }
interface FaqGroup { cat?: string; items?: FaqItem[] }

// Guide key → Ionicon (admins write only a `key` in the JSON, never markup).
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  register: 'person-add-outline',
  listing: 'document-text-outline',
  calendar: 'calendar-outline',
  notifications: 'notifications-outline',
  toi: 'sparkles-outline',
  payment: 'card-outline',
  default: 'information-circle-outline',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function parse(raw: string): { guide: GuideItem[]; faq: FaqGroup[] } {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { guide: [], faq: [] }; }
  // Legacy: a bare array of FAQ groups.
  if (Array.isArray(data)) return { guide: [], faq: data as FaqGroup[] };
  const obj = (data ?? {}) as { guide?: GuideItem[]; faq?: FaqGroup[] };
  return { guide: obj.guide ?? [], faq: obj.faq ?? [] };
}

export function HelpContent({ json }: { json: string }) {
  const { t } = useI18n();
  const { guide, faq } = useMemo(() => parse(json), [json]);
  const [query, setQuery] = useState('');

  // Filter FAQ by the search query (question OR answer), dropping emptied groups.
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return faq;
    return faq
      .map((g) => ({
        ...g,
        items: (g.items ?? []).filter(
          (it) => (it.q ?? '').toLowerCase().includes(q) || (it.a ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => (g.items ?? []).length > 0);
  }, [faq, q]);

  return (
    <View>
      {/* Guide cards */}
      {guide.length > 0 ? (
        <View style={styles.section}>
          <Text variant="h3" color={Colors.text} style={styles.sectionTitle}>{t.helpGuideTitle}</Text>
          {guide.map((g, i) => (
            <Card key={i} padded style={styles.guideCard}>
              <View style={styles.guideHead}>
                <View style={styles.guideIco}>
                  <Ionicons name={ICONS[g.key ?? 'default'] ?? ICONS.default} size={20} color={Colors.primary} />
                </View>
                <Text variant="body" color={Colors.text} style={styles.guideTitle}>{g.title ?? ''}</Text>
              </View>
              <View style={styles.steps}>
                {(g.steps ?? []).map((step, si) => (
                  <View key={si} style={styles.stepRow}>
                    <View style={styles.stepNum}><Text variant="xsmall" color={Colors.white} style={styles.stepNumTxt}>{si + 1}</Text></View>
                    <Text variant="small" color={Colors.textBody} style={styles.stepTxt}>{step}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {/* FAQ accordion */}
      {faq.length > 0 ? (
        <View style={styles.section}>
          <Text variant="h3" color={Colors.text} style={styles.sectionTitle}>{t.helpFaqTitle}</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t.helpSearchPlaceholder}
              placeholderTextColor={Colors.textFaint}
              style={styles.searchInput}
            />
            {query ? <Ionicons name="close-circle" size={18} color={Colors.textFaint} onPress={() => setQuery('')} /> : null}
          </View>

          {filtered.length === 0 ? (
            <Text variant="small" color={Colors.textMuted} center style={styles.noResults}>{t.helpNoResults}</Text>
          ) : (
            filtered.map((g, gi) => (
              <View key={gi} style={styles.faqGroup}>
                {g.cat ? <Text variant="small" color={Colors.text} style={styles.faqCat}>{g.cat}</Text> : null}
                {(g.items ?? []).map((it, ii) => (
                  <FaqRow key={`${gi}-${ii}`} q={it.q ?? ''} a={it.a ?? ''} defaultOpen={!!q} />
                ))}
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

/** One collapsible FAQ question. */
function FaqRow({ q, a, defaultOpen }: { q: string; a: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };
  return (
    <Pressable style={[styles.faqItem, open && styles.faqItemOpen]} onPress={toggle}>
      <View style={styles.faqQRow}>
        <Text variant="small" color={Colors.text} style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={open ? Colors.primary : Colors.textMuted} />
      </View>
      {open && a ? <Text variant="small" color={Colors.textMuted} style={styles.faqA}>{a}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.base },
  guideCard: { marginBottom: Spacing.md },
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  guideIco: {
    width: 38, height: 38, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  guideTitle: { flex: 1, fontWeight: '700' },
  steps: { gap: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumTxt: { fontWeight: '800', fontSize: 11, lineHeight: 14 },
  stepTxt: { flex: 1, lineHeight: 20 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, height: 46, marginBottom: Spacing.base,
  },
  searchInput: { flex: 1, color: Colors.textBody, fontSize: 15 },
  noResults: { paddingVertical: Spacing.lg },
  faqGroup: { marginBottom: Spacing.base },
  faqCat: { fontWeight: '700', marginBottom: Spacing.sm },
  faqItem: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  faqItemOpen: { borderColor: Colors.primary },
  faqQRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  faqQ: { flex: 1, fontWeight: '600' },
  faqA: { marginTop: Spacing.sm, lineHeight: 20 },
});
