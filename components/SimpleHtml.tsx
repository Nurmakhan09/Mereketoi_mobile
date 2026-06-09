import { Fragment } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text } from './ui/Text';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Minimal HTML renderer for CMS pages (no WebView dependency). Handles the tags
 * the backend CMS emits: <h1..h3>, <p>, <ul>/<ol>/<li>, <a>, <br>, <strong>/<b>,
 * <em>/<i>. Unknown tags are flattened to their text. This is intentionally
 * lightweight — CMS content is mostly prose, not arbitrary markup.
 */

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li';
  text: string;
  links: { label: string; href: string }[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Extract links, then strip remaining inline tags to plain text. */
function inline(raw: string): { text: string; links: { label: string; href: string }[] } {
  const links: { label: string; href: string }[] = [];
  let s = raw.replace(/<a\s[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, (_, href, label) => {
    const clean = decodeEntities(label.replace(/<[^>]+>/g, '').trim());
    links.push({ label: clean, href });
    return clean;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  return { text: decodeEntities(s).replace(/[ \t]+/g, ' ').trim(), links };
}

function parse(html: string): Block[] {
  const blocks: Block[] = [];
  // Pull out block-level chunks in document order.
  const re = /<(h1|h2|h3|p|li)\b[^>]*>(.*?)<\/\1>/gis;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const { text, links } = inline(m[2]);
    if (text) blocks.push({ type: m[1].toLowerCase() as Block['type'], text, links });
  }
  // Fallback: if no block tags matched, show the whole thing as one paragraph.
  if (!blocks.length) {
    const { text, links } = inline(html);
    if (text) blocks.push({ type: 'p', text, links });
  }
  return blocks;
}

export function SimpleHtml({ html }: { html: string }) {
  const blocks = parse(html);
  return (
    <View>
      {blocks.map((b, i) => {
        const variant = b.type === 'h1' ? 'h2' : b.type === 'h2' ? 'h3' : b.type === 'h3' ? 'h3' : 'body';
        const isHeading = b.type.startsWith('h');
        return (
          <View key={i} style={b.type === 'li' ? styles.li : styles.block}>
            {b.type === 'li' ? <Text color={Colors.primary} style={styles.bullet}>•</Text> : null}
            <Text
              variant={variant}
              color={isHeading ? Colors.text : Colors.textBody}
              style={styles.flex}
            >
              {renderWithLinks(b)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Re-insert tappable links into the block text by splitting on each label. */
function renderWithLinks(b: Block) {
  if (!b.links.length) return b.text;
  const parts: (string | { label: string; href: string })[] = [b.text];
  for (const link of b.links) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === 'string' && part.includes(link.label)) {
        const [before, ...rest] = part.split(link.label);
        const after = rest.join(link.label);
        parts.splice(i, 1, before, link, after);
        break;
      }
    }
  }
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <Fragment key={i}>{p}</Fragment>
    ) : (
      <Text key={i} color={Colors.primary} onPress={() => Linking.openURL(p.href).catch(() => {})}>
        {p.label}
      </Text>
    ),
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: Spacing.md },
  li: { flexDirection: 'row', marginBottom: Spacing.sm, paddingLeft: Spacing.sm },
  bullet: { marginRight: Spacing.sm },
  flex: { flex: 1 },
});
