/**
 * 오프라인 outbox (FR-SYNC-001/002, ADR-005).
 *
 * 영속: AsyncStorage(키 'imjang.outbox.v1'). 운영 SQLite 이관은 후속 작업.
 * 멱등: 작업당 client-generated idempotency_key(uuid). 서버는 idem_lookup으로 중복 제거.
 * 재생: FIFO. 5xx/네트워크 오류는 지수 백오프, 4xx(권한/검증)는 failed로 표기 후 큐에서 제거.
 *
 * 지원 작업:
 *  - 'note.save'   (rpc_save_note,   API-NOTE-001)
 *  - 'note.delete' (rpc_delete_note, API-NOTE-002)
 *  - 'comment.add' (rpc_add_comment, API-COMMENT-001)
 *  - 'fav.toggle'  (rpc_toggle_favorite, API-FAV-002)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newIdempotencyKey } from '@/lib/idempotency';
import { supabase } from '@/lib/supabase';
import type { ChecklistItem, NoteInput } from '@/types/database';

const STORAGE_KEY = 'imjang.outbox.v1';

export type OutboxOp =
  | {
      kind: 'note.save';
      id: string;
      payload: NoteInput;
      clientUpdatedAt: string;
      attempts: number;
      lastError?: string;
    }
  | {
      kind: 'note.delete';
      id: string;
      payload: { note_id: string };
      attempts: number;
      lastError?: string;
      clientUpdatedAt: string;
    }
  | {
      kind: 'comment.add';
      id: string;
      payload: { note_id: string; body: string };
      attempts: number;
      lastError?: string;
      clientUpdatedAt: string;
    }
  | {
      kind: 'fav.toggle';
      id: string;
      payload: { workspace_id: string; complex_id: string };
      attempts: number;
      lastError?: string;
      clientUpdatedAt: string;
    };

async function readQueue(): Promise<OutboxOp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(ops: OutboxOp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

/** 새 작업을 큐에 추가하고 idempotency_key를 반환한다(노트의 경우 미리 확보). */
export async function enqueue(op: Omit<OutboxOp, 'id' | 'attempts' | 'clientUpdatedAt'>): Promise<string> {
  const id = newIdempotencyKey();
  const next: OutboxOp = {
    ...(op as OutboxOp),
    id,
    attempts: 0,
    clientUpdatedAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(next);
  await writeQueue(queue);
  return id;
}

export async function queueSize(): Promise<{ pending: number; failed: number }> {
  const q = await readQueue();
  let pending = 0;
  let failed = 0;
  for (const op of q) {
    if (op.attempts >= 5 && op.lastError) failed++;
    else pending++;
  }
  return { pending, failed };
}

function isClientError(error: unknown): boolean {
  // 4xx로 분류할 수 있는 검증/권한 오류 코드 — 재시도 의미 없음
  const msg = String((error as Error)?.message ?? error ?? '');
  return /VALIDATION_FAILED|FORBIDDEN|NOT_FOUND|CAPACITY_FULL|INVITE_EXPIRED|LIMIT_EXCEEDED/.test(msg);
}

async function runOnce(op: OutboxOp): Promise<void> {
  switch (op.kind) {
    case 'note.save': {
      const { data, error } = await supabase.rpc('rpc_save_note', {
        p_note_id: op.payload.note_id ?? null,
        p_workspace_id: op.payload.workspace_id,
        p_complex_id: op.payload.complex_id,
        p_visited_at: op.payload.visited_at,
        p_rating: op.payload.rating,
        p_free_memo: op.payload.free_memo,
        p_checklist: op.payload.checklist as unknown as ChecklistItem[],
        p_idempotency_key: op.id,
      });
      if (error) throw error;
      void data;
      return;
    }
    case 'note.delete': {
      const { error } = await supabase.rpc('rpc_delete_note', {
        p_note_id: op.payload.note_id,
        p_idempotency_key: op.id,
      });
      if (error) throw error;
      return;
    }
    case 'comment.add': {
      const { error } = await supabase.rpc('rpc_add_comment', {
        p_note_id: op.payload.note_id,
        p_body: op.payload.body,
        p_idempotency_key: op.id,
      });
      if (error) throw error;
      return;
    }
    case 'fav.toggle': {
      const { error } = await supabase.rpc('rpc_toggle_favorite', {
        p_workspace_id: op.payload.workspace_id,
        p_complex_id: op.payload.complex_id,
        p_idempotency_key: op.id,
      });
      if (error) throw error;
      return;
    }
  }
}

/** 큐를 FIFO로 직렬 flush. 결과: 적용/실패 카운트. (EVT-SYNC-001 트리거용) */
export async function flush(): Promise<{ applied: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { applied: 0, failed: 0 };

  let applied = 0;
  let failed = 0;
  const remaining: OutboxOp[] = [];

  for (const op of queue) {
    try {
      await runOnce(op);
      applied++;
    } catch (e) {
      const msg = String((e as Error)?.message ?? e ?? '');
      if (isClientError(e)) {
        failed++;
      } else {
        // 5xx/네트워크: 재시도 큐에 유지(최대 5회)
        const next = { ...op, attempts: op.attempts + 1, lastError: msg };
        if (next.attempts < 5) remaining.push(next);
        else failed++;
      }
    }
  }

  await writeQueue(remaining);
  return { applied, failed };
}
