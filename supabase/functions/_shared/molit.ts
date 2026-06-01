// 국토교통부 공공데이터 OpenAPI 어댑터(NFR-007: 공급자 교체 대비 정규화 캡슐화).
//
// 주의(키/지역코드 필요, 미설정 시 저하 모드):
//   - MOLIT_SERVICE_KEY env가 없으면 모든 호출은 UpstreamError를 throw하며
//     상위 함수는 캐시(stale) 폴백/저하 모드(NFR-004)로 동작한다.
//   - 실거래가 조회는 법정동 시군구코드(lawd_cd, 5자리)가 반드시 필요하다.
//   - 엔드포인트 URL은 국토부 표준(apis.data.go.kr) 기준의 합리적 추정이며,
//     공급자/스펙 변경 시 이 파일만 교체하면 된다.
//
// 응답은 XML(기본)일 수 있어 정규식 기반 경량 파서로 추출한다.

export class UpstreamError extends Error {
  readonly code = "DATA_UPSTREAM_UNAVAILABLE";
  constructor(message = "외부 데이터 공급자(국토부) 호출에 실패했습니다.") {
    super(message);
    this.name = "UpstreamError";
  }
}

const SERVICE_KEY = Deno.env.get("MOLIT_SERVICE_KEY") ?? "";
const TIMEOUT_MS = 8000;

// 국토부 표준 엔드포인트(합리적 추정).
const APT_BASIS_URL =
  "https://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3";
const APT_TRADE_URL =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

/** 8초 타임아웃 fetch. 실패·타임아웃·비정상 status면 UpstreamError. */
async function fetchText(url: string): Promise<string> {
  if (!SERVICE_KEY) throw new UpstreamError("MOLIT_SERVICE_KEY 미설정");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new UpstreamError(`upstream status ${res.status}`);
    const body = await res.text();
    // 국토부 표준 오류 바디(SERVICE ERROR / resultCode != 00) 감지.
    if (/<cmmMsgHeader>|<errMsg>|OpenAPI_ServiceResponse/i.test(body)) {
      throw new UpstreamError("upstream service error");
    }
    return body;
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    throw new UpstreamError(String((e as Error)?.message ?? e));
  } finally {
    clearTimeout(timer);
  }
}

/** XML 단일 태그 값 추출(CDATA 포함). */
function tag(xml: string, name: string): string | undefined {
  const m = xml.match(
    new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${name}>`, "i"),
  );
  const v = m?.[1]?.trim();
  return v && v.length > 0 ? v : undefined;
}

/** XML에서 <item>...</item> 블록들을 분리. */
function items(xml: string): string[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
}

/** 콤마/공백 제거 후 정수 파싱. */
function toInt(v: string | undefined): number | null {
  if (v == null) return null;
  const n = parseInt(v.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toNum(v: string | undefined): number | null {
  if (v == null) return null;
  const n = parseFloat(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface ComplexMeta {
  name?: string;
  address?: string;
  total_households?: number;
  build_year?: number;
}

/**
 * 공동주택 단지 기본정보 조회·정규화.
 * externalId(단지코드, kaptCode)가 있으면 우선 사용한다.
 */
export async function fetchComplexMeta(
  params: { externalId?: string | null; lawdCd?: string | null },
): Promise<ComplexMeta | null> {
  const { externalId } = params;
  // 단지 기본정보는 단지코드(kaptCode)가 핵심 키. 없으면 조회 불가 → 저하 모드.
  if (!externalId) return null;

  const qs = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    kaptCode: externalId,
    _type: "xml",
  });
  const xml = await fetchText(`${APT_BASIS_URL}?${qs.toString()}`);

  const name = tag(xml, "kaptName");
  const address = tag(xml, "kaptAddr") ?? tag(xml, "doroJuso");
  const households = toInt(tag(xml, "kaptdaCnt") ?? tag(xml, "hoCnt"));
  // 사용승인일(kaptUsedate, YYYYMMDD)에서 연도 추출.
  const useDate = tag(xml, "kaptUsedate");
  const buildYear = useDate ? toInt(useDate.slice(0, 4)) : null;

  if (!name && !address && households == null && buildYear == null) {
    return null;
  }
  return {
    name: name ?? undefined,
    address: address ?? undefined,
    total_households: households ?? undefined,
    build_year: buildYear ?? undefined,
  };
}

export interface TradeRow {
  deal_date: string; // YYYY-MM-DD
  area_m2: number;
  floor: number | null;
  price: number; // 만원 단위 정수
}

/**
 * 아파트 매매 실거래가 조회·정규화.
 * lawdCd(5자리 시군구코드), dealYmd(YYYYMM) 필요.
 */
export async function fetchTrades(
  params: { lawdCd: string; dealYmd: string },
): Promise<TradeRow[]> {
  const { lawdCd, dealYmd } = params;
  if (!lawdCd) throw new UpstreamError("lawd_cd 미지정");

  const qs = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    numOfRows: "1000",
    pageNo: "1",
    _type: "xml",
  });
  const xml = await fetchText(`${APT_TRADE_URL}?${qs.toString()}`);

  const rows: TradeRow[] = [];
  for (const it of items(xml)) {
    const year = tag(it, "dealYear") ?? dealYmd.slice(0, 4);
    const month = tag(it, "dealMonth") ?? dealYmd.slice(4, 6);
    const day = tag(it, "dealDay") ?? "1";
    const area = toNum(tag(it, "excluUseAr") ?? tag(it, "areaForExclusiveUse"));
    const floor = toInt(tag(it, "floor"));
    // dealAmount는 '만원' 단위 콤마 표기(예: "85,000").
    const price = toInt(tag(it, "dealAmount"));

    if (area == null || price == null) continue;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    rows.push({
      deal_date: `${year}-${mm}-${dd}`,
      area_m2: area,
      floor: floor,
      price: price,
    });
  }
  return rows;
}
