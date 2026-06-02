/**
 * 즐겨찾기 API (API-FAV-001/002). 워크스페이스 공유 후보.
 */
import { supabase } from '@/lib/supabase';
import { newIdempotencyKey } from '@/lib/idempotency';
import type { Favorite } from '@/types/database';

/** API-FAV-001 즐겨찾기 목록 (FR-FAV-001) */
export async function fetchFavorites(workspaceId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorite')
    .select('id, workspace_id, complex_id, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Favorite[];
}

/** API-FAV-002 즐겨찾기 토글 (FR-FAV-001) */
export async function toggleFavorite(
  workspaceId: string,
  complexId: string,
): Promise<{ favorited: boolean; complex_id: string }> {
  const { data, error } = await supabase.rpc('rpc_toggle_favorite', {
    p_workspace_id: workspaceId,
    p_complex_id: complexId,
    p_idempotency_key: newIdempotencyKey(),
  });
  if (error) throw error;
  return data as { favorited: boolean; complex_id: string };
}
