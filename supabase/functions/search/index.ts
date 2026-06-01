// fn:search — API-SEARCH-001/002 (FR-SEARCH-001/002)
// 단지 검색: 키워드(name/address 부분일치) + bbox(좌표 범위) + 필터.
// 입력(GET query 또는 POST JSON 모두 허용):
//   {
//     query?: string,
//     bbox?: { minLat, minLng, maxLat, maxLng },
//     filters?: {
//       price_range?: [min, max],   // transaction_cache 최근 거래가(만원) 범위
//       area?: [min, max],          // transaction_cache 전용면적(m2) 범위
//       rating_min?: number,        // 요청자 workspace note rating>=값 존재
//     },
//     workspace_id?: string,        // rating 필터에 필요(없으면 무시)
//   }
// 응답 DTO: SearchResult[] = [{ complex_id, name, address, lat, lng }]
// 오류: 400(검증)/401. 최대 50건.

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";

interface Bbox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

interface Filters {
  price_range?: [number, number];
  area?: [number, number];
  rating_min?: number;
}

interface Input {
  query?: string;
  bbox?: Bbox;
  filters?: Filters;
  workspace_id?: string;
}

const MAX_RESULTS = 50;

/** 숫자 2-튜플 파싱(유효하지 않으면 undefined). */
function toRange(v: unknown): [number, number] | undefined {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const min = Number(v[0]);
  const max = Number(v[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
  return [min, max];
}

/** GET query 또는 POST JSON body에서 입력을 추출한다. */
async function readInput(req: Request): Promise<Input> {
  const url = new URL(req.url);
  const input: Input = {};

  const q = url.searchParams.get("query");
  if (q) input.query = q;

  const ws = url.searchParams.get("workspace_id");
  if (ws) input.workspace_id = ws;

  // bbox query: minLat,minLng,maxLat,maxLng (개별 파라미터).
  const minLat = url.searchParams.get("minLat");
  const minLng = url.searchParams.get("minLng");
  const maxLat = url.searchParams.get("maxLat");
  const maxLng = url.searchParams.get("maxLng");
  if (minLat != null && minLng != null && maxLat != null && maxLng != null) {
    input.bbox = {
      minLat: Number(minLat),
      minLng: Number(minLng),
      maxLat: Number(maxLat),
      maxLng: Number(maxLng),
    };
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.query === "string") input.query = body.query;
      if (typeof body?.workspace_id === "string") {
        input.workspace_id = body.workspace_id;
      }
      const b = body?.bbox;
      if (
        b && [b.minLat, b.minLng, b.maxLat, b.maxLng].every(
          (n: unknown) => Number.isFinite(Number(n)),
        )
      ) {
        input.bbox = {
          minLat: Number(b.minLat),
          minLng: Number(b.minLng),
          maxLat: Number(b.maxLat),
          maxLng: Number(b.maxLng),
        };
      }
      const f = body?.filters;
      if (f && typeof f === "object") {
        const filters: Filters = {};
        const price = toRange(f.price_range);
        if (price) filters.price_range = price;
        const area = toRange(f.area);
        if (area) filters.area = area;
        if (Number.isFinite(Number(f.rating_min))) {
          filters.rating_min = Number(f.rating_min);
        }
        if (Object.keys(filters).length > 0) input.filters = filters;
      }
    } catch {
      // body 파싱 실패는 무시하고 query 값만 사용.
    }
  }

  return input;
}

/** bbox 좌표가 유효한 범위인지 검증. */
function validBbox(b: Bbox): boolean {
  return (
    Number.isFinite(b.minLat) && Number.isFinite(b.minLng) &&
    Number.isFinite(b.maxLat) && Number.isFinite(b.maxLng) &&
    b.minLat <= b.maxLat && b.minLng <= b.maxLng
  );
}

interface ComplexRow {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    await requireUser(req);

    const input = await readInput(req);

    // 검증: bbox가 있으면 좌표 정합성 확인.
    if (input.bbox && !validBbox(input.bbox)) {
      return errorResponse("VALIDATION", "bbox 좌표가 올바르지 않습니다.", 400);
    }
    // 검증: 빈 요청(키워드·bbox·필터가 모두 없음)은 거부.
    if (!input.query && !input.bbox && !input.filters) {
      return errorResponse(
        "VALIDATION",
        "query, bbox, filters 중 하나는 필요합니다.",
        400,
      );
    }

