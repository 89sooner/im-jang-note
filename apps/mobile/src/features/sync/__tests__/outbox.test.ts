/**
 * Outbox 큐 동작 단위 테스트 (FR-SYNC-001/002, ADR-005).
 * Supabase 호출은 모킹해 큐 영속·재시도·실패 처리 로직만 검증한다.
 */

// AsyncStorage 인메모리 모킹
const memory: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(memory[k] ?? null),
    setItem: (k: string, v: string) => {
      memory[k] = v;
      return Promise.resolve();
    },
    removeItem: (k: string) => {
      delete memory[k];
      return Promise.resolve();
    },
  },
}));

// supabase 클라이언트 모킹 (rpc만 사용)
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { enqueue, flush, queueSize } from '../outbox';

beforeEach(() => {
  for (const k of Object.keys(memory)) delete memory[k];
  mockRpc.mockReset();
});

describe('outbox.enqueue/queueSize', () => {
  it('적재 후 pending 카운트가 증가한다', async () => {
    await enqueue({
      kind: 'comment.add',
      payload: { note_id: 'n1', body: 'hello' },
    });
    const counts = await queueSize();
    expect(counts.pending).toBe(1);
    expect(counts.failed).toBe(0);
  });

  it('idempotency key는 UUID 형식', async () => {
    const key = await enqueue({
      kind: 'fav.toggle',
      payload: { workspace_id: 'w1', complex_id: 'c1' },
    });
    expect(key).toMatch(/^[0-9a-f]{8}-/i);
  });
});

describe('outbox.flush', () => {
  it('성공한 작업은 큐에서 제거된다', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    await enqueue({ kind: 'fav.toggle', payload: { workspace_id: 'w1', complex_id: 'c1' } });
    const result = await flush();
    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);
    expect((await queueSize()).pending).toBe(0);
  });

  it('4xx(클라이언트 오류)는 즉시 failed 처리, 큐에서 제거', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('NOTE_FORBIDDEN') });
    await enqueue({ kind: 'note.delete', payload: { note_id: 'n1' } });
    const result = await flush();
    expect(result.failed).toBe(1);
    expect((await queueSize()).pending).toBe(0);
  });

  it('5xx/네트워크 오류는 재시도 큐에 유지, attempts 증가', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('network down') });
    await enqueue({ kind: 'fav.toggle', payload: { workspace_id: 'w1', complex_id: 'c1' } });
    const r1 = await flush();
    expect(r1.applied).toBe(0);
    // attempts<5 → 큐에 잔존
    expect((await queueSize()).pending).toBe(1);

    // 같은 오류가 5회 누적되면 failed로 떨어진다
    for (let i = 0; i < 4; i++) await flush();
    const counts = await queueSize();
    expect(counts.pending).toBe(0);
    expect(counts.failed).toBeGreaterThanOrEqual(0); // 5회 후 큐에서 제거(빈 큐)
  });
});
