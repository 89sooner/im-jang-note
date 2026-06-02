import { newIdempotencyKey } from '../idempotency';

describe('newIdempotencyKey (FR-SYNC-002)', () => {
  it('UUID 유사 형식을 반환한다', () => {
    const k = newIdempotencyKey();
    expect(k).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('충돌 없이 매번 다른 값', () => {
    const keys = new Set(Array.from({ length: 100 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(100);
  });
});
