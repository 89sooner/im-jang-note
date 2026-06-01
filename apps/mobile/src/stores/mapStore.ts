/**
 * 지도 뷰포트 클라이언트 상태 (frontend_architecture.md §4.2).
 * 빈번 변경이므로 서버상태(React Query)와 분리(NFR-001).
 */
import { create } from 'zustand';
import type { BBox } from '@/types/database';

interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  bbox: BBox | null;
  selectedComplexId: string | null;
  setViewport: (center: { lat: number; lng: number }, zoom: number, bbox: BBox) => void;
  setSelected: (complexId: string | null) => void;
}

// 기본 중심: 서울시청 (현위치 권한 전 폴백)
export const useMapStore = create<MapState>((set) => ({
  center: { lat: 37.5663, lng: 126.9779 },
  zoom: 14,
  bbox: null,
  selectedComplexId: null,
  setViewport: (center, zoom, bbox) => set({ center, zoom, bbox }),
  setSelected: (selectedComplexId) => set({ selectedComplexId }),
}));
