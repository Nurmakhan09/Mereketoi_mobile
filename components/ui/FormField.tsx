import { ReactNode, useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Text } from './Text';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children?: ReactNode;
}

/** Wrapper: label (+required mark) → control → hint → error. */
export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="small" color={Colors.text} style={styles.label}>
        {label}
        {required ? <Text color={Colors.error}> *</Text> : null}
      </Text>
      {children}
      {hint && !error ? (
        <Text variant="xsmall" color={Colors.textMuted} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text variant="xsmall" color={Colors.error} style={styles.hint}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface InputProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  secure?: boolean;
  /** Show a "current/max" character counter (needs maxLength + value). */
  counter?: boolean;
}

/** Labeled text input with hint/error + optional password eye toggle + counter. */
export function FormField({ label, hint, error, required, secure, counter, style, ...rest }: InputProps) {
  const [hidden, setHidden] = useState(!!secure);
  const count = typeof rest.value === 'string' ? rest.value.length : 0;
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textFaint}
          secureTextEntry={hidden}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8} style={styles.eye}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {counter && rest.maxLength ? (
        <Text variant="xsmall" color={Colors.textFaint} style={styles.counter}>
          {count}/{rest.maxLength}
        </Text>
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.base },
  label: { marginBottom: Spacing.xs, fontFamily: Typography.small.fontFamily },
  hint: { marginTop: Spacing.xs },
  counter: { marginTop: Spacing.xs, textAlign: 'right' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  // Focus: navy border + soft navy halo (design prompt §3 Field).
  inputFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: { borderColor: Colors.error },
  input: {
    flex: 1,
    minHeight: 48,
    ...Typography.body,
    color: Colors.textBody,
    paddingVertical: Spacing.sm,
  },
  eye: { paddingLeft: Spacing.sm },
});
