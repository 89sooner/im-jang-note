/**
 * 워크스페이스 React Query 훅 (frontend_architecture.md §4.1).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  fetchMembers,
  fetchMyWorkspaces,
} from './api';

export function useMyWorkspaces() {
  const session = useAuthStore((s) => s.session);
  return useQuery({
    queryKey: queryKeys.myWorkspaces(),
    queryFn: fetchMyWorkspaces,
    enabled: !!session,
  });
}

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.members(workspaceId ?? 'none'),
    queryFn: () => fetchMembers(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myWorkspaces() }),
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: (workspaceId: string) => createInvite(workspaceId),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => acceptInvite(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myWorkspaces() }),
  });
}
