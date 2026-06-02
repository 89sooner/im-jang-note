/**
 * 알림 React Query 훅 (frontend_architecture.md §4.1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markRead } from './api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