    const db = adminClient();

    // 필터별 단지 id 집합을 개별 보관한다(null = 해당 필터 미적용).
    // - ratingIds: 엄격(strict) — 집합에 든 단지만 통과.
    // - priceMatched / priceHasCache: 관대(lenient) — 캐시 없는 단지는 통과.
    let ratingIds: Set<string> | null = null;
    let priceMatched: Set<string> | null = null;
    let priceHasCache: Set<string> | null = null;

    // rating_min 필터: 요청자 workspace의 note 기준.
    // 한계: workspace_id가 없으면 note는 workspace 격리(RLS/데이터 모델 §5)이므로
    //       어떤 workspace 기준인지 알 수 없어 rating 필터를 무시한다.
    if (input.filters?.rating_min != null) {
      if (!input.workspace_id) {
        // workspace_id 미제공 → rating 필터 적용 불가(무시).
      } else {
        const { data: noteRows, error: nErr } = await db
          .from("note")
          .select("complex_id")
          .eq("workspace_id", input.workspace_id)
          .gte("rating", input.filters.rating_min)
          .is("deleted_at", null);
        if (nErr) return errorResponse("INTERNAL", "노트 조회 실패", 500);
        ratingIds = new Set(
          (noteRows ?? []).map((r) => r.complex_id as string),
        );
      }
    }

    // price_range / area 필터: transaction_cache 기준.
    // 관대 매칭(lenient): 거래 캐시가 아예 없는 단지는 이 필터로 제외하지 않는다.
    if (input.filters?.price_range || input.filters?.area) {
      // (1) 조건을 만족하는 거래가 있는 단지.
      let matchQ = db.from("transaction_cache").select("complex_id");
      if (input.filters.price_range) {
        matchQ = matchQ
          .gte("price", input.filters.price_range[0])
          .lte("price", input.filters.price_range[1]);
      }
      if (input.filters.area) {
        matchQ = matchQ
          .gte("area_m2", input.filters.area[0])
          .lte("area_m2", input.filters.area[1]);
      }
      const { data: matchRows, error: mErr } = await matchQ;
      if (mErr) return errorResponse("INTERNAL", "거래 캐시 조회 실패", 500);
      priceMatched = new Set(
        (matchRows ?? []).map((r) => r.complex_id as string),
      );

      // (2) 캐시에 거래가 "존재"하는 단지(=가격/면적 판정 가능한 단지).
      const { data: anyRows, error: aErr } = await db
        .from("transaction_cache")
        .select("complex_id");
      if (aErr) return errorResponse("INTERNAL", "거래 캐시 조회 실패", 500);
      priceHasCache = new Set(
        (anyRows ?? []).map((r) => r.complex_id as string),
      );
    }

    // complex 본 조회.
    let cq = db
      .from("complex")
      .select("id, name, address, lat, lng")
      .limit(MAX_RESULTS);

    if (input.query) {
      // name 또는 address 부분일치(ilike).
      const safe = input.query.replace(/[%,()]/g, " ").trim();
      cq = cq.or(`name.ilike.%${safe}%,address.ilike.%${safe}%`);
    }
    if (input.bbox) {
      cq = cq
        .gte("lat", input.bbox.minLat)
        .lte("lat", input.bbox.maxLat)
        .gte("lng", input.bbox.minLng)
        .lte("lng", input.bbox.maxLng);
    }

    const { data: complexes, error: cErr } = await cq;
    if (cErr) return errorResponse("INTERNAL", "단지 조회 실패", 500);

    let rows = (complexes ?? []) as ComplexRow[];

    // rating 필터(엄격): 집합에 든 단지만 통과.
    if (ratingIds !== null) {
      const allow = ratingIds;
      rows = rows.filter((r) => allow.has(r.id));
    }
    // price/area 필터(관대): 캐시 있는 단지는 조건 충족 시만, 캐시 없으면 통과.
    if (priceMatched !== null && priceHasCache !== null) {
      const matched = priceMatched;
      const hasCache = priceHasCache;
      rows = rows.filter((r) => matched.has(r.id) || !hasCache.has(r.id));
    }

    const results = rows.slice(0, MAX_RESULTS).map((r) => ({
      complex_id: r.id,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
    }));

    return jsonResponse(results);
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
