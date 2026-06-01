/**
 * 즐겨찾기 React Query 훅 (frontend_architecture.md §4.1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFavorites, toggleFavorite } from './api';

export function useFavorites(workspaceId: string | null) {
  return useQuery({
    queryKey: ['favorites', workspaceId],
    queryFn: () => fetchFavorites(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useToggleFavorite(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (complexId: string) => toggleFavorite(workspaceId as string, complexId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites', workspaceId] });
      qc.invalidateQueries({ queryKey: ['markers'] }); // FR-MAP-005 마커 상태
    },
  });
}
