// fn:thumbnail_worker — JOB-MEDIA-001 (FR-MEDIA-001/002)
// Storage 업로드 완료 후 호출되는 썸네일 생성 워커(스켈레톤).
// 입력: { photo_id } 또는 Supabase Storage webhook payload.
// 썸네일 경로 규약: <원본경로 디렉터리>/<photo_id>_thumb.jpg
// 응답: { ok: true, photo_id }
//
// TODO: 실제 이미지 리사이즈는 추후 이미지 라이브러리(예: ImageMagick/sharp 호환)
//       로 대체한다. 현 단계는 thumbnail_path만 규약대로 기록한다(원본 참조).

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";

/**
 * 입력에서 photo_id를 추출한다.
 * - 직접 호출: { photo_id }
 * - Storage webhook: { record: { name, ... } } 형태에서 경로 끝 파일명으로 유추.
 *   (경로 규약 <ws>/<note>/<photo_id>.jpg 의 마지막 세그먼트 확장자 제거)
 */
async function readPhotoId(req: Request): Promise<string | null> {
  if (req.method !== "POST") return null;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return null;
  }

  if (typeof body?.photo_id === "string" && body.photo_id) {
    return body.photo_id;
  }

  // Storage webhook payload 폴백: record.name(객체 경로)에서 photo_id 추출.
  const record = body?.record as { name?: string } | undefined;
  const objectPath = typeof record?.name === "string" ? record.name : "";
  if (objectPath) {
    const file = objectPath.split("/").pop() ?? "";
    // 썸네일 자기 자신(_thumb)은 무시한다.
    if (file.endsWith("_thumb.jpg")) return null;
    const photoId = file.replace(/\.jpg$/i, "");
    if (photoId) return photoId;
  }
  return null;
}

/** 원본 storage_path로부터 썸네일 경로를 규약대로 계산한다. */
function thumbnailPathFor(storagePath: string, photoId: string): string {
  const slash = storagePath.lastIndexOf("/");
  const dir = slash >= 0 ? storagePath.slice(0, slash) : "";
  return dir ? `${dir}/${photoId}_thumb.jpg` : `${photoId}_thumb.jpg`;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    // 워커도 인증을 요구한다(서비스 호출 시 JWT 또는 service_role JWT 사용).
    await requireUser(req);

    const photoId = await readPhotoId(req);
    if (!photoId) {
      return errorResponse("VALIDATION", "photo_id가 필요합니다.", 400);
    }

    const db = adminClient();

    // 사진 메타 조회.
    const { data: photo, error: pErr } = await db
      .from("note_photo")
      .select("id, storage_path")
      .eq("id", photoId)
      .maybeSingle();
    if (pErr) return errorResponse("INTERNAL", "사진 조회 실패", 500);
    if (!photo) {
      return errorResponse("NOT_FOUND", "사진을 찾을 수 없습니다.", 404);
    }

    // TODO: 실제 리사이즈 — 원본을 내려받아 썸네일을 생성/업로드해야 한다.
    //       현 스켈레톤은 thumbnail_path만 규약대로 기록한다(원본 참조).
    const thumbnailPath = thumbnailPathFor(photo.storage_path, photoId);

    const { error: uErr } = await db
      .from("note_photo")
      .update({ thumbnail_path: thumbnailPath })
      .eq("id", photoId);
    if (uErr) {
      return errorResponse("INTERNAL", "썸네일 경로 갱신에 실패했습니다.", 500);
    }

    return jsonResponse({ ok: true, photo_id: photoId });
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
