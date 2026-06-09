import { useState } from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './Sheet';
import { Field } from './FormField';
import { Text } from './Text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface Props {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder: string;
  value?: string | number | null;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  disabled?: boolean;
}

/** Labeled select that opens a bottom-sheet list. */
export function SelectField({
  label,
  hint,
  error,
  required,
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.control, error ? styles.errorBorder : null, disabled && styles.disabled]}
      >
        <Text variant="body" color={selected ? Colors.textBody : Colors.textFaint} numberOfLines={1} style={styles.flex}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <ScrollView style={styles.list}>
          {options.map((opt) => (
            <Pressable
              key={String(opt.value)}
              style={styles.option}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <Text variant="body" color={opt.value === value ? Colors.primary : Colors.textBody} style={styles.flex}>
                {opt.label}
              </Text>
              {opt.value === value ? <Ionicons name="checkmark" size={20} color={Colors.primary} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </Field>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  errorBorder: { borderColor: Colors.error },
  disabled: { opacity: 0.5 },
  flex: { flex: 1 },
  list: { maxHeight: 360 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
  },
});
