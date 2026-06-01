/**
 * 신선도/저하 모드 배지 (NFR-004, FR-DATA-003).
 * is_stale면 "최신 아님" 경고색, 아니면 갱신 시각 표시.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { Freshness } from '@/types/database';
import { tokens } from '@/theme/tokens';

export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const stale = freshness.is_stale;
  const label = stale
    ? '최신 아님 · 캐시 표시'
    : freshness.fetched_at
      ? `갱신 ${new Date(freshness.fetched_at).toLocaleDateString('ko-KR')}`
      : '갱신 정보 없음';
  return (
    <View style={[styles.badge, stale ? styles.stale : styles.fresh]}>
      <Text style={[styles.text, stale ? styles.staleText : styles.freshText]}>
        {freshness.source} · {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.sm,
  },
  fresh: { backgroundColor: tokens.color.surface },
  stale: { backgroundColor: '#FBE9D0' },
  text: { fontSize: tokens.font.sm, fontWeight: '600' },
  freshText: { color: tokens.color.textMuted },
  staleText: { color: tokens.color.warning },
});
