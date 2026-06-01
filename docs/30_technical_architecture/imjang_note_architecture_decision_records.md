# 임장노트 Architecture Decision Records

## 1. 목적과 범위

이 문서는 구현 비용, 운영 리스크, 확장성, 보안, 개발 속도에 영향을 주는 아키텍처 결정을 기록한다. 모든 결정은 `../10_requirements/srs_final.md`/`prd.md` 승인 범위 안에서만 유효하며 새 제품 범위를 추가하지 않는다. accepted는 확정, open은 미해결(영향만 명시하고 결정 보류)을 의미한다.

## 2. ADR 목록

| ADR ID | 제목 | 상태 | 결정일 | 영향 문서 |
| --- | --- | --- | --- | --- |
| ADR-001 | 클라이언트: React Native + Expo (Android 우선) | accepted | 2026-05-29 | system / frontend / infrastructure |
| ADR-002 | 백엔드: Supabase (Postgres+Auth+RLS+Realtime+Storage+Edge Fn) | accepted | 2026-05-29 | system / backend / data / infrastructure / security |
| ADR-003 | Kakao Map RN 연동 방식 | accepted | 2026-06-01 | system / frontend / security |
| ADR-004 | 국토부 OpenAPI 캐싱 전략 | accepted | 2026-06-01 | backend / data / async / observability |
| ADR-005 | 오프라인 동기화 충돌 정책 | accepted | 2026-06-01 | frontend / backend / async |
| ADR-006 | 위치/개인정보 동의 범위 | accepted | 2026-06-01 | security / data |
| ADR-007 | 상태관리: React Query + Zustand | accepted | 2026-05-29 | frontend |
| ADR-008 | 수익화 모델 | accepted | 2026-06-01 | prd / system |

## ADR-001 클라이언트: React Native + Expo (Android 우선)

### Context
- 부부 2인 모바일 앱, Android 우선, 빠른 배포·OTA 필요(SRS, NFR-007).
### Options
1. React Native + Expo (관리형, EAS 빌드/OTA)
2. Flutter
3. 네이티브(Kotlin) 개별 구현
### Decision
- React Native + Expo 채택. EAS Build/Update로 배포·OTA, expo-notifications로 푸시.
### Consequences
- Positive: 단일 코드베이스, 빠른 OTA, iOS 확장 용이(NFR-007), 풍부한 생태계.
- Negative: 네이티브 SDK(지도) 연동 제약·콜드스타트, 일부 네이티브 변경은 재빌드 필요.
- Follow-up: 지도 연동은 ADR-003에서 확정.
- 상태: accepted (2026-05-29)

## ADR-002 백엔드: Supabase

### Context
- 별도 백엔드 운영 최소화, 인증·RLS·실시간·스토리지·서버리스가 한 곳에 필요(NFR-002/004/006).
### Options
1. Supabase (Postgres+Auth+RLS+Realtime+Storage+Edge Functions)
2. Firebase
3. 자체 API 서버 + 관리형 Postgres
### Decision
- Supabase 채택. RLS로 워크스페이스 격리, 다단계 write는 Postgres RPC, 외부 프록시·잡은 Edge Functions, dev/prod 프로젝트 분리.
### Consequences
- Positive: 운영 단순화, 실시간 내장, RLS 기반 테넌시, 관계형 모델 적합.
- Negative: RLS 정책 복잡도 집중, 별도 BFF 부재로 도메인 로직이 RPC/Edge Fn에 분산, 단일 관리형 의존(DR 설계 필요).
- Follow-up: 캐싱 ADR-004, DR/백업은 인프라 문서 §7.
- 상태: accepted (2026-05-29)

## ADR-003 Kakao Map RN 연동 방식

