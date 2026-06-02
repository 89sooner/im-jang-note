/**
 * 동기화 상태 클라이언트 상태 (frontend §4.2, FR-SYNC-002).
 * sync 스토어: 온라인 여부, 대기 작업 수, 마지막 동기화 시각, 부분실패 플래그.
 * C-013 SyncStatusBadge를 구동한다.
 */
import { create } from 'zustand';

interface SyncState {
  online: boolean;
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
  setOnline: (v: boolean) => void;
  setCounts: (pending: number, failed: number) => void;
  setSyncedAt: (iso: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  online: true,
  pending: 0,
  failed: 0,
  lastSyncedAt: null,
  setOnline: (online) => set({ online }),
  setCounts: (pending, failed) => set({ pending, failed }),
  setSyncedAt: (iso) => set({ lastSyncedAt: iso }),
}));
