/**
 * 검색 API (API-SEARCH-001/002) — fn:search Edge Function.
 */
import { supabase } from '@/lib/supabase';
import type { BBox, SearchFilters, SearchResult } from '@/types/database';

export async function search(opts: {
  query?: string;
  bbox?: BBox;
  filters?: SearchFilters;
  workspaceId?: string;
}): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('search', {
    body: {
      query: opts.query,
      bbox: opts.bbox,
      filters: opts.filters,
      workspace_id: opts.workspaceId,
    },
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error?: { code?: string } }).error;
    if (e?.code) throw new Error(e.code);
  }
  return (data as SearchResult[]) ?? [];
}