### Context
- 지도 위 단지 클릭이 핵심 UX(FR-MAP-001~005). RN에서 Kakao Map 연동 방식과 성능(마커 1000개 60fps, NFR-001)이 미확정.
### Options
1. 네이티브 SDK 브리지(커스텀 dev client)
2. WebView + Kakao JS SDK
3. 좌표만 사용하고 타 지도 SDK
### Decision
- Option 2 채택: **react-native-webview + Kakao Maps JavaScript SDK v3**. JS 브릿지(`postMessage`)로 마커 클릭·viewport 변경·현위치를 RN으로 이벤트화. Kakao JavaScript Key만 WebView HTML에 주입(도메인/번들 ID로 제한), 지오코딩·좌표→주소 등 REST는 Edge Function 프록시(Kakao REST Key 서버 보관).
- 성능 가드레일(NFR-001): 마커는 viewport 기준 culling + 줌 레벨별 클러스터링(`MarkerClusterer`)을 의무 적용해 동시 표시 마커를 ≤300으로 유지. 60fps 미달 시 ADR 갱신해 Option 1로 전환.
### Consequences
- Positive: Expo 관리형/EAS 표준 빌드로 동작(네이티브 모듈 없음). Kakao JS SDK는 한국 단지 POI·지번/도로명 검색 정확도가 우수. 위 가드레일 충족 시 NFR-001 만족.
- Negative: WebView 제스처/리스트 동시 스크롤 충돌 가능, 초기 렌더 콜드스타트 부담, 일부 안드로이드 WebView 버전 의존.
- Follow-up: REL-002 착수 시 300/1000마커 벤치마크 수행, NFR-001 미달 시 Option 1(`@react-native-seoul/kakao-map` 또는 자체 브릿지 + Expo config plugin)로 마이그레이션. 영향 문서: frontend(§지도 렌더), system(외부 연동), security(키 범위).
- 상태: accepted (2026-06-01)

## ADR-004 국토부 OpenAPI 캐싱 전략

### Context
- 국토부 단지정보·실거래가는 쿼터·지연·불안정. 캐시 적중 시 1.5s(NFR-001), 장애 시 폴백 필요(NFR-004, FR-DATA-002/003).
### Options
1. Postgres 캐시 테이블 + TTL/신선도 메타 + stale 폴백 (ENT-CMP-001, ENT-TX-001)
2. 매 요청 실시간 프록시(캐시 없음)
3. 외부 인메모리 캐시 추가 도입
### Decision
- Option 1 채택: **Postgres 캐시 테이블 + 키별 TTL + stale-while-revalidate**. Redis 등 외부 인메모리 캐시 미도입.
- 캐시 키/TTL:
  - 단지정보(`ENT-CMP-001`): TTL 30일, JOB-DATA-002 주 1회 갱신, 사용자 진입 시 캐시 미스만 lazy fetch.
  - 실거래가(`ENT-TX-001`) — 현재월: TTL 24시간, JOB-DATA-001 매일 03:00 KST 갱신. 과거월: TTL 7일, 한 번 적재 후 변경 시만 무효화. 키 = (단지ID, 거래년월).
- 장애 모드(NFR-004): 외부 API 실패 시 stale 데이터 + `last_refreshed_at` 메타로 "최신 아님" 배지 노출. 클라이언트 쿼리는 항상 Edge Function 경유(`API-DATA-*`), 직접 호출 금지.
- 쿼터 보호: Edge Function에서 단지×월 키 기준 in-flight dedupe + 분당 호출 상한 적용.
### Consequences
- Positive: 단일 인프라(Postgres) 운영 단순, RLS와 분리(server-only schema), 캐시 적중 시 NFR-001(1.5s) 충족, 장애 시 무중단 저하 모드.
- Negative: 캐시 신선도 지연(최대 TTL), 캐시 무효화/배치 운영 복잡도(JOB-DATA-001 모니터링 필요), 인기 단지 외 cold cache 진입 시 첫 사용자 응답 지연.
- Follow-up: 신선도 메타·저하 배너(관측 문서, RB-04), 캐시 적중률·갱신 실패율 SLI(NFR-006). 영향 문서: backend(§Edge Fn), data(§transaction_cache), async(§JOB-DATA-001/002), observability(§저하 모드).
- 상태: accepted (2026-06-01)

## ADR-005 오프라인 동기화 충돌 정책

