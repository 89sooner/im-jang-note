// fn:media_upload_url — API-MEDIA-001 (FR-MEDIA-001)
// 노트 사진 업로드용 서명 URL을 발급한다(비공개 버킷 'note-photos', NFR-002).
// 경로 규약: <workspace_id>/<note_id>/<photo_id>.jpg
// 개인정보(ADR-006): EXIF GPS 제거는 클라이언트(expo-image-picker exif:false)
//   에서 처리하므로 본 함수는 메타데이터만 다룬다(원본 바이트 미접근).
// 입력: { note_id, count, idempotency_key } (POST JSON).
// 응답 DTO:
//   { upload_urls: [{ photo_id, path, signed_url, token }], photo_ids: string[] }

import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { adminClient, AuthError, requireUser } from "../_shared/client.ts";

const BUCKET = "note-photos";
const MAX_PHOTOS_PER_NOTE = 10; // 노트당 사진 한도(MEDIA_LIMIT_EXCEEDED).

interface Input {
  note_id: string;
  count: number;
  idempotency_key?: string;
}

interface UploadUrlItem {
  photo_id: string;
  path: string;
  signed_url: string;
  token: string;
}

interface ResultDto {
  upload_urls: UploadUrlItem[];
  photo_ids: string[];
}

// ---------------------------------------------------------------------------
// 멱등성(idempotency): 영속 idempotency 테이블/헬퍼가 _shared에 없으므로
// 워커 인스턴스 메모리 기준 best-effort 캐시로 단순 구현한다.
// 동일 idempotency_key 재요청 시 같은 결과 DTO를 그대로 반환한다.
// 한계: 인스턴스 재시작/스케일아웃 시 캐시가 유실되어 중복 발급될 수 있다.
//       완전한 멱등 보장은 추후 idempotency_key 테이블로 보강한다(TODO).
// ---------------------------------------------------------------------------
const idempotencyCache = new Map<string, ResultDto>();

/** POST JSON body에서 입력을 추출하고 검증한다. */
async function readInput(req: Request): Promise<Input | null> {
  if (req.method !== "POST") return null;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return null;
  }
  const noteId = typeof body?.note_id === "string" ? body.note_id : "";
  const count = Number(body?.count);
  const idempotencyKey = typeof body?.idempotency_key === "string"
    ? body.idempotency_key
    : undefined;

  if (!noteId) return null;
  if (!Number.isInteger(count) || count < 1) return null;

  return { note_id: noteId, count, idempotency_key: idempotencyKey };
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const user = await requireUser(req);

    const input = await readInput(req);
    if (!input) {
      return errorResponse(
        "VALIDATION",
        "note_id와 1 이상의 count가 필요합니다.",
        400,
      );
    }

    // 멱등 캐시 적중 시 동일 결과 즉시 반환.
    if (input.idempotency_key) {
      const cached = idempotencyCache.get(input.idempotency_key);
      if (cached) return jsonResponse(cached);
    }

    const db = adminClient();

    // 노트 조회(삭제분 제외).
    const { data: note, error: nErr } = await db
      .from("note")
      .select("id, workspace_id, author_id, deleted_at")
      .eq("id", input.note_id)
      .maybeSingle();
    if (nErr) return errorResponse("INTERNAL", "노트 조회 실패", 500);
    if (!note || note.deleted_at) {
      return errorResponse("NOTE_NOT_FOUND", "노트를 찾을 수 없습니다.", 404);
    }

    // 권한: 작성자 본인이거나 노트 워크스페이스의 멤버여야 한다.
    let allowed = note.author_id === user.id;
    if (!allowed) {
      const { data: member, error: mErr } = await db
        .from("workspace_member")
        .select("user_id")
        .eq("workspace_id", note.workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (mErr) return errorResponse("INTERNAL", "권한 조회 실패", 500);
      allowed = !!member;
    }
    if (!allowed) {
      return errorResponse("NOTE_FORBIDDEN", "노트 접근 권한이 없습니다.", 403);
    }

    // 한도: 기존 사진 수 + 요청 count > 10 이면 413.
    const { count: existingCount, error: cErr } = await db
      .from("note_photo")
      .select("id", { count: "exact", head: true })
      .eq("note_id", input.note_id);
    if (cErr) return errorResponse("INTERNAL", "사진 수 조회 실패", 500);
    if ((existingCount ?? 0) + input.count > MAX_PHOTOS_PER_NOTE) {
      return errorResponse(
        "MEDIA_LIMIT_EXCEEDED",
        `노트당 사진은 최대 ${MAX_PHOTOS_PER_NOTE}장까지 등록할 수 있습니다.`,
        413,
      );
    }

    // count개의 photo_id 생성 → 경로 규약 산출 → 서명 업로드 URL 발급 + 메타 insert.
    const uploadUrls: UploadUrlItem[] = [];
    const photoIds: string[] = [];

    for (let i = 0; i < input.count; i++) {
      const photoId = crypto.randomUUID();
      const path = `${note.workspace_id}/${input.note_id}/${photoId}.jpg`;

      const { data: signed, error: sErr } = await db.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (sErr || !signed) {
        return errorResponse("INTERNAL", "서명 URL 발급에 실패했습니다.", 500);
      }

      // note_photo 메타 선 insert(thumbnail/width/height/bytes는 업로드 후 워커가 갱신).
      const { error: iErr } = await db.from("note_photo").insert({
        id: photoId,
        note_id: input.note_id,
        workspace_id: note.workspace_id,
        storage_path: path,
        thumbnail_path: null,
        width: null,
        height: null,
        bytes: null,
        created_by: user.id,
      });
      if (iErr) {
        return errorResponse("INTERNAL", "사진 메타 저장에 실패했습니다.", 500);
      }

      uploadUrls.push({
        photo_id: photoId,
        path,
        signed_url: signed.signedUrl,
        token: signed.token,
      });
      photoIds.push(photoId);
    }

    const result: ResultDto = { upload_urls: uploadUrls, photo_ids: photoIds };

    if (input.idempotency_key) {
      idempotencyCache.set(input.idempotency_key, result);
    }

    return jsonResponse(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return errorResponse(e.code, e.message, 401);
    }
    return errorResponse("INTERNAL", "처리 중 오류가 발생했습니다.", 500);
  }
});
