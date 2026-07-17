import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type Variant = keyof typeof Typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  weight?: TextStyle['fontWeight'];
}

/** Themed text using the Nunito type scale. */
export function Text({ variant = 'body', color, center, style, children, ...rest }: Props) {
  return (
    <RNText
      style={[
        Typography[variant],
        { color: color ?? Colors.textBody },
        center && styles.center,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
