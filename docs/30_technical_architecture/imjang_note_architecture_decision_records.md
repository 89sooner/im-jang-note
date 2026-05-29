# 임장노트 Architecture Decision Records

## 1. 목적과 범위

이 문서는 구현 비용, 운영 리스크, 확장성, 보안, 개발 속도에 영향을 주는 아키텍처 결정을 기록한다. 모든 결정은 `../10_requirements/srs_final.md`/`prd.md` 승인 범위 안에서만 유효하며 새 제품 범위를 추가하지 않는다. accepted는 확정, open은 미해결(영향만 명시하고 결정 보류)을 의미한다.

## 2. ADR 목록

| ADR ID | 제목 | 상태 | 결정일 | 영향 문서 |
| --- | --- | --- | --- | --- |
| ADR-001 | 클라이언트: React Native + Expo (Android 우선) | accepted | 2026-05-29 | system / frontend / infrastructure |
| ADR-002 | 백엔드: Supabase (Postgres+Auth+RLS+Realtime+Storage+Edge Fn) | accepted | 2026-05-29 | system / backend / data / infrastructure / security |
| ADR-003 | Kakao Map RN 연동 방식 | open | - | system / frontend / security |
| ADR-004 | 국토부 OpenAPI 캐싱 전략 | open | - | backend / data / async / observability |
| ADR-005 | 오프라인 동기화 충돌 정책 | open | - | frontend / backend / async |
| ADR-006 | 위치/개인정보 동의 범위 | open | - | security / data |
| ADR-007 | 상태관리: React Query + Zustand | accepted | 2026-05-29 | frontend |
| ADR-008 | 수익화 모델 | open | - | prd / system |

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
- open. SDK vs WebView 성능/유지보수 비교 후 확정 예정. 렌더 키만 클라이언트 포함, 지오코딩 등 키 민감 REST는 Edge Function 프록시.
### Consequences
- Positive(예상): 적합 시 렌더 성능 확보.
- Negative(예상): WebView는 성능·제스처 제약, 네이티브 브리지는 유지보수 비용.
- Follow-up: 마커 클러스터링(FR-MAP-002)으로 성능 확보, REL-002 진입 전 확정 필요.
- 상태: open

## ADR-004 국토부 OpenAPI 캐싱 전략

### Context
- 국토부 단지정보·실거래가는 쿼터·지연·불안정. 캐시 적중 시 1.5s(NFR-001), 장애 시 폴백 필요(NFR-004, FR-DATA-002/003).
### Options
1. Postgres 캐시 테이블 + TTL/신선도 메타 + stale 폴백 (ENT-CMP-001, ENT-TX-001)
2. 매 요청 실시간 프록시(캐시 없음)
3. 외부 인메모리 캐시 추가 도입
### Decision
- open. 캐시 우선 + 신선도 메타 + 배치 갱신(JOB-DATA-001/002)을 유력안으로 하되 TTL·갱신주기·정규화 스키마 확정 보류.
### Consequences
- Positive(예상): 성능·쿼터 절감, 저하 모드 가능.
- Negative(예상): 신선도 지연, 캐시 무효화 복잡도.
- Follow-up: 신선도 표시·저하 배너(관측 문서 §7), REL-002 전 확정.
- 상태: open

## ADR-005 오프라인 동기화 충돌 정책

### Context
- 오프라인 무손실 작성(NFR-004, FR-SYNC-001/002). 2인 공유에서 동시편집 충돌 가능.
### Options
1. 작성자 단독 편집 + last-write-wins (충돌 표면 축소)
2. 필드 단위 머지(CRDT 유사)
3. 충돌 시 사용자 수동 해결 UI
### Decision
- open. 현재는 노트 작성자 단독 편집(FR-NOTE-006)으로 충돌 표면을 축소한 상태이며, 정식 충돌 정책은 보류.
### Consequences
- Positive(예상): 단독 편집으로 초기 충돌 최소화.
- Negative(예상): 향후 공동 편집 도입 시 정책 재설계 필요.
- Follow-up: idempotency key 기반 재생(관측 RB-02), REL-006 전 확정.
- 상태: open

## ADR-006 위치/개인정보 동의 범위

### Context
- 위치·사진은 민감정보(NFR-003). 동의 단위, EXIF 위치 처리, 삭제 시 워크스페이스 공유 데이터 처리가 미확정(FR-SET-002, PIPA).
### Options
1. 수집 단위별 개별 동의(위치/사진/알림) + EXIF 위치 분리
2. 단일 포괄 동의
3. 위치 비저장(좌표만 일시 사용)
### Decision
- open. 개별 동의 + EXIF 위치 기본 제거를 유력안으로 하되, 삭제 시 공유 데이터 폐기 범위와 EXIF 보존 여부 확정 보류.
### Consequences
- Positive(예상): 최소 수집·철회권 충족.
- Negative(예상): 동의 UX 복잡, 공유 데이터 삭제 정책 난이도.
- Follow-up: 동의·철회·삭제 흐름(보안 문서 §7), REL-003 전 확정.
- 상태: open

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
- open. 제품 범위 확정 전 보류. 아키텍처는 수익화 비종속으로 설계 유지(범위 발명 금지).
### Consequences
- Positive(예상): 결정 지연으로 핵심 기능 우선.
- Negative(예상): 추후 결제·광고 도입 시 개인정보·인프라 영향 재평가 필요.
- Follow-up: PRD 결정 후 ADR 갱신.
- 상태: open