### Context
- 오프라인 무손실 작성(NFR-004, FR-SYNC-001/002). 2인 공유에서 동시편집 충돌 가능.
### Options
1. 작성자 단독 편집 + last-write-wins (충돌 표면 축소)
2. 필드 단위 머지(CRDT 유사)
3. 충돌 시 사용자 수동 해결 UI
### Decision
- Option 1 채택(보강): **리소스별 last-write-wins + 클라이언트 idempotency key + 오프라인 outbox**. 충돌 수동 해결 UI 미도입.
- 리소스별 규칙:
  - 노트 본문/별점/메모(`ENT-NOTE-001`): 작성자 단독 편집(FR-NOTE-006)이므로 동일 사용자의 오프라인 재편집만 가능 → 클라이언트 `updated_at`과 idempotency key로 서버에서 dedupe, 더 큰 `updated_at` 채택(LWW).
  - 체크리스트 항목(`ENT-NOTE-002`): 항목별 LWW(필드 단위). 누락 항목은 미변경(부분 갱신 허용).
  - 코멘트(`ENT-CMT-001`): append-only, 충돌 불가. idempotency key로 중복 작성 방지.
  - 즐겨찾기(`ENT-FAV-001`): 토글 LWW.
  - 사진(`ENT-MEDIA-001`): 업로드 단위 idempotency key, 중복 시 멱등 응답.
- 클라이언트 outbox: SQLite/AsyncStorage에 순서 보존 큐, 작업당 UUID idempotency key + 로컬 `client_updated_at`. 온라인 복귀 시 직렬 flush, 5xx는 지수 백오프 재시도, 4xx(권한·검증)는 사용자에 표시 후 큐에서 제거.
- 사용자 표시: 동기화 중 배지(C-013 SyncStatusBadge), 실패 시 노트별 "동기화 실패" 표시(D-005). 코멘트로 인한 잠재 시각 차이는 Realtime 적용 시 자연 수렴.
### Consequences
- Positive: 충돌 UI 부재로 UX 단순, 작성자 단독 편집·append-only 코멘트로 충돌 표면 최소화, idempotency로 재시도 안전.
- Negative: 동일 사용자의 다기기 동시 편집 시 후속 쓰기가 선행 쓰기를 덮어쓸 수 있음(드물지만 명시). CRDT 등 정교한 머지는 미지원 — 향후 3인+ 협업 도입 시 재설계 필요.
- Follow-up: 동기화 실패율 SLI/알림(NFR-006), 큐 크기 한도(예: 200건/100MB) 초과 시 사용자 경고. 영향 문서: frontend(§오프라인 outbox), backend(§idempotency·LWW), async(§EVT-SYNC-001), observability(RB-02).
- 상태: accepted (2026-06-01)

## ADR-006 위치/개인정보 동의 범위

### Context
- 위치·사진은 민감정보(NFR-003). 동의 단위, EXIF 위치 처리, 삭제 시 워크스페이스 공유 데이터 처리가 미확정(FR-SET-002, PIPA).
### Options
1. 수집 단위별 개별 동의(위치/사진/알림) + EXIF 위치 분리
2. 단일 포괄 동의
3. 위치 비저장(좌표만 일시 사용)
### Decision
- Option 1 채택(확정): **목적별 개별 동의 + EXIF 위치 업로드 시점 제거 + 작성자 본인 데이터 단위 삭제**.
- 동의 단위(FR-SET-002, NFR-003):
  - 위치(foreground only): D-002 진입 시 OS 권한 + 앱 내 1회 안내. 백그라운드 위치 미수집.
  - 사진: 카메라/라이브러리 권한 분리. EXIF GPS는 클라이언트 업로드 직전에 제거(기본 ON, 토글 불가 — 워크스페이스 공유 안전성 우선).
  - 알림(FR-NOTIFY-001): OS 권한 + 앱 내 토글.
  - 분석/관측: 필수 동의 별도, 익명 식별자 사용.
