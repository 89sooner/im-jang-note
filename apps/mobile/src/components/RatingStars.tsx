/**
 * C-004 RatingStars — 별점 입력/표시 (FR-NOTE-001/003).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';

interface Props {
  value: number;
  onChange?: (value: number) => void; // 미지정 시 읽기 전용
  size?: number;
}

export function RatingStars({ value, onChange, size = 28 }: Props) {
  const readOnly = !onChange;
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Text style={[{ fontSize: size }, filled ? styles.filled : styles.empty]}>
            {filled ? '★' : '☆'}
          </Text>
        );
        if (readOnly) return <View key={n}>{star}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n}점`}
            style={styles.tap}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space.xs },
  tap: { padding: 2 },
  filled: { color: '#F5A623' },
  empty: { color: tokens.color.border },
});
