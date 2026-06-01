import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { tokens } from '@/theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ label, onPress, loading, disabled, variant = 'primary' }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.color.primaryText} />
      ) : (
        <Text
          style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.touchTarget,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
  },
  secondary: { backgroundColor: tokens.color.surface },
  danger: { backgroundColor: tokens.color.danger },
  disabled: { opacity: 0.5 },
  label: { color: tokens.color.primaryText, fontSize: tokens.font.md, fontWeight: '600' },
  secondaryLabel: { color: tokens.color.text },
});
