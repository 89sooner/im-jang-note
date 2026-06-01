# 임장노트 시스템 아키텍처

## 1. 목적과 범위

이 문서는 임장노트의 전체 런타임 구조와 기술 경계, 컨테이너 간 의존 방향, 교차 관심사, 품질 속성(NFR) 매핑을 정의한다. 모든 결정은 `../10_requirements/srs_final.md`와 `../10_requirements/prd.md`의 승인 범위 안에서만 유효하며, 이 문서는 새로운 제품 범위를 추가하지 않는다. 세부 설계는 하위 문서(`imjang_note_frontend_architecture.md`, `imjang_note_backend_architecture.md`, `imjang_note_api_contracts.md`, `imjang_note_data_model.md`, `imjang_note_async_events_jobs.md`)로 위임한다.

확정 스택은 ADR-001(RN+Expo), ADR-002(Supabase), ADR-007(React Query+Zustand)으로 잠겨 있고, 미해결 결정은 ADR-003(Kakao Map RN 연동), ADR-004(국토부 캐싱), ADR-005(오프라인 충돌), ADR-006(위치/개인정보 동의 범위)이다.

## 2. 제품 컨텍스트 뷰 (C4 Level 1)

```text
                    ┌──────────────────────────────────────────┐
                    │            임장노트 (System)               │
   ┌──────────┐     │                                            │
   │  owner   │────▶│  RN+Expo 앱 ↔ Supabase 백엔드               │
   │ (사용자) │     │                                            │
   └──────────┘     └───┬───────────┬───────────────┬────────────┘
   ┌──────────┐         │           │               │
   │ partner  │────▶ (앱)            │ (서버측 프록시) │ (푸시)
   │ (사용자) │         ▼           ▼               ▼
   └──────────┘   ┌─────────┐ ┌──────────────┐ ┌────────────┐
                  │ Kakao   │ │ 국토교통부    │ │ Expo Push  │
                  │ Map SDK │ │ OpenAPI       │ │ Service    │
                  │ (지도)  │ │ (단지/실거래) │ │ (알림)     │
                  └─────────┘ └──────────────┘ └────────────┘
```

- 행위자: `owner`, `partner` (워크스페이스 정원 2인, SRS §6). 비인증 사용자는 D-001 온보딩/로그인만 접근.
- 외부 시스템:
  - Kakao Map: 지도 타일·마커 렌더는 클라이언트 SDK 직접 사용. 지오코딩(주소→좌표) REST는 서버 보호 가능(ADR-003).
  - 국토교통부 OpenAPI: 공동주택 단지 기본정보 + 아파트 매매 실거래가. 클라이언트 직접 호출 금지, Edge Function 프록시 경유(FR-DATA-003).
  - Expo Push Service: 디바이스 토큰 기반 푸시 발송(FR-NOTIFY-001).

## 3. 컨테이너 뷰 (C4 Level 2)

