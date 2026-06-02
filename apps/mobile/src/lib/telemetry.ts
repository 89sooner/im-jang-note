/**
 * 경량 클라이언트 텔레메트리 (NFR-006).
 * SLO/SLI 측정 단위(이벤트 이름)와 콘솔 출력만 담당. 운영에서는 외부 관측 도구로 라우팅한다.
 * 측정 단위(observability §1):
 *  - SLO-01 map_first_render_ms
 *  - SLO-02 marker_query_ms
 *  - SLO-03 note_save_ms
 *  - SLO-04 transactions_ms
 *  - SLO-05 realtime_lag_ms
 *  - SLO-06 sync_flush_outcome
 *  - SLO-07 push_delivery
 *  - SLO-08 crash_free_sessions
 */
type EventName =
  | 'map_first_render_ms'
  | 'marker_query_ms'
  | 'note_save_ms'
  | 'transactions_ms'
  | 'realtime_lag_ms'
  | 'sync_flush_outcome'
  | 'push_delivery'
  | 'app_error';

export function track(event: EventName, props: Record<string, unknown> = {}): void {
  // 운영 라우팅: external sink로 교체. 현재는 콘솔 + 추후 NetworkBuffer 큐로 흡수 가능.
  if (__DEV__) {
    console.log(`[telemetry] ${event}`, props);
  }
}

/** ms 단위 측정 헬퍼 */
export async function measure<T>(event: EventName, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    track(event, { ms: Date.now() - start, ok: true });
    return result;
  } catch (e) {
    track(event, { ms: Date.now() - start, ok: false, error: String((e as Error)?.message ?? e) });
    throw e;
  }
}
