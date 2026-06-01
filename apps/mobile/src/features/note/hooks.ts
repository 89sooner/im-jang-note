/**
 * 노트 React Query 훅 (frontend_architecture.md §4.1).
 * queryKey는 워크스페이스 단위 격리.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { NoteInput } from '@/types/database';
import { deleteNote, fetchNoteDetail, fetchNotes, saveNote } from './api';

export function useNotes(workspaceId: string | null, complexId?: string) {
  return useInfiniteQuery({
    queryKey: ['notes', workspaceId, complexId ?? 'all'],
    enabled: !!workspaceId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchNotes({
        workspaceId: workspaceId as string,
        complexId,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useNoteDetail(noteId: string | null) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: () => fetchNoteDetail(noteId as string),
    enabled: !!noteId,
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) => saveNote(input),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes', note.workspace_id] });
      qc.invalidateQueries({ queryKey: ['note', note.note_id] });
    },
  });
}

export function useDeleteNote(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', workspaceId] }),
  });
}
