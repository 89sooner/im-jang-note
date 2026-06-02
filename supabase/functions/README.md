# 임장노트 Edge Functions (Deno/TypeScript)

외부 연동(국토교통부 OpenAPI·Expo Push)과 서버 측 처리(사진 서명 URL·검색)를 담당하는 Supabase Edge Functions다. 클라이언트가 외부 API를 직접 호출하지 않도록 경유·정규화·캐시한다.
근거: FR-DATA-001~004/FR-MEDIA-001/FR-SEARCH-001~002/FR-NOTIFY-001~002, NFR-002/004/007, ADR-004(Postgres 캐시 + 키별 TTL + stale-while-revalidate).

## 함수 목록

### 국토부 데이터 (REL-002)

| 함수 | API ID | 입력 | 응답 DTO |
| --- | --- | --- | --- |
| `complex_detail` | API-DATA-001 | `{ complex_id }` | `{ complex_id, name, address, total_households, build_year, lat, lng, freshness }` |
| `transactions` | API-DATA-002 | `{ complex_id, area_range?: [min,max], period?: months(기본 12) }` | `{ complex_id, items: [{deal_date, area_m2, floor, price}], trend: [{month, avg_price, count}], freshness }` |
| `refresh_complex_data` | API-DATA-003 | `{ complex_id }` | `{ job_id }` |

### 미디어 (REL-003)

| 함수 | API ID / JOB | 입력 | 응답 DTO |
| --- | --- | --- | --- |
| `media_upload_url` | API-MEDIA-001 | `{ note_id, count, idempotency_key }` | `{ upload_urls: [{photo_id, path, signed_url, token}], photo_ids: [] }` |
| `thumbnail_worker` | JOB-MEDIA-001 | `{ photo_id }` 또는 Storage webhook | `{ ok, photo_id }` |

### 검색·알림 (REL-005)

| 함수 | API ID / JOB | 입력 | 응답 DTO |
| --- | --- | --- | --- |
| `search` | API-SEARCH-001/002 | `{ query?, bbox?, filters?:{price_range,area,rating_min}, workspace_id? }` | `[{ complex_id, name, address, lat, lng }]` (최대 50) |
| `notify_worker` | JOB-NOTIFY-001 | `{ limit? }` + `x-cron-secret` 헤더 | `{ processed, pushed, failed }` |

- 입력은 대부분 GET query / POST JSON body 둘 다 허용한다.
- `freshness`(NFR-004): `{ fetched_at, is_stale, source: '국토부' }`.
- `notify_worker`는 사용자 호출이 아닌 **서버 잡**이다. `CRON_SECRET` env와 `x-cron-secret` 헤더를 비교해 인증하며, `pushed_at is null` 알림을 Expo Push로 발송한다(pg_cron 스케줄 권장).

## 캐시·신선도 (ADR-004)

- 단지 메타 TTL: 30일.
- 실거래가 TTL: 현재월 24시간 / 과거월 7일.
- stale-while-revalidate: 신선하면 캐시 반환, stale면 외부 재조회 후 upsert.
- 외부 장애 시: 캐시(stale) 폴백 + `is_stale=true` 저하 모드. 캐시도 없으면 `DATA_UPSTREAM_UNAVAILABLE`(503).

## 공용 모듈 (`_shared/`)

- `cors.ts` — CORS 헤더, OPTIONS 처리, `jsonResponse`/`errorResponse`.
- `client.ts` — `adminClient()`(SERVICE_ROLE, RLS 우회), `requireUser(req)`(Bearer JWT 검증, 미인증 401).
- `freshness.ts` — TTL 계산(`isComplexStale`/`isTxStale`/`buildFreshness`).
- `molit.ts` — 국토부 어댑터(`fetchComplexMeta`/`fetchTrades`). 공급자 교체 시 이 파일만 교체(NFR-007).

## 환경 변수 (env)

| 키 | 용도 | 비고 |
| --- | --- | --- |
| `MOLIT_SERVICE_KEY` | 국토부 OpenAPI 서비스 키 | Edge Function env에만 저장. **응답에 절대 노출 금지.** 미설정 시 저하 모드. |
| `CRON_SECRET` | `notify_worker` 호출 인증 | `x-cron-secret` 헤더와 비교. 스케줄러/cron에만 공유. |
| `SUPABASE_URL` | 프로젝트 URL | 런타임 기본 주입. |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회용(캐시·알림 upsert) | 응답 비노출. |
| `SUPABASE_ANON_KEY` | 사용자 JWT 검증(anon 클라이언트) | 런타임 기본 주입. |

외부 키 비노출 원칙: `MOLIT_SERVICE_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 서버 환경에만 두며 어떤 응답 바디·로그·에러에도 포함하지 않는다(NFR-002).

비밀 등록:

```bash
supabase secrets set MOLIT_SERVICE_KEY=<발급키>
```

## 오류 코드 (api_contracts §5)

| code | HTTP | 의미 |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | 미인증(JWT 누락/무효) |
| `VALIDATION` | 400 | 입력 검증 실패 |
| `NOT_FOUND` | 404 | 단지 없음 |
| `DATA_RATE_LIMITED` | 429 | 재적재 호출 상한 초과 |
| `DATA_UPSTREAM_UNAVAILABLE` | 503 | 외부 공급자 장애 + 폴백 캐시 없음 |

모든 오류는 `{ error: { code, message } }` 형태로 반환한다.

## 배포

```bash
supabase functions deploy complex_detail transactions refresh_complex_data \
  media_upload_url thumbnail_worker search notify_worker
```

`notify_worker`는 주기 발송을 위해 pg_cron + pg_net 또는 외부 스케줄러로 호출한다(예: 1분 간격, `x-cron-secret` 헤더 동봉).

## 로컬 실행

```bash
# 함수 서빙(전체)
supabase functions serve

# 단일 함수 + 환경파일
supabase functions serve transactions --env-file ./supabase/.env.local
```

호출 예시:

```bash
curl -X POST http://localhost:54321/functions/v1/transactions \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "complex_id": "<uuid>", "period": 12, "area_range": [59, 85] }'
```
