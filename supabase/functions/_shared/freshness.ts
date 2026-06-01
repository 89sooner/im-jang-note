// 캐시 신선도(TTL) 계산. ADR-004: 키별 TTL + stale-while-revalidate.
// - 단지 메타: 30일.
// - 실거래가: 현재월 24시간 / 과거월 7일.
// freshness 메타 형식은 NFR-004 저하 모드 표기를 위해 고정한다.

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPLEX_TTL_MS = 30 * DAY_MS; // 단지 메타 30일
const TX_CURRENT_TTL_MS = 24 * 60 * 60 * 1000; // 현재월 24시간
const TX_PAST_TTL_MS = 7 * DAY_MS; // 과거월 7일

/** 응답에 실리는 신선도 메타. */
export interface Freshness {
  fetched_at: string | null;
  is_stale: boolean;
  source: "국토부";
}

function ageMs(fetchedAt: string | null | undefined): number {
  if (!fetchedAt) return Number.POSITIVE_INFINITY;
  const t = new Date(fetchedAt).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Date.now() - t;
}

/** 단지 메타가 stale(30일 초과)인지. */
export function isComplexStale(fetchedAt: string | null | undefined): boolean {
  return ageMs(fetchedAt) > COMPLEX_TTL_MS;
}

/** 실거래가가 stale인지. dealMonthIsCurrent면 24h, 아니면 7d 기준. */
export function isTxStale(
  fetchedAt: string | null | undefined,
  dealMonthIsCurrent: boolean,
): boolean {
  const ttl = dealMonthIsCurrent ? TX_CURRENT_TTL_MS : TX_PAST_TTL_MS;
  return ageMs(fetchedAt) > ttl;
}

/** freshness 메타 빌더(NFR-004). */
export function buildFreshness(
  fetchedAt: string | null | undefined,
  isStale: boolean,
): Freshness {
  return {
    fetched_at: fetchedAt ?? null,
    is_stale: isStale,
    source: "국토부",
  };
}
