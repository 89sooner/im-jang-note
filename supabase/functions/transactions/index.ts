// fn:transactions — API-DATA-002 (FR-DATA-002/003/004)
// 실거래가를 캐시 우선으로 반환한다(ADR-004 stale-while-revalidate).
// 입력: { complex_id, area_range?: [min,max], period?: months(기본 12) }
//        (GET query 또는 POST body 모두 허용).
// 응답 DTO:
//   { complex_id, items: [{deal_date, area_m2, floor, price}], trend, freshness }
//   trend: [{ month: 'YYYY-MM', avg_price, count }]

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";
import { buildFreshness, isTxStale } from "../_shared/freshness.ts";
import { fetchTrades, UpstreamError } from "../_shared/molit.ts";

interface Input {
  complex_id: string;
  area_range?: [number, number];
  period?: number; // 개월 수(기본 12)
}

/** GET query 또는 POST JSON body에서 입력을 추출한다. */
async function readInput(req: Request): Promise<Input | null> {
  const url = new URL(req.url);
  let complexId = url.searchParams.get("complex_id") ?? "";
  let areaRange: [number, number] | undefined;
  let period: number | undefined;

  const minQ = url.searchParams.get("area_min");
  const maxQ = url.searchParams.get("area_max");
  if (minQ != null && maxQ != null) {
    areaRange = [Number(minQ), Number(maxQ)];
  }
  const periodQ = url.searchParams.get("period");
  if (periodQ != null) period = Number(periodQ);

  if (req.method === "POST") {
    try {
      const body = await req.json();
      complexId = body?.complex_id ?? complexId;
      if (Array.isArray(body?.area_range) && body.area_range.length === 2) {
        areaRange = [Number(body.area_range[0]), Number(body.area_range[1])];
      }
      if (body?.period != null) period = Number(body.period);
    } catch {
      // body 파싱 실패는 무시하고 query 값만 사용.
    }
  }

  if (!complexId) return null;
  if (areaRange && (!Number.isFinite(areaRange[0]) || !Number.isFinite(areaRange[1]))) {
    areaRange = undefined;
  }
  if (period != null && (!Number.isFinite(period) || period <= 0)) period = undefined;

  return { complex_id: complexId, area_range: areaRange, period: period ?? 12 };
}

/** 현재월부터 과거로 n개월의 'YYYYMM' 목록(최신순). */
function recentMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() - i; // getUTCMonth는 음수 보정됨
    const dt = new Date(Date.UTC(y, m, 1));
    out.push(
      `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

/** 현재 연-월 'YYYY-MM'. */
function currentYm(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface CacheRow {
  deal_date: string;
  area_m2: number;
  floor: number | null;
  price: number;
  fetched_at: string;
}

/** 기간(개월) 시작일 'YYYY-MM-DD'(해당 월 1일). */
function periodStartDate(months: number): string {
  const d = new Date();
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (months - 1), 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    await requireUser(req);

    const input = await readInput(req);
    if (!input) {
      return errorResponse("VALIDATION", "complex_id가 필요합니다.", 400);
    }
    const months = input.period ?? 12;
    const startDate = periodStartDate(months);

    const db = adminClient();

    // 단지 + lawd_cd 확인.
    const { data: complex, error: cErr } = await db
      .from("complex")
      .select("id, lawd_cd")
      .eq("id", input.complex_id)
      .maybeSingle();
    if (cErr) return errorResponse("INTERNAL", "단지 조회 실패", 500);
    if (!complex) {
      return errorResponse("NOT_FOUND", "단지를 찾을 수 없습니다.", 404);
    }

    // 기간 내 캐시 조회.
    const queryCache = async (): Promise<CacheRow[]> => {
      const { data } = await db
        .from("transaction_cache")
        .select("deal_date, area_m2, floor, price, fetched_at")
        .eq("complex_id", input.complex_id)
        .gte("deal_date", startDate)
        .order("deal_date", { ascending: false });
      return (data ?? []) as CacheRow[];
    };

    let rows = await queryCache();

    // 신선도 판정: 가장 최근 fetched_at 기준. 현재월 데이터 포함 여부로 TTL 결정.
    const latestFetched = rows.reduce<string | null>(
      (acc, r) => (acc && acc > r.fetched_at ? acc : r.fetched_at),
      null,
    );
    const ym = currentYm();
    const hasCurrentMonth = rows.some((r) => r.deal_date.startsWith(ym));
    const stale = rows.length === 0 ||
      isTxStale(latestFetched, hasCurrentMonth);

    let degraded = false; // 외부 실패로 캐시(stale) 폴백했는지.

    if (stale) {
      if (!complex.lawd_cd) {
        // lawd_cd 없으면 외부 조회 불가 → 캐시(있으면) + 저하 모드.
        if (rows.length === 0) {
          return errorResponse(
            "DATA_UPSTREAM_UNAVAILABLE",
            "실거래가를 조회할 수 없습니다(법정동 코드 미설정).",
            503,
          );
        }
        degraded = true;
      } else {
        try {
          // 최근 N개월 호출 → upsert(unique 충돌 무시) → 재조회.
          const now = new Date().toISOString();
          for (const dealYmd of recentMonths(months)) {
            const trades = await fetchTrades({
              lawdCd: complex.lawd_cd,
              dealYmd,
            });
            if (trades.length === 0) continue;
            const records = trades.map((t) => ({
              complex_id: input.complex_id,
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
          }
          rows = await queryCache();
        } catch (e) {
          if (!(e instanceof UpstreamError)) throw e;
          // 외부 장애: 캐시 폴백. 캐시도 없으면 503.
          if (rows.length === 0) {
            return errorResponse(
              "DATA_UPSTREAM_UNAVAILABLE",
              "실거래가 공급자(국토부) 호출에 실패했습니다.",
              503,
            );
          }
          degraded = true;
        }
      }
    }

    // area_range 필터(서버측 적용).
    let items = rows;
    if (input.area_range) {
      const [min, max] = input.area_range;
      items = rows.filter((r) => r.area_m2 >= min && r.area_m2 <= max);
    }

    // 월별 평균가 trend 계산.
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const r of items) {
      const m = r.deal_date.slice(0, 7); // 'YYYY-MM'
      const b = buckets.get(m) ?? { sum: 0, count: 0 };
      b.sum += r.price;
      b.count += 1;
      buckets.set(m, b);
    }
    const trend = [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, b]) => ({
        month,
        avg_price: Math.round(b.sum / b.count),
        count: b.count,
      }));

    // 재조회 후 가장 최근 fetched_at으로 신선도 메타 갱신.
    const fetchedForMeta = rows.reduce<string | null>(
      (acc, r) => (acc && acc > r.fetched_at ? acc : r.fetched_at),
      null,
    );
    // 외부 실패로 캐시(stale) 폴백한 경우만 is_stale=true(NFR-004).
    const isStaleFlag = degraded;

    return jsonResponse({
      complex_id: input.complex_id,
      items: items.map((r) => ({
        deal_date: r.deal_date,
        area_m2: Number(r.area_m2),
        floor: r.floor,
        price: r.price,
      })),
      trend,
      freshness: buildFreshness(fetchedForMeta, isStaleFlag),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