- 삭제·철회 정책:
  - 본인 작성 노트/사진(`ENT-NOTE-001`, `ENT-MEDIA-001`): 작성자 또는 owner가 soft-delete → 30일 grace → hard-delete + Storage 영구 삭제. grace 동안 워크스페이스에서 "삭제됨"으로 표시되고 본문 비노출.
  - 본인 코멘트(`ENT-CMT-001`): 작성자가 즉시 삭제 가능. 컨텍스트 유지를 위해 노트 자체는 잔존.
  - 계정 탈퇴(FR-AUTH-004): 워크스페이스 단독 소유 시 owner 위임 또는 워크스페이스 삭제 강제. 탈퇴 후 본인 작성분은 위 규칙대로 처리, 배우자가 단 코멘트는 워크스페이스 잔존성을 위해 익명화(작성자 표시 "탈퇴 회원")만 적용.
  - 위치 동의 철회: 즉시 위치 수집 중단, 기존 노트의 단지 좌표는 단지 식별자에 종속되므로 유지(개인 위치 이력 별도 미저장).
- 법적 고지: 최초 진입(D-001) 시 PIPA 고지·동의 화면 표시, 변경 시 재동의. 동의 상태는 `consents` 테이블에 버전 기록.
### Consequences
- Positive: 최소 수집 원칙·철회권·PIPA 요구 충족, EXIF 자동 제거로 사진 공유 안전성 확보.
- Negative: 동의 UX 단계 증가, 30일 grace로 인한 Storage 비용 일부 증가, 탈퇴 위임/익명화 흐름 구현 비용.
- Follow-up: 삭제 잡(JOB-MEDIA-001 확장 또는 신규 JOB), 동의 변경 감사 로그, 법무 검토(ADR-006 부속). 영향 문서: security(§데이터 분류·PIPA), data(§consents·삭제 라이프사이클), backend(§탈퇴 흐름).
- 상태: accepted (2026-06-01)

## ADR-007 상태관리: React Query + Zustand

### Context
- 서버 상태(캐시·동기화)와 클라이언트 상태(세션/지도뷰포트/동의/오프라인 큐 메타)를 분리 관리해야 함(NFR-001).
### Options
1. React Query(@tanstack) + Zustand
2. Redux Toolkit + RTK Query
3. 단일 상태(Context only)
### Decision
- React Query로 서버 상태(캐시·낙관적 업데이트), Zustand로 클라이언트 상태 관리.
### Consequences
- Positive: 서버/클라이언트 상태 경계 명확, 낙관적 업데이트로 NFR-001 도움.
- Negative: 두 라이브러리 학습·동기화 규칙 필요.
- Follow-up: 상세 경계는 frontend 문서.
- 상태: accepted (2026-05-29)

## ADR-008 수익화 모델

### Context
- 수익화는 PRD 오픈 항목. 아키텍처(결제/광고/구독)·개인정보 영향 가능.
### Options
1. 무료(개인 사용)
2. 구독(프리미엄 기능)
3. 광고
### Decision
- **무료 유지(개인용)**. 광고·구독·인앱결제 도입하지 않는다. 부부 사적 기록 도구라는 제품 정체성과 개인정보 최소화 원칙(NFR-003)에 광고·트래커 부적합. 구독은 사용자 기반·운영 비용 데이터 부재로 시기상조.
- 재평가 조건(트리거): (a) MAU/워크스페이스가 운영 비용을 정당화할 규모로 성장, (b) 사용자에서 명시적 유료 의향 발생, (c) Supabase 무료 한도 초과로 인프라 비용이 운영자 부담을 초과 — 세 조건 중 둘 이상 충족 시 본 ADR 갱신.
- 아키텍처 영향: 결제·광고 도메인 없음 유지. 향후 도입 시 별도 ADR로 영향 평가(개인정보 분류·인프라·UX).
### Consequences
- Positive: 개인정보 최소 수집·UX 단순·법적 부담 최소(전자상거래·결제 규제 미적용).
- Negative: 운영 비용 전액 운영자 부담, Supabase 사용량 임계 모니터링 필요.
- Follow-up: 인프라 비용·사용량 메트릭을 NFR-006 대시보드에 포함, 재평가 트리거 도달 시 ADR 갱신. 영향 문서: PRD §11, system(§외부 의존 비용).
- 상태: accepted (2026-06-01)
