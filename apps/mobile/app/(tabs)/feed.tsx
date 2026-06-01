/**
 * D-005 노트 목록/피드 (FR-NOTE-005).
 * 워크스페이스 노트를 최신순으로. 실시간 반영(FR-WS-003)·동기화 배지는 REL-004/006.
 */
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotes } from '@/features/note/hooks';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { RatingStars } from '@/components/RatingStars';
import { tokens } from '@/theme/tokens';
import type { NoteSummary } from '@/types/database';

export default function FeedScreen() {
  const router = useRouter();
  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;
  const notes = useNotes(workspaceId);

  const items = notes.data?.pages.flatMap((p) => p.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: NoteSummary }) => (
      <Pressable style={styles.card} onPress={() => router.push(`/note/${item.note_id}`)}>
        <View style={styles.cardHead}>
          <RatingStars value={item.rating} size={16} />
          <Text style={styles.date}>{item.visited_at}</Text>
        </View>
        {item.free_memo ? (
          <Text style={styles.memo} numberOfLines={2}>
            {item.free_memo}
          </Text>
        ) : null}
      </Pressable>
    ),
    [router],
  );

  if (!workspaceId && !workspaces.isPending) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>워크스페이스를 먼저 만들어 주세요. (설정 탭)</Text>
      </View>
    );
  }

  if (notes.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.note_id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      onEndReached={() => notes.hasNextPage && notes.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>아직 작성한 임장 노트가 없습니다.</Text>
          <Text style={styles.emptySub}>지도에서 단지를 선택해 첫 노트를 남겨보세요.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: tokens.space.md, gap: tokens.space.sm },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.xs,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  memo: { fontSize: tokens.font.md, color: tokens.color.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl, gap: tokens.space.xs },
  empty: { fontSize: tokens.font.md, color: tokens.color.text, textAlign: 'center' },
  emptySub: { fontSize: tokens.font.sm, color: tokens.color.textMuted, textAlign: 'center' },
});
