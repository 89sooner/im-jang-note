/**
 * 노트 API (API-NOTE-001~004, API-MEDIA-001).
 * 저장/삭제는 RPC(원자 트랜잭션), 목록/상세는 PostgREST, 사진은 Edge Function 서명 URL.
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type {
  ChecklistItem,
  NoteDetail,
  NoteInput,
  NoteSummary,
  Photo,
  UploadUrl,
} from '@/types/database';

/** API-NOTE-001 노트+체크리스트 원자 저장 (FR-NOTE-001~004/006) */
export async function saveNote(input: NoteInput): Promise<NoteSummary> {
  const { data, error } = await supabase.rpc('rpc_save_note', {
    p_note_id: input.note_id ?? null,
    p_workspace_id: input.workspace_id,
    p_complex_id: input.complex_id,
    p_visited_at: input.visited_at,
    p_rating: input.rating,
    p_free_memo: input.free_memo,
    p_checklist: input.checklist,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as NoteSummary;
}

/** API-NOTE-002 노트 소프트 삭제 (FR-NOTE-006) */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_delete_note', {
    p_note_id: noteId,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
}

/** API-NOTE-003 노트 목록 (최신/단지순, cursor 페이지네이션) (FR-NOTE-005) */
export async function fetchNotes(opts: {
  workspaceId: string;
  complexId?: string;
  sort?: 'latest' | 'by_complex';
  cursor?: string | null;
  limit?: number;
}): Promise<{ items: NoteSummary[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 20;
  let query = supabase
    .from('note')
    .select('id, workspace_id, complex_id, author_id, rating, visited_at, free_memo, created_at')
    .eq('workspace_id', opts.workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (opts.complexId) query = query.eq('complex_id', opts.complexId);
  if (opts.cursor) query = query.lt('created_at', opts.cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((r) => ({
    note_id: r.id as string,
    workspace_id: r.workspace_id as string,
    complex_id: r.complex_id as string,
    author_id: r.author_id as string,
    rating: r.rating as number,
    visited_at: r.visited_at as string,
    free_memo: (r.free_memo as string) ?? '',
    created_at: r.created_at as string,
  }));
  const nextCursor = hasMore ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}

/** API-NOTE-004 노트 상세(체크리스트+사진) (FR-NOTE-002/004) */
export async function fetchNoteDetail(noteId: string): Promise<NoteDetail> {
  const { data, error } = await supabase
    .from('note')
    .select(
      'id, workspace_id, complex_id, author_id, rating, visited_at, free_memo, created_at,' +
        ' note_checklist(category, score, memo),' +
        ' note_photo(id, storage_path, thumbnail_path)',
    )
    .eq('id', noteId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;

  const r = data as any;
  const photos: Photo[] = (r.note_photo ?? []).map((p: any) => ({
    id: p.id,
    storage_path: p.storage_path,
    thumbnail_path: p.thumbnail_path,
  }));
  // 비공개 버킷 → 서명 다운로드 URL 발급
  for (const photo of photos) {
    const { data: signed } = await supabase.storage
      .from('note-photos')
      .createSignedUrl(photo.thumbnail_path ?? photo.storage_path, 60 * 60);
    photo.signed_url = signed?.signedUrl;
  }

  return {
    note_id: r.id,
    workspace_id: r.workspace_id,
    complex_id: r.complex_id,
    author_id: r.author_id,
    rating: r.rating,
    visited_at: r.visited_at,
    free_memo: r.free_memo ?? '',
    created_at: r.created_at,
    checklist: (r.note_checklist ?? []) as ChecklistItem[],
    photos,
  };
}

/** API-MEDIA-001 사진 업로드 서명 URL 발급 (FR-MEDIA-001) */
export async function requestUploadUrls(
  noteId: string,
  count: number,
): Promise<UploadUrl[]> {
  const { data, error } = await supabase.functions.invoke('media_upload_url', {
    body: { note_id: noteId, count, idempotency_key: newIdempotencyKey() },
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error?: { code?: string } }).error;
    if (e?.code) throw new Error(e.code);
  }
  return (data as { upload_urls: UploadUrl[] }).upload_urls;
}

/** 서명 URL로 사진 바이너리 업로드 (EXIF는 picker에서 제거됨, ADR-006) */
export async function uploadPhoto(uploadUrl: UploadUrl, fileUri: string): Promise<void> {
  const res = await fetch(fileUri);
  const blob = await res.blob();
  const { error } = await supabase.storage
    .from('note-photos')
    .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
}
