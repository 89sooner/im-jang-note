/**
 * 클라이언트 생성 idempotency key (UUID).
 * 오프라인 outbox 재생 중복 방지(FR-SYNC-002, data_model §6).
 * REL-001에서는 워크스페이스 생성/초대/수락 RPC에 사용.
 */
export function newIdempotencyKey(): string {
  // expo/react-native 환경의 crypto.randomUUID 사용, 폴백 포함
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
