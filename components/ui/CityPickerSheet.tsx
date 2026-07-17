import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Spacing, Radius } from '@/constants/theme';
import { Text } from './Text';
import { Sheet } from './Sheet';
import { useI18n } from '@/locales';

interface CityItem {
  slug: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: CityItem[];
  /** Selected city slug, or undefined for "all cities". */
  value?: string;
  /** Emits the picked slug, or undefined when cleared. */
  onSelect: (slug: string | undefined) => void;
}

/** A single tappable city row (selected → navy + checkmark). */
function Row({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text variant="body" color={selected ? Colors.primary : Colors.textBody} weight={selected ? '700' : '500'}>
        {label}
      </Text>
      {selected ? <Ionicons name="checkmark" size={20} color={Colors.primary} /> : null}
    </Pressable>
  );
}

/**
 * Searchable city picker in a bottom sheet — replaces the long horizontal pill row.
 * The list is filtered live by the search box; "all cities" clears the filter.
 */
export function CityPickerSheet({ visible, onClose, items, value, onSelect }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  // Reset the search each time the sheet closes.
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((c) => c.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const choose = (slug: string | undefined) => {
    onSelect(slug);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t.city}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchCity}
          placeholderTextColor={Colors.textFaint}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Ionicons name="close-circle" size={18} color={Colors.textFaint} onPress={() => setQuery('')} />
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.slug}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListHeaderComponent={<Row label={t.allCities} selected={!value} onPress={() => choose(undefined)} />}
        renderItem={({ item }) => (
          <Row label={item.name} selected={value === item.slug} onPress={() => choose(item.slug)} />
        )}
        ListEmptyComponent={
          <Text variant="small" color={Colors.textMuted} center style={styles.empty}>{t.noResults}</Text>
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    height: 44,
    marginBottom: Spacing.sm,
  },
  input: { flex: 1, color: Colors.textBody, fontSize: 15 },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowPressed: { opacity: 0.6 },
  empty: { paddingVertical: Spacing.xl },
});