```text
┌─────────────────────────────── Client Runtime (Android 우선) ───────────────────────────────┐
│  React Native + Expo App                                                                     │
│   ├─ UI/Navigation (expo-router, D-001~D-012)                                                 │
│   ├─ Server State Cache  : @tanstack/react-query  (ADR-007)                                   │
│   ├─ Client State        : Zustand  (세션/지도뷰포트/동의/오프라인큐 메타)                      │
│   ├─ Map Layer           : Kakao Map SDK (ADR-003)                                            │
│   ├─ Offline Queue       : 로컬 영속 큐(SQLite/AsyncStorage) (FR-SYNC-001)                     │
│   └─ Push Client         : expo-notifications (FR-NOTIFY-001/002)                             │
└──────────────────────────────────────┬───────────────────────────────────────────────────────┘
                 HTTPS/WSS (TLS, Supabase anon/JWT)
                                        │
┌───────────────────────────────── Supabase (Managed Backend, ADR-002) ────────────────────────┐
│  ┌─ Auth (GoTrue)        : 이메일/소셜 로그인, JWT 발급·갱신 (FR-AUTH-*)                         │
│  ┌─ Postgres + RLS       : 도메인 영속성, 워크스페이스 단위 테넌시 격리 (NFR-002, ENT-*)          │
│  │    └─ RPC (PL/pgSQL)  : 트랜잭션 경계가 필요한 write (노트 저장, 초대 수락 등)                 │
│  ┌─ Realtime             : Postgres 변경 브로드캐스트 (FR-WS-003, FR-COMMENT-001, EVT-*)         │
│  ┌─ Storage              : 노트 사진 원본/썸네일, 서명 URL 접근 (FR-MEDIA-*, NFR-002)            │
│  └─ Edge Functions (Deno): 외부 API 프록시·정규화·캐시, 키 보관 (FR-DATA-003, API-DATA-*)        │
│        └─ Scheduled Jobs : pg_cron/Edge schedule (JOB-DATA-001/002, JOB-NOTIFY-001, JOB-MEDIA-001)│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

| 컨테이너 | 책임 | 런타임 | 소유 문서 |
| --- | --- | --- | --- |
| RN+Expo App | 화면, 내비게이션, 클라이언트/서버 상태, 지도 렌더, 오프라인 큐, 푸시 수신 | 디바이스(Android 우선) | `imjang_note_frontend_architecture.md` |
| Supabase Auth | 인증·세션·JWT | Supabase 관리형 | `imjang_note_backend_architecture.md` |
| Postgres + RLS + RPC | 도메인 영속성, 권한 격리, 트랜잭션 write | Supabase 관리형 | `imjang_note_backend_architecture.md`, `imjang_note_data_model.md` |
| Realtime | 변경 이벤트 브로드캐스트 | Supabase 관리형 | `imjang_note_async_events_jobs.md` |
| Storage | 사진 원본/썸네일, 서명 URL | Supabase 관리형 | `imjang_note_data_model.md` |
| Edge Functions | 국토부/지오코딩 프록시·정규화·캐시, 알림 발송, 썸네일 트리거 | Deno (Supabase) | `imjang_note_backend_architecture.md`, `imjang_note_async_events_jobs.md` |

## 4. 의존 방향과 런타임 경계

- 단방향 의존: `RN 앱 → Supabase`. 앱은 Supabase 외 외부(국토부)에 직접 의존하지 않는다(FR-DATA-003, NFR-002). Kakao Map SDK만 클라이언트 직접 의존이며 ADR-003에서 연동 방식을 확정한다.
- 키/시크릿 경계: 국토부 서비스키, Kakao REST 키, Expo Push 비밀은 Edge Function 환경변수에만 존재. 앱 번들에는 Supabase anon key와 (사용 시) Kakao JS SDK 키만 포함.
- 테넌시 경계: 모든 도메인 read/write는 `workspace_id` 기준 RLS로 격리(NFR-002). 앱은 RLS를 우회하지 못하며, 서버측 신뢰는 JWT의 `auth.uid()` → `workspace_member` 조인으로 확립한다.
- 데이터 신선도 경계: 외부 데이터(단지 메타, 실거래가)는 `transaction_cache`/`complex` 캐시 레이어를 통해서만 노출. 신선도 만료 시 Edge Function이 원천 갱신, 실패 시 stale 폴백 + 저하 모드 표시(NFR-004).

## 5. 교차 관심사 (Cross-cutting Concerns)

| 관심사 | 처리 위치 | 메커니즘 | 관련 |
| --- | --- | --- | --- |
| 인증/세션 | Auth + 앱 | GoTrue JWT, 자동 갱신, 만료 시 D-001 전환 | FR-AUTH-001/003 |
| 인가/격리 | Postgres RLS | `workspace_member` 기반 정책, owner/partner 분기 | FR-WS-004, NFR-002 |
| 실시간 동기화 | Realtime | workspace 채널 구독, 변경 푸시 | FR-WS-003, FR-COMMENT-001 |
| 오프라인/동기화 | 앱 + RPC | 로컬 큐 → 온라인 복귀 시 idempotent 재생 | FR-SYNC-001/002, ADR-005 |
| 외부 데이터 캐시 | Edge Fn + Postgres | 프록시·정규화·TTL 캐시·stale 폴백 | FR-DATA-003, NFR-004, ADR-004 |
| 개인정보/동의 | 앱 + Postgres | 동의 상태 저장, 철회·삭제 예약 | FR-SET-002, NFR-003, ADR-006 |
| 관측성 | 앱 + Supabase 로그 | 구조화 로그, 크래시 리포트, 실패율 알림 | NFR-006 |
| 접근성 | 앱 | 44pt 타깃, 스크린리더 레이블, 동적 글자 | NFR-005 |

## 6. 품질 속성 매핑 (NFR)

| 속성 | 목표 (SRS §12) | 관련 NFR | 아키텍처 설계 영향 |
| --- | --- | --- | --- |
| 성능 | 지도 첫 렌더 2.5s(LTE), 마커 1000개 60fps, 노트 저장 1s, 실거래 표시 1.5s(캐시 적중) | NFR-001 | 마커 클러스터링(FR-MAP-002), React Query 캐시·낙관적 업데이트, 실거래 서버 캐시 우선 조회, 리스트 가상화 |
| 보안 | RLS 격리, 외부 키 서버 보관, TLS, 사진 서명 URL | NFR-002 | RLS 정책 전 테이블 적용, Edge Function 키 보관, Storage 서명 URL, 클라이언트 직접 외부 호출 금지 |
| 개인정보 | 동의 기반 수집, 철회·삭제, 최소 수집(PIPA) | NFR-003 | 동의 상태 엔티티화, 소프트 삭제 후 삭제 예약 Job, EXIF 위치 분리(ADR-006) |
| 신뢰성/가용성 | 외부 장애 시 캐시 폴백+저하 모드, 오프라인 무손실, 99.5% | NFR-004 | `transaction_cache` stale 폴백, 오프라인 영속 큐, 재시도/DLQ |
| 접근성 | 한 손 동선, 44pt, 스크린리더, WCAG AA | NFR-005 | 프론트 컴포넌트 접근성 책임(프론트 문서 §7) |
| 관측성 | 구조화 로그·메트릭·트레이스, 실패율 알림, 대시보드 | NFR-006 | Edge Function 로그, 동기화/외부 API 실패율 메트릭(비동기 문서 §5) |
| 이식성/확장성 | 지도·데이터 공급자 어댑터, iOS 확장, 정원 확장 구조 | NFR-007 | 지도/데이터 어댑터 경계, `workspace_member`로 정원 일반화, 공급자 추상화 |

## 7. 핵심 트레이드오프

- 관리형 BFF 없음(ADR-002): 별도 BFF/API Gateway를 두지 않고 Supabase(Postgres+RLS+Edge Function)를 직접 사용한다. 장점은 운영 단순화·실시간 내장, 단점은 RLS 정책 복잡도 집중과 Edge Function의 도메인 로직 분산. 완화: 트랜잭션·다단계 write는 Postgres RPC로 캡슐화(백엔드 문서 §3).
- 클라이언트 지도 SDK 직접 사용: 렌더 성능·UX 위해 Kakao Map SDK는 클라이언트 직접 의존(ADR-003). 지오코딩 등 키 민감 REST만 서버 보호. 트레이드오프는 지도 키 노출 vs 렌더 성능, 키 도메인/패키지 제한으로 완화.
- 외부 데이터 캐시 우선(ADR-004): 실거래/단지 메타를 캐시 우선 제공해 NFR-001 충족하나 신선도 지연 발생. 신선도 메타데이터 노출과 저하 모드로 NFR-004와 균형.
- 오프라인 우선 작성: 무손실(NFR-004) 위해 로컬 큐 채택하나 동시편집 충돌 리스크. ADR-005에서 충돌 정책 확정 전까지 노트는 작성자 단독 편집(FR-NOTE-006)으로 충돌 표면적 축소.

## 8. 핵심 아키텍처 리스크

| 리스크 | 영향 | 완화 | ADR |
| --- | --- | --- | --- |
| 국토부 OpenAPI 불안정/쿼터 | 실거래·단지정보 표시 실패 | 서버 캐시 + stale 폴백 + 저하 모드, 백오프 재시도, JOB-DATA-001/002 배치 | ADR-004, NFR-004 |
| Kakao Map RN 연동 미확정 | 지도 렌더/성능 불확실 | ADR-003에서 SDK vs WebView 결정, 마커 클러스터링으로 1000개 성능 확보 | ADR-003, NFR-001 |
| 오프라인 동시편집 충돌 | 데이터 유실/덮어쓰기 | ADR-005 충돌 정책, idempotency key, 작성자 단독 편집 범위 | ADR-005, FR-SYNC-002 |
| RLS 정책 오류로 교차 워크스페이스 노출 | 개인정보 유출 | 정책 단위 테스트, 기본 거부, 서버측 멤버십 검증 | NFR-002, FR-WS-004 |
| 위치/사진 동의 범위 모호 | PIPA 위반 위험 | ADR-006 동의 범위 확정, EXIF 위치 분리, 철회·삭제 흐름 | ADR-006, NFR-003 |
