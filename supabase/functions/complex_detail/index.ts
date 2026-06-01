// fn:complex_detail — API-DATA-001 (FR-DATA-001/003)
// 단지 기본정보를 캐시 우선으로 반환한다(ADR-004 stale-while-revalidate).
// 입력: { complex_id } (GET query 또는 POST body).
// 응답 DTO:
//   { complex_id, name, address, total_households, build_year, lat, lng, freshness }

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";
import { buildFreshness, isComplexStale } from "../_shared/freshness.ts";
import { fetchComplexMeta, UpstreamError } from "../_shared/molit.ts";

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

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    await requireUser(req);

    const complexId = await readComplexId(req);
    if (!complexId) {
      return errorResponse("VALIDATION", "complex_id가 필요합니다.", 400);
    }

    const db = adminClient();
    const { data: row, error } = await db
      .from("complex")
      .select(
        "id, external_id, name, address, lat, lng, lawd_cd, total_households, build_year, fetched_at",
      )
      .eq("id", complexId)
      .maybeSingle();

    if (error) {
      return errorResponse("INTERNAL", "단지 조회 실패", 500);
    }
    if (!row) {
      return errorResponse("NOT_FOUND", "단지를 찾을 수 없습니다.", 404);
    }

    let merged = row;
    let isStale = isComplexStale(row.fetched_at);

    if (isStale) {
      // stale → 외부 재조회 시도. 성공 시 upsert 후 fresh 반환.
      try {
        const meta = await fetchComplexMeta({
          externalId: row.external_id,
          lawdCd: row.lawd_cd,
        });
        if (meta) {
          const now = new Date().toISOString();
          const patch = {
            name: meta.name ?? row.name,
            address: meta.address ?? row.address,
            total_households: meta.total_households ?? row.total_households,
            build_year: meta.build_year ?? row.build_year,
            fetched_at: now,
          };
          const { data: updated } = await db
            .from("complex")
            .update(patch)
            .eq("id", complexId)
            .select(
              "id, name, address, lat, lng, total_households, build_year, fetched_at",
            )
            .maybeSingle();
          merged = { ...row, ...patch, ...(updated ?? {}) };
          isStale = false;
        }
        // meta=null이면 외부에서 조회 불가 → 캐시 + 저하 모드 유지.
      } catch (e) {
        // 외부 장애: 캐시 + is_stale=true 저하 모드 반환(NFR-004).
        if (!(e instanceof UpstreamError)) throw e;
      }
    }

    return jsonResponse({
      complex_id: merged.id,
      name: merged.name,
      address: merged.address,
      total_households: merged.total_households,
      build_year: merged.build_year,
      lat: merged.lat,
      lng: merged.lng,
      freshness: buildFreshness(merged.fetched_at, isStale),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
