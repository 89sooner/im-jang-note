/**
 * D-007 검색/필터 (FR-SEARCH-001/002).
 * SearchBar(C-010) + FilterSheet(C-009) → fn:search 결과 → 단지 상세 진입.
 */
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { search } from '@/features/search/api';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { SearchBar } from '@/components/SearchBar';
import { FilterSheet } from '@/components/FilterSheet';
import { Button } from '@/components/Button';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { SearchFilters, SearchResult } from '@/types/database';

export default function SearchScreen() {
  const router = useRouter();
  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? undefined;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilter, setShowFilter] = useState(false);

  const run = useMutation({
    mutationFn: () => search({ query, filters, workspaceId }),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '검색' }} />
      <SearchBar query={query} onChange={setQuery} onSubmit={() => run.mutate()} />
      <View style={styles.toolbar}>
        <Button label={showFilter ? '필터 닫기' : '필터'} variant="secondary" onPress={() => setShowFilter((s) => !s)} />
        <View style={styles.flex}>
          <Button label="검색" onPress={() => run.mutate()} loading={run.isPending} />
        </View>
      </View>

      {showFilter && (
        <View style={styles.filterWrap}>
          <FilterSheet
            filters={filters}
            onChange={setFilters}
            onApply={() => {
              setShowFilter(false);
              run.mutate();
            }}
            onReset={() => setFilters({})}
          />
        </View>
      )}

      {run.isError && <Text style={styles.error}>{toUserMessage(run.error)}</Text>}

      {run.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.color.primary} />
        </View>
      ) : (
        <FlatList
          data={run.data ?? []}
          keyExtractor={(it) => it.complex_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: SearchResult }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/complex/${item.complex_id}`)}>
              <Text style={styles.name}>{item.name}</Text>
              {item.address && <Text style={styles.addr}>{item.address}</Text>}
            </Pressable>
          )}
          ListEmptyComponent={
            run.isSuccess ? (
              <View style={styles.center}>
                <Text style={styles.empty}>검색 결과가 없습니다.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  toolbar: { flexDirection: 'row', gap: tokens.space.sm, paddingHorizontal: tokens.space.md },
  flex: { flex: 1 },
  filterWrap: { padding: tokens.space.md },
  list: { padding: tokens.space.md, gap: tokens.space.sm },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: 2,
  },
  name: { fontSize: tokens.font.md, fontWeight: '600', color: tokens.color.text },
  addr: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  center: { padding: tokens.space.xl, alignItems: 'center' },
  empty: { fontSize: tokens.font.md, color: tokens.color.textMuted },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm, paddingHorizontal: tokens.space.md },
});
