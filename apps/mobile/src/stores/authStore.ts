/**
 * 세션/현재 워크스페이스 클라이언트 상태 (ADR-007, frontend_architecture.md §4.2).
 * 원격 truth(프로필/멤버십)는 React Query가 소유하고, 여기에는 세션과
 * 활성 워크스페이스 선택/역할 같은 ephemeral 상태만 둔다.
 */
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { WorkspaceRole } from '@/types/database';

interface AuthState {
  session: Session | null;
  initializing: boolean;
  activeWorkspaceId: string | null;
  activeRole: WorkspaceRole | null;
  setSession: (session: Session | null) => void;
  setInitializing: (value: boolean) => void;
  setActiveWorkspace: (id: string | null, role: WorkspaceRole | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  activeWorkspaceId: null,
  activeRole: null,
  setSession: (session) => set({ session }),
  setInitializing: (initializing) => set({ initializing }),
  setActiveWorkspace: (activeWorkspaceId, activeRole) =>
    set({ activeWorkspaceId, activeRole }),
  reset: () =>
    set({ session: null, activeWorkspaceId: null, activeRole: null }),
}));
