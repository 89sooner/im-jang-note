/**
 * D-008 즐겨찾기/후보 (FR-FAV-001/002).
 * 워크스페이스 공유 후보 단지 목록 → 단지 상세 / 비교(D-006) 진입.
 */
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFavorites } from '@/features/favorite/hooks';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { Button } from '@/components/Button';
import { tokens } from '@/theme/tokens';
import type { Favorite } from '@/types/database';

export default function FavoritesScreen() {
  const router = useRouter();
  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;
  const favorites = useFavorites(workspaceId);

  if (!workspaceId && !workspaces.isPending) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>워크스페이스를 먼저 만들어 주세요. (설정 탭)</Text>
      </View>
    );
  }
  if (favorites.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.color.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: Favorite }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/complex/${item.complex_id}`)}>
            <Text style={styles.complexId}>단지 {item.complex_id.slice(0, 8)}…</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ko-KR')}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>아직 즐겨찾기한 단지가 없습니다.</Text>
            <Text style={styles.emptySub}>단지 상세에서 즐겨찾기를 눌러 후보로 모아보세요.</Text>
          </View>
        }
      />
      {(favorites.data?.length ?? 0) >= 2 && (
        <View style={styles.footer}>
          <Button label="후보 비교하기" onPress={() => router.push('/compare')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.color.bg },
  list: { padding: tokens.space.md, gap: tokens.space.sm },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  complexId: { fontSize: tokens.font.md, color: tokens.color.text },
  date: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  footer: { padding: tokens.space.md, borderTopWidth: 1, borderTopColor: tokens.color.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl, gap: tokens.space.xs },
  empty: { fontSize: tokens.font.md, color: tokens.color.text, textAlign: 'center' },
  emptySub: { fontSize: tokens.font.sm, color: tokens.color.textMuted, textAlign: 'center' },
});
