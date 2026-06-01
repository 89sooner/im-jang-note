/**
 * 단지 비교 데이터 조합 (D-006, FR-FAV-002).
 * 새 엔드포인트 없이 API-FAV-001 + API-DATA-001/002 + API-NOTE-003 조합(api_contracts §).
 */
import { fetchComplexDetail, fetchTransactions } from '@/features/complex/api';
import { fetchNotes } from '@/features/note/api';
import type { ComplexDetail } from '@/types/database';

export interface CompareColumn {
  complexId: string;
  detail: ComplexDetail;
  avgPrice: number | null; // 최근 월 평균(만원)
  noteRating: number | null; // 최근 노트 별점
}

export async function fetchCompare(
  workspaceId: string,
  complexIds: string[],
): Promise<CompareColumn[]> {
  return Promise.all(
    complexIds.map(async (complexId) => {
      const [detail, tx, notes] = await Promise.all([
        fetchComplexDetail(complexId),
        fetchTransactions(complexId).catch(() => null),
        fetchNotes({ workspaceId, complexId, limit: 1 }).catch(() => null),
      ]);
      const lastTrend = tx?.trend?.[tx.trend.length - 1];
      return {
        complexId,
        detail,
        avgPrice: lastTrend ? Math.round(lastTrend.avg_price) : null,
        noteRating: notes?.items[0]?.rating ?? null,
      };
    }),
  );
}
