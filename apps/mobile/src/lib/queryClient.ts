/**
 * React Query 클라이언트 (ADR-007).
 * 서버상태 단일 진실원. stale-while-revalidate 기본값(NFR-001).
 * Realtime 이벤트는 invalidateQueries로 흡수(frontend_architecture.md §4.5).
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** 워크스페이스 단위 격리 queryKey 네임스페이스 (frontend_architecture.md §4.1) */
export const queryKeys = {
  myProfile: () => ['profile', 'me'] as const,
  myWorkspaces: () => ['workspaces', 'me'] as const,
  members: (wsId: string) => ['members', wsId] as const,
};
