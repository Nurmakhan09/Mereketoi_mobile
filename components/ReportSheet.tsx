import { useState } from 'react';
import { TextInput, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/locales';
import { ReportReason } from '@/types';

const REASONS: ReportReason[] = ['spam', 'fake', 'inappropriate', 'wrong_info', 'other'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, comment: string) => Promise<void>;
}

export function ReportSheet({ visible, onClose, onSubmit }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const labels: Record<ReportReason, string> = {
    spam: t.reportSpam,
    fake: t.reportFake,
    inappropriate: t.reportInappropriate,
    wrong_info: t.reportWrongInfo,
    other: t.reportOther,
  };

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(reason, comment.trim());
      setComment('');
      setReason('spam');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t.reportTitle}>
      <Text variant="small" color={Colors.textMuted} style={styles.label}>
        {t.reportReason}
      </Text>
      {REASONS.map((r) => (
        <Pressable key={r} style={styles.option} onPress={() => setReason(r)}>
          <Ionicons
            name={reason === r ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={reason === r ? Colors.primary : Colors.textFaint}
          />
          <Text variant="body" color={Colors.textBody} style={styles.optionLabel}>
            {labels[r]}
          </Text>
        </Pressable>
      ))}
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t.reportComment}
        placeholderTextColor={Colors.textFaint}
        multiline
        maxLength={500}
        style={styles.input}
      />
      <Button title={t.send} loading={busy} onPress={submit} style={styles.submit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: Spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  optionLabel: { marginLeft: Spacing.sm },
  input: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    color: Colors.textBody,
    fontSize: 15,
  },
  submit: { marginTop: Spacing.base },
});
