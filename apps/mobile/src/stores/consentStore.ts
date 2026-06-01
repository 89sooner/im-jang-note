/**
 * 동의 상태 (ADR-006, FR-SET-002, NFR-003).
 * 목적별 개별 동의. 사진 EXIF는 업로드 시점에 제거(picker exif:false).
 * 운영에서는 user_profile.consents(API-SET-001)로 서버 영속(REL-005).
 */
import { create } from 'zustand';

interface ConsentState {
  photo: boolean;
  location: boolean;
  setPhoto: (v: boolean) => void;
  setLocation: (v: boolean) => void;
}

export const useConsentStore = create<ConsentState>((set) => ({
  photo: false,
  location: false,
  setPhoto: (photo) => set({ photo }),
  setLocation: (location) => set({ location }),
}));
