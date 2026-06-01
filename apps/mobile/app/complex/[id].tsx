/**
 * D-003 단지 상세 (FR-DATA-001~003, FR-NOTE-001 진입).
 * 국토부 단지 기본정보 + 실거래가 목록·추이(캐시 우선, 저하 모드 표시).
 * "임장 노트 작성" CTA는 REL-003에서 D-004로 연결.
 */
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useComplexDetail, useTransactions } from '@/features/complex/hooks';
import { useFavorites, useToggleFavorite } from '@/features/favorite/hooks';
import { useMyWorkspaces } from '@/features/workspace/hooks';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { Button } from '@/components/Button';
import { toUserMessage } from '@/lib/errors';
import { tokens } from '@/theme/tokens';
import type { TrendPoint, Transaction, Favorite } from '@/types/database';

function manwonToKR(price: number): string {
  // price: 만원 단위 → "x억 y,yyy만"
  const eok = Math.floor(price / 10000);
  const man = price % 10000;
  if (eok > 0) return `${eok}억${man > 0 ? ' ' + man.toLocaleString() : ''}`;
  return `${man.toLocaleString()}만`;
}

export default function ComplexDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useComplexDetail(id ?? null);
  const tx = useTransactions(id ?? null);

  const workspaces = useMyWorkspaces();
  const workspaceId = workspaces.data?.[0]?.workspace.id ?? null;
  const favorites = useFavorites(workspaceId);
  const toggleFav = useToggleFavorite(workspaceId);
  const isFavorited = (favorites.data ?? []).some((f: Favorite) => f.complex_id === id);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: detail.data?.name ?? '단지 상세' }} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* 단지 기본정보 */}
        {detail.isPending ? (
          <Loading />
        ) : detail.isError ? (
          <ErrorBox message={toUserMessage(detail.error)} />
        ) : detail.data ? (
          <View style={styles.card}>
            <Text style={styles.name}>{detail.data.name}</Text>
            {detail.data.address && <Text style={styles.addr}>{detail.data.address}</Text>}
            <View style={styles.metaRow}>
              {detail.data.total_households != null && (
                <Meta label="세대수" value={`${detail.data.total_households.toLocaleString()}세대`} />
              )}
              {detail.data.build_year != null && (
                <Meta label="준공" value={`${detail.data.build_year}년`} />
              )}
            </View>
            <FreshnessBadge freshness={detail.data.freshness} />
          </View>
        ) : null}

        {/* 실거래가 */}
        <Text style={styles.section}>실거래가</Text>
        <View style={styles.card}>
          {tx.isPending ? (
            <Loading />
          ) : tx.isError ? (
            <ErrorBox message={toUserMessage(tx.error)} />
          ) : tx.data && tx.data.items.length > 0 ? (
            <>
              <FreshnessBadge freshness={tx.data.freshness} />
              <Trend trend={tx.data.trend} />
              <View style={styles.divider} />
              {tx.data.items.slice(0, 20).map((t: Transaction, i: number) => (
                <View key={i} style={styles.txRow}>
                  <Text style={styles.txDate}>{t.deal_date}</Text>
                  <Text style={styles.txArea}>{t.area_m2}㎡{t.floor ? ` · ${t.floor}층` : ''}</Text>
                  <Text style={styles.txPrice}>{manwonToKR(t.price)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>등록된 실거래가가 없습니다.</Text>
          )}
        </View>

        {/* 즐겨찾기 토글 (FR-FAV-001) */}
        {workspaceId && (
          <Button
            label={isFavorited ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
            variant="secondary"
            onPress={() => id && toggleFav.mutate(id)}
            loading={toggleFav.isPending}
          />
        )}

        {/* 노트 작성 진입 (FR-NOTE-001) */}
        <View style={{ height: tokens.space.sm }} />
        <Button
          label="임장 노트 작성"
          onPress={() => router.push(`/note/edit?complexId=${id}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Trend({ trend }: { trend: TrendPoint[] }) {
  if (!trend || trend.length === 0) return null;
  const last = trend[trend.length - 1];
  return (
    <View style={styles.trendBox}>
      <Text style={styles.trendLabel}>최근 평균</Text>
      <Text style={styles.trendValue}>{manwonToKR(Math.round(last.avg_price))}</Text>
      <Text style={styles.trendSub}>{last.month} · {last.count}건</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={tokens.color.primary} />
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  container: { padding: tokens.space.lg, gap: tokens.space.sm },
  card: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.color.border,
    gap: tokens.space.sm,
  },
  name: { fontSize: tokens.font.xl, fontWeight: '700', color: tokens.color.text },
  addr: { fontSize: tokens.font.md, color: tokens.color.textMuted },
  metaRow: { flexDirection: 'row', gap: tokens.space.lg },
  meta: { gap: 2 },
  metaLabel: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  metaValue: { fontSize: tokens.font.md, color: tokens.color.text, fontWeight: '600' },
  section: {
    fontSize: tokens.font.sm,
    color: tokens.color.textMuted,
    fontWeight: '700',
    marginTop: tokens.space.md,
  },
  divider: { height: 1, backgroundColor: tokens.color.border },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  txDate: { fontSize: tokens.font.sm, color: tokens.color.textMuted, width: 92 },
  txArea: { fontSize: tokens.font.sm, color: tokens.color.text, flex: 1 },
  txPrice: { fontSize: tokens.font.md, color: tokens.color.text, fontWeight: '700' },
  trendBox: { gap: 2 },
  trendLabel: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  trendValue: { fontSize: tokens.font.xl, color: tokens.color.primary, fontWeight: '800' },
  trendSub: { fontSize: tokens.font.sm, color: tokens.color.textMuted },
  empty: { fontSize: tokens.font.md, color: tokens.color.textMuted },
  center: { paddingVertical: tokens.space.lg, alignItems: 'center' },
  error: { color: tokens.color.danger, fontSize: tokens.font.sm },
});
