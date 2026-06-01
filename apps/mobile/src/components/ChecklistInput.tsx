/**
 * C-005 ChecklistInput — 교통·학군·소음·채광·관리상태·주변환경 (FR-NOTE-002).
 * 카테고리별 1~5점 + 선택 메모. 6개 항목 고정(범위 추가 금지).
 */
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CHECKLIST_CATEGORIES, type ChecklistItem } from '@/types/database';
import { RatingStars } from './RatingStars';
import { tokens } from '@/theme/tokens';

interface Props {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function ChecklistInput({ value, onChange }: Props) {
  function update(category: ChecklistItem['category'], patch: Partial<ChecklistItem>) {
    const next = CHECKLIST_CATEGORIES.map((cat) => {
      const existing = value.find((v) => v.category === cat) ?? { category: cat, score: 0 };
      return cat === category ? { ...existing, ...patch } : existing;
    }).filter((it) => it.score > 0 || it.memo);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      {CHECKLIST_CATEGORIES.map((cat) => {
        const item = value.find((v) => v.category === cat);
        return (
          <View key={cat} style={styles.row}>
            <View style={styles.head}>
              <Text style={styles.label}>{cat}</Text>
              <RatingStars
                value={item?.score ?? 0}
                onChange={(score) => update(cat, { score })}
                size={22}
              />
            </View>
            <TextInput
              style={styles.memo}
              placeholder="메모 (선택)"
              value={item?.memo ?? ''}
              onChangeText={(memo) => update(cat, { memo })}
              accessibilityLabel={`${cat} 메모`}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: tokens.space.md },
  row: { gap: tokens.space.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: tokens.font.md, fontWeight: '600', color: tokens.color.text },
  memo: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 6,
    fontSize: tokens.font.sm,
    color: tokens.color.text,
  },
});
