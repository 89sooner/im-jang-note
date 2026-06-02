/**
 * C-013 SyncStatusBadge — 동기화 상태 전역 표시 (FR-SYNC-002, frontend §5).
 * 오프라인/동기화중/부분실패만 노출(정상 시 비표시).
 */
import { StyleSheet, Text, View } from 'react-native';
import { useSyncStore } from '@/stores/syncStore';
import { tokens } from '@/theme/tokens';

export function SyncStatusBadge() {
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);
  const failed = useSyncStore((s) => s.failed);

  if (online && pending === 0 && failed === 0) return null;

  let label = '';
  let style = styles.info;
  if (!online) {
    label = '오프라인';
    style = styles.warn;
  } else if (pending > 0) {
    label = `동기화 중 ${pending}건`;
    style = styles.info;
  } else if (failed > 0) {
    label = `동기화 실패 ${failed}건`;
    style = styles.danger;
  }

  return (
    <View style={[styles.bar, style]} accessibilityRole="alert">
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: 6,
    alignItems: 'center',
  },
  info: { backgroundColor: '#E5EFFF' },
  warn: { backgroundColor: '#FBE9D0' },
  danger: { backgroundColor: '#F8D2D8' },
  text: { fontSize: tokens.font.sm, color: tokens.color.text, fontWeight: '600' },
});
