/**
 * C-011 CompareTable — 단지 다중 비교(행=속성, 열=단지) (FR-FAV-002/DATA-002/NOTE-003).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RatingStars } from './RatingStars';
import type { CompareColumn } from '@/features/compare/api';
import { tokens } from '@/theme/tokens';

function priceKR(man: number | null): string {
  if (man == null) return '-';
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  return eok > 0 ? `${eok}억${rest ? ' ' + rest.toLocaleString() : ''}` : `${rest.toLocaleString()}만`;
}

export function CompareTable({ columns }: { columns: CompareColumn[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        {/* 헤더: 단지명 */}
        <View style={styles.row}>
          <View style={[styles.cell, styles.head]}><Text style={styles.headText}>속성</Text></View>
          {columns.map((c) => (
            <View key={c.complexId} style={[styles.cell, styles.head]}>
              <Text style={styles.headText} numberOfLines={1}>{c.detail.name}</Text>
            </View>
          ))}
        </View>

        <Metric label="주소" columns={columns} render={(c) => c.detail.address ?? '-'} />
        <Metric label="준공" columns={columns} render={(c) => (c.detail.build_year ? `${c.detail.build_year}년` : '-')} />
        <Metric
          label="세대수"
          columns={columns}
          render={(c) => (c.detail.total_households ? `${c.detail.total_households.toLocaleString()}` : '-')}
        />
        <Metric label="최근 평균가" columns={columns} render={(c) => priceKR(c.avgPrice)} />

        {/* 별점 행 */}
        <View style={styles.row}>
          <View style={styles.cell}><Text style={styles.label}>별점</Text></View>
          {columns.map((c) => (
            <View key={c.complexId} style={styles.cell}>
              {c.noteRating ? <RatingStars value={c.noteRating} size={14} /> : <Text style={styles.value}>-</Text>}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Metric({
  label,
  columns,
  render,
}: {
  label: string;
  columns: CompareColumn[];
  render: (c: CompareColumn) => string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.cell}><Text style={styles.label}>{label}</Text></View>
      {columns.map((c) => (
        <View key={c.complexId} style={styles.cell}>
          <Text style={styles.value} numberOfLines={2}>{render(c)}</Text>
        </View>
      ))}
    </View>
  );
}

const COL = 130;
const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: {
    width: COL,
    padding: tokens.space.sm,
    borderWidth: 0.5,
    borderColor: tokens.color.border,
    justifyContent: 'center',
  },
  head: { backgroundColor: tokens.color.surface },
  headText: { fontSize: tokens.font.sm, fontWeight: '700', color: tokens.color.text },
  label: { fontSize: tokens.font.sm, color: tokens.color.textMuted, fontWeight: '600' },
  value: { fontSize: tokens.font.sm, color: tokens.color.text },
});
