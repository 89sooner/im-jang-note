/**
 * C-009 FilterSheet — 검색 필터(가격대·평형·평점) (FR-SEARCH-002).
 * SRS 범위 필터만 노출(범위 추가 금지). 인라인 패널 형태(스켈레톤).
 */
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { RatingStars } from './RatingStars';
import { Button } from './Button';
import type { SearchFilters } from '@/types/database';
import { tokens } from '@/theme/tokens';

interface Props {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

function parseNum(v: string): number | undefined {
  const n = Number(v.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function FilterSheet({ filters, onChange, onApply, onReset }: Props) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.section}>필터</Text>

      <Text style={styles.label}>가격대 (만원)</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="최소"
          defaultValue={filters.price_range?.[0]?.toString()}
          onChangeText={(v) =>
            onChange({ ...filters, price_range: [parseNum(v) ?? 0, filters.price_range?.[1] ?? 0] })
          }
        />
        <Text style={styles.tilde}>~</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="최대"
          defaultValue={filters.price_range?.[1]?.toString()}
          onChangeText={(v) =>
            onChange({ ...filters, price_range: [filters.price_range?.[0] ?? 0, parseNum(v) ?? 0] })
          }
        />
      </View>

      <Text style={styles.label}>전용면적 (㎡)</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="최소"
          defaultValue={filters.area?.[0]?.toString()}
          onChangeText={(v) => onChange({ ...filters, area: [parseNum(v) ?? 0, filters.area?.[1] ?? 0] })}
        />
        <Text style={styles.tilde}>~</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="최대"
          defaultValue={filters.area?.[1]?.toString()}
          onChangeText={(v) => onChange({ ...filters, area: [filters.area?.[0] ?? 0, parseNum(v) ?? 0] })}
        />
      </View>

      <Text style={styles.label}>최소 별점</Text>
      <RatingStars
        value={filters.rating_min ?? 0}
        onChange={(n) => onChange({ ...filters, rating_min: n })}
      />

      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label="초기화" variant="secondary" onPress={onReset} />
        </View>
        <View style={styles.flex}>
          <Button label="적용" onPress={onApply} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    gap: tokens.space.sm,
  },
  section: { fontSize: tokens.font.md, fontWeight: '700', color: tokens.color.text },
  label: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  input: {
    flex: 1,
    minHeight: tokens.touchTarget,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    fontSize: tokens.font.md,
    color: tokens.color.text,
  },
  tilde: { color: tokens.color.textMuted },
  actions: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.sm },
  flex: { flex: 1 },
});
