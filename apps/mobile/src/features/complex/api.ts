/**
 * 단지/실거래가 API (API-MAP-001/003, API-DATA-001/002/003).
 * 마커/생성은 RPC, 국토부 캐시 데이터는 Edge Function 경유(키 서버 보관).
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  BBox,
  Complex,
  ComplexDetail,
  Marker,
  TransactionList,
} from '@/types/database';

/** API-MAP-001 뷰포트 단지 마커 (FR-MAP-001/002/005) */
export async function fetchMarkers(bbox: BBox, zoom: number): Promise<Marker[]> {
  const { data, error } = await supabase.rpc('rpc_markers_in_bbox', {
    p_min_lat: bbox.minLat,
    p_min_lng: bbox.minLng,
    p_max_lat: bbox.maxLat,
    p_max_lng: bbox.maxLng,
    p_zoom: Math.round(zoom),
  });
  if (error) throw error;
  return (data ?? []) as Marker[];
}

/** API-MAP-003 미등록 단지 생성 (FR-MAP-003) */
export async function createComplex(input: {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}): Promise<Complex> {
  const { data, error } = await supabase.rpc('rpc_create_complex', {
    p_name: input.name,
    p_lat: input.lat,
    p_lng: input.lng,
    p_address: input.address ?? null,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as Complex;
}

/** Edge Function 오류를 표준 코드 문자열로 변환 */
function unwrapFnError(error: unknown, data: unknown): void {
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error?: { code?: string; message?: string } }).error;
    if (e?.code) throw new Error(e.code);
  }
}

/** API-DATA-001 단지 기본정보(캐시 우선) (FR-DATA-001/003) */
export async function fetchComplexDetail(complexId: string): Promise<ComplexDetail> {
  const { data, error } = await supabase.functions.invoke('complex_detail', {
    body: { complex_id: complexId },
  });
  unwrapFnError(error, data);
  return data as ComplexDetail;
}

/** API-DATA-002 실거래가 목록·추이(캐시 우선) (FR-DATA-002/003/004) */
export async function fetchTransactions(
  complexId: string,
  opts?: { areaRange?: [number, number]; periodMonths?: number },
): Promise<TransactionList> {
  const { data, error } = await supabase.functions.invoke('transactions', {
    body: {
      complex_id: complexId,
      area_range: opts?.areaRange,
      period: opts?.periodMonths ?? 12,
    },
  });
  unwrapFnError(error, data);
  return data as TransactionList;
}

/** API-DATA-003 강제 갱신 (FR-DATA-003) */
export async function refreshComplexData(complexId: string): Promise<{ job_id: string }> {
  const { data, error } = await supabase.functions.invoke('refresh_complex_data', {
    body: { complex_id: complexId },
  });
  unwrapFnError(error, data);
  return data as { job_id: string };
}
