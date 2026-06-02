/**
 * 온라인 복귀 감지 + 큐 자동 flush 훅 (FR-SYNC-002).
 * 네트워크 상태는 expo-network 폴링(저비용)으로 단순화.
 * 운영에서는 @react-native-community/netinfo 권장.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { flush, queueSize } from './outbox';
import { useSyncStore } from '@/stores/syncStore';

const POLL_MS = 8000;

export function useOutbox() {
  const qc = useQueryClient();
  const setOnline = useSyncStore((s) => s.setOnline);
  const setCounts = useSyncStore((s) => s.setCounts);
  const setSyncedAt = useSyncStore((s) => s.setSyncedAt);

  useEffect(() => {
    let cancelled = false;
    let prevOnline = true;

    async function tick() {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = !!state.isInternetReachable;
        setOnline(online);

        const counts = await queueSize();
        setCounts(counts.pending, counts.failed);

        // 오프라인 → 온라인 전환 또는 대기 작업 있을 때 flush
        if (online && (counts.pending > 0 || !prevOnline)) {
          const result = await flush();
          if (result.applied > 0) {
            setSyncedAt(new Date().toISOString());
            // EVT-SYNC-001: 변경된 도메인 캐시 일괄 무효화
            qc.invalidateQueries({ queryKey: ['notes'] });
            qc.invalidateQueries({ queryKey: ['comments'] });
            qc.invalidateQueries({ queryKey: ['favorites'] });
            qc.invalidateQueries({ queryKey: ['markers'] });
          }
          const after = await queueSize();
          setCounts(after.pending, after.failed);
        }
        prevOnline = online;
      } catch {
        /* 네트워크 모듈 미설치/거부 시 조용히 건너뜀 */
      }
    }

    tick();
    const handle = setInterval(() => {
      if (!cancelled) tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [qc, setOnline, setCounts, setSyncedAt]);
}
