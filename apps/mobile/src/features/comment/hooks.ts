/**
 * 코멘트 React Query 훅 (frontend_architecture.md §4.1).
 * 작성은 낙관적 업데이트 + Realtime 수신 시 캐시 수렴.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment, fetchComments } from './api';

export function useComments(noteId: string | null) {
  return useQuery({
    queryKey: ['comments', noteId],
    queryFn: () => fetchComments(noteId as string),
    enabled: !!noteId,
  });
}

export function useAddComment(noteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(noteId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', noteId] }),
  });
}
