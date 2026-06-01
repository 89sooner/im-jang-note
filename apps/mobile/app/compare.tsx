/**
 * D-006 단지 비교 (FR-FAV-002).
 * 즐겨찾기 후보(최대 4) 비교표. 데이터는 favorite + 단지정보 + 실거래 + 노트 조합.
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useFavorites } from '@/features/favorite/hooks';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { fetchCompare } from '@/features/compare/api';
import { CompareTable } from '@/components/CompareTable';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { Favorite } from '@/types/database';

const MAX_COMPARE = 4;

export default function CompareScreen() {
  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;
  const favorites = useFavorites(workspaceId);

  const complexIds = (favorites.data ?? [])
    .slice(0, MAX_COMPARE)
    .map((f: Favorite) => f.complex_id);

  const compare = useQuery({
    queryKey: ['compare', workspaceId, complexIds],
    queryFn: () => fetchCompare(workspaceId as string, complexIds),
    enabled: !!workspaceId && complexIds.length >= 2,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '단지 비교' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {complexIds.length < 2 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>비교하려면 즐겨찾기를 2곳 이상 등록하세요.</Text>
          </View>
        ) : compare.isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.color.primary} />
          </View>
        ) : compare.isError ? (
          <Text style={styles.error}>{toUserMessage(compare.error)}</Text>
        ) : compare.data ? (
          <CompareTable columns={compare.data} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.md },
  center: { paddingVertical: tokens.space.xl, alignItems: 'center' },
  empty: { fontSize: tokens.font.md, color: tokens.color.textMuted, textAlign: 'center' },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
});
