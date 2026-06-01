/**
 * 단지/실거래가 React Query 훅 (frontend_architecture.md §4.1).
 * queryKey는 워크스페이스 비종속 공용 캐시(complex/transaction).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BBox } from '@/types/database';
import {
  fetchComplexDetail,
  fetchMarkers,
  fetchTransactions,
  refreshComplexData,
} from './api';

const bboxKey = (b: BBox, zoom: number) =>
  [Math.round(zoom), b.minLat.toFixed(3), b.minLng.toFixed(3), b.maxLat.toFixed(3), b.maxLng.toFixed(3)];

export function useMarkers(bbox: BBox | null, zoom: number, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['markers', workspaceId ?? 'none', ...(bbox ? bboxKey(bbox, zoom) : ['nobbox'])],
    queryFn: () => fetchMarkers(bbox as BBox, zoom, workspaceId),
    enabled: !!bbox,
    placeholderData: (prev) => prev, // 패닝 시 깜빡임 방지
  });
}

export function useComplexDetail(complexId: string | null) {
  return useQuery({
    queryKey: ['complex', complexId],
    queryFn: () => fetchComplexDetail(complexId as string),
    enabled: !!complexId,
  });
}

export function useTransactions(
  complexId: string | null,
  opts?: { areaRange?: [number, number]; periodMonths?: number },
) {
  return useQuery({
    queryKey: ['transactions', complexId, opts?.areaRange ?? 'all', opts?.periodMonths ?? 12],
    queryFn: () => fetchTransactions(complexId as string, opts),
    enabled: !!complexId,
  });
}

export function useRefreshComplexData(complexId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshComplexData(complexId as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complex', complexId] });
      qc.invalidateQueries({ queryKey: ['transactions', complexId] });
    },
  });
}
