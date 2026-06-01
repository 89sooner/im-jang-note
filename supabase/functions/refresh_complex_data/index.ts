// fn:refresh_complex_data — API-DATA-003 (FR-DATA-003)
// 단지 메타 + 최근 3개월 실거래를 강제 재적재한다(캐시 무시).
// 입력: { complex_id } (GET query 또는 POST body).
// 분당 호출 상한(메모리 토큰버킷)을 초과하면 429 DATA_RATE_LIMITED.
// 응답 DTO: { job_id }  (동기 처리이며 즉시 생성한 uuid를 반환한다.)

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";
import { fetchComplexMeta, fetchTrades, UpstreamError } from "../_shared/molit.ts";

const REFRESH_MONTHS = 3; // 최근 3개월 실거래 재적재.

// ---------------------------------------------------------------------------
// 분당 호출 상한: 단지별 메모리 토큰버킷(쿨다운).
// 동일 단지에 대한 재적재는 RATE_WINDOW_MS 내 RATE_MAX회로 제한한다.
// (워커 인스턴스 메모리 기준 best-effort. 영속 제한은 별도 잡 정책으로 보강.)
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 1000; // 1분
const RATE_MAX = 1; // 단지당 분당 1회
const lastCallByComplex = new Map<string, number[]>();

/** rate-limit 통과 여부. 통과 시 호출 시각을 기록한다. */
function allowRefresh(complexId: string): boolean {
  const now = Date.now();
  const hits = (lastCallByComplex.get(complexId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (hits.length >= RATE_MAX) {
    lastCallByComplex.set(complexId, hits);
    return false;
  }
  hits.push(now);
  lastCallByComplex.set(complexId, hits);
  return true;
}

/** GET query 또는 POST JSON body에서 complex_id 추출. */
async function readComplexId(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const q = url.searchParams.get("complex_id");
  if (q) return q;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      return body?.complex_id ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

/** 현재월부터 과거로 n개월의 'YYYYMM' 목록. */
function recentMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(
      `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    await requireUser(req);

    const complexId = await readComplexId(req);
    if (!complexId) {
      return errorResponse("VALIDATION", "complex_id가 필요합니다.", 400);
    }

    if (!allowRefresh(complexId)) {
      return errorResponse(
        "DATA_RATE_LIMITED",
        "재적재 요청이 너무 잦습니다. 잠시 후 다시 시도하세요.",
        429,
      );
    }

    const db = adminClient();

    // 단지 존재 확인 + 외부 조회 키 확보.
    const { data: complex, error: cErr } = await db
      .from("complex")
      .select("id, external_id, lawd_cd, name, address, total_households, build_year")
      .eq("id", complexId)
      .maybeSingle();
    if (cErr) return errorResponse("INTERNAL", "단지 조회 실패", 500);
    if (!complex) {
      return errorResponse("NOT_FOUND", "단지를 찾을 수 없습니다.", 404);
    }

    const now = new Date().toISOString();
    let upstreamFailed = false;

    // 1) 단지 메타 강제 재적재.
    try {
      const meta = await fetchComplexMeta({
        externalId: complex.external_id,
        lawdCd: complex.lawd_cd,
      });
      if (meta) {
        await db
          .from("complex")
          .update({
            name: meta.name ?? complex.name,
            address: meta.address ?? complex.address,
            total_households: meta.total_households ?? complex.total_households,
            build_year: meta.build_year ?? complex.build_year,
            fetched_at: now,
          })
          .eq("id", complexId);
      }
    } catch (e) {
      if (!(e instanceof UpstreamError)) throw e;
      upstreamFailed = true;
    }

    // 2) 최근 3개월 실거래 강제 재적재.
    if (complex.lawd_cd) {
      for (const dealYmd of recentMonths(REFRESH_MONTHS)) {
        try {
          const trades = await fetchTrades({
            lawdCd: complex.lawd_cd,
            dealYmd,
          });
          if (trades.length === 0) continue;
          const records = trades.map((t) => ({
            complex_id: complexId,
            deal_date: t.deal_date,
            area_m2: t.area_m2,
            floor: t.floor,
            price: t.price,
            fetched_at: now,
            is_stale: false,
          }));
          await db
            .from("transaction_cache")
            .upsert(records, {
              onConflict: "complex_id,deal_date,area_m2,floor,price",
              ignoreDuplicates: true,
            });
        } catch (e) {
          if (!(e instanceof UpstreamError)) throw e;
          upstreamFailed = true;
        }
      }
    }

    // 외부가 모두 실패했고 갱신이 전무하면 503으로 알린다(저하 모드).
    if (upstreamFailed && !complex.lawd_cd) {
      return errorResponse(
        "DATA_UPSTREAM_UNAVAILABLE",
        "외부 데이터 공급자(국토부) 호출에 실패했습니다.",
        503,
      );
    }

    // 동기 처리 완료. 추적용 job_id(uuid) 즉시 반환.
    return jsonResponse({ job_id: crypto.randomUUID() });
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
