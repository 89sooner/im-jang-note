/**
 * 워크스페이스 Realtime 구독 (FR-WS-003, frontend_architecture.md §4.5).
 * note/comment 변경(EVT-NOTE-001/002, EVT-CMT-001)을 수신해 React Query 캐시를
 * 무효화한다. 수신 데이터는 컴포넌트 상태로 두지 않고 단일 진실원(React Query)에 흡수.
 * RLS가 적용되므로 멤버 자기 워크스페이스 변경만 수신한다.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useWorkspaceRealtime(workspaceId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`ws:${workspaceId}`)
      // EVT-NOTE-001/002: 노트 생성/수정/삭제 → 피드/노트 캐시 무효화
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'note', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['notes', workspaceId] });
          const noteId = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id;
          if (noteId) qc.invalidateQueries({ queryKey: ['note', noteId] });
          qc.invalidateQueries({ queryKey: ['markers'] }); // 마커 노트보유 상태(FR-MAP-005)
        },
      )
      // EVT-CMT-001: 코멘트 생성 → 해당 노트 코멘트 캐시 무효화
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const noteId =
            (payload.new as { note_id?: string })?.note_id ??
            (payload.old as { note_id?: string })?.note_id;
          if (noteId) qc.invalidateQueries({ queryKey: ['comments', noteId] });
        },
      )
      // 알림 생성 → 알림 센터 캐시 무효화 (FR-NOTIFY-002)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification', filter: `workspace_id=eq.${workspaceId}` },
        () => qc.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
