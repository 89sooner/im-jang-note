/**
 * 코멘트 API (API-COMMENT-001/002).
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { Comment } from '@/types/database';

/** API-COMMENT-002 코멘트 목록 (note별, 시간순) */
export async function fetchComments(noteId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comment')
    .select('id, note_id, workspace_id, author_id, body, created_at')
    .eq('note_id', noteId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Comment[];
}

/** API-COMMENT-001 코멘트 작성 (FR-COMMENT-001) */
export async function addComment(noteId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase.rpc('rpc_add_comment', {
    p_note_id: noteId,
    p_body: body,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as Comment;
}
