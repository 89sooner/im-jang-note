# 임장노트 구현 로드맵

## 1. 목적과 범위

이 문서는 승인된 요구사항과 아키텍처(`../30_technical_architecture/*`)를 구현 가능한 vertical slice와 milestone(REL-001~REL-006)으로 분해한다. 새 제품 범위를 추가하지 않으며, 잠긴 ID 사전만 사용한다. 위험 결정은 ADR로 연결한다(ADR-003~006/008 accepted, 2026-06-01).

## 2. 원칙

- 각 slice는 FE/BE/API/data/infra/security/QA를 함께 가지며 end-to-end로 검증 가능해야 한다.
- UI만 또는 API만 구현한 상태를 완료로 보지 않는다.
- 선행 의존성·진입/종료 기준·마이그레이션/데이터 선행조건을 명시한다.
- 핵심 ADR(ADR-003~006/008)은 2026-06-01에 모두 accepted로 확정됨. 신규 결정 발생 시 새 ADR ID로 등록한다.

## 3. Milestones

| REL ID | 목표 | 포함 요구사항 | 주요 산출물 | Exit Criteria |
| --- | --- | --- | --- | --- |
| REL-001 | 인증/워크스페이스 기반 | FR-AUTH-001~004, FR-WS-001~004, FR-SET-001 | Auth, ENT-USR/WS/WS_MEMBER/WS_INVITE, RLS 격리, 셸 내비 | 2인 워크스페이스 생성·초대·수락, RLS 교차접근 0, 세션 갱신 동작 |
| REL-002 | 지도/단지 데이터 | FR-MAP-001~005, FR-DATA-001~004 | Kakao Map 렌더(ADR-003), 단지 클릭, 국토부 프록시·캐시(ADR-004), ENT-CMP/TX, JOB-DATA-001/002 | 마커 1000개 60fps, 실거래 캐시 적중 1.5s, 외부 장애 시 stale 폴백 |
| REL-003 | 노트 작성·사진 | FR-NOTE-001~006, FR-MEDIA-001~002, FR-SET-002 | 노트/체크리스트 작성, 사진 업로드·썸네일(JOB-MEDIA-001), 서명 URL, 동의 흐름(ADR-006) | 노트 저장 1s, 사진 비공개+서명 URL, 동의 없으면 위치/사진 미수집 |
| REL-004 | 공유·실시간·코멘트 | FR-WS-003, FR-COMMENT-001 | Realtime 워크스페이스 채널, EVT-NOTE-001/002, EVT-CMT-001, EVT-WS-001 | 상대 변경 실시간 반영, 코멘트 동기화, 권한 격리 유지 |
| REL-005 | 검색·비교·즐겨찾기·알림 | FR-SEARCH-001~002, FR-FAV-001~002, FR-NOTIFY-001~002 | 검색/비교 화면, 즐겨찾기(ENT-FAV), 알림(ENT-NOTIFY/DEV), JOB-NOTIFY-001 | 검색/비교 동작, 즐겨찾기 공유, 푸시 발송 성공률≥95%, 동의 철회 시 발송 제외 |
| REL-006 | 오프라인·관측·하드닝 | FR-SYNC-001~002, NFR-001~007 | 오프라인 큐·재생(ADR-005), SLO/알림/런북(NFR-006), 보안 하드닝 | 오프라인 무손실 재생, SLO 대시보드/알림 동작, 보안 리뷰 high 미해결 0 |

## 4. Slice Definition

| Slice | FE | BE/API | Data | Infra/Ops | Security | QA |
| --- | --- | --- | --- | --- | --- | --- |
| REL-001 | 로그인/온보딩(D-001), 워크스페이스 생성·초대 화면, 세션 관리(Zustand) | Auth 연동, 초대 발급/수락 RPC, 멤버십 검증 | ENT-USR-001, ENT-WS-001/002/003, RLS 정책+인덱스 | dev/prod Supabase 프로젝트, EAS preview 채널 | RLS 기본거부, owner/partner 권한, 초대 토큰 만료(THR-007/010) | RLS 교차접근 테스트, 초대 e2e |
| REL-002 | 지도 렌더·마커 클러스터, 단지 상세, 신선도 배너 | 국토부/지오코딩 Edge Fn 프록시, 캐시 조회 API | ENT-CMP-001, ENT-TX-001 캐시 스키마+TTL | Edge Fn 배포, 외부 키 secret, JOB-DATA-001/002 스케줄 | 외부 키 비노출(THR-002), 입력검증 | 캐시 적중/폴백, 성능 60fps, 계약 테스트 |
| REL-003 | 노트 작성 폼·체크리스트, 사진 첨부, 동의 모달 | 노트 저장 RPC, 서명 업로드/다운로드 URL 발급, 썸네일 트리거 | ENT-NOTE-001/002, ENT-MEDIA-001, consent 상태 | Storage 비공개 버킷, JOB-MEDIA-001 | 서명 URL(THR-004), EXIF 분리, 동의 게이트(THR-005) | 저장 1s, 서명 URL 권한, 동의/철회 |
| REL-004 | 실시간 반영, 코멘트 UI, 변경 표시 | Realtime 채널 구독, 코멘트 write RPC, 이벤트 발행 | ENT-CMT-001, Realtime 발행 설정 | Realtime 구성 | 채널 워크스페이스 격리 | 실시간 e2e, 권한 격리 |
| REL-005 | 검색/필터, 비교 뷰, 즐겨찾기, 알림 설정/수신 | 검색 쿼리, 즐겨찾기 RPC, 알림 발송 Edge Fn | ENT-FAV-001, ENT-NOTIFY-001, ENT-DEV-001 인덱스 | JOB-NOTIFY-001 스케줄, Expo Push secret | 토큰 관리, 동의 철회 발송 제외(THR-003) | 검색/비교/알림 e2e, 발송 성공률 |
| REL-006 | 오프라인 큐 UI/저하모드 배너, 동기화 상태 | idempotent 재생 RPC, 충돌 처리(ADR-005) | 동기화 상태/큐 메타 | SLO 대시보드, ALT-01~10 알림, 런북, 정리 Job | 보안 하드닝, 삭제 Job(THR-008), 로그 마스킹(THR-009) | 무손실 재생, 관측/롤백 리허설, 접근성/보안 |

## 5. 의존성 지도

- Product: ADR-008(수익화) accepted=무료 유지 — 결제/광고 인프라 미설계, 재평가 트리거 도달 시 별도 ADR.
- Design: UI 문서(IA/와이어프레임/상태매트릭스)는 별도 작업자 산출물에 의존(REL-001~006 화면).
- Frontend: REL-002는 ADR-003(Kakao 연동) 확정 의존. REL-006은 ADR-005 의존.
- Backend: REL-002는 ADR-004(캐싱) 의존. 모든 write는 RLS+RPC 선행(REL-001).
- Data: REL-001 RLS/멤버십이 후속 모든 워크스페이스 스코프 slice의 선행조건.
- Infrastructure: dev/prod Supabase 분리, Edge Fn 배포, EAS 채널은 REL-001에서 확립(인프라 문서 §2/§5/§6).
- Security: REL-003은 ADR-006(동의 범위) 확정 의존. RLS 정책 테스트는 전 slice 게이트.
- QA: 각 REL은 검증 문서(`imjang_note_release_validation_plan.md`) 게이트 통과 필요.

선행 순서: REL-001 → REL-002 → REL-003 → REL-004 → REL-005 → REL-006 (워크스페이스 격리·데이터 캐시·노트·실시간·부가기능·하드닝의 단계적 누적).

## 6. 마이그레이션 / 데이터·API 선행조건

- REL-001: ENT-USR/WS/WS_MEMBER/WS_INVITE 스키마 + RLS 정책 마이그레이션(확장 우선, 인프라 §7). 이후 모든 slice의 선행.
- REL-002: ENT-CMP/TX 캐시 스키마 + TTL/신선도 컬럼, 국토부 프록시 API 계약 확정(ADR-004).
- REL-003: ENT-NOTE/MEDIA 스키마, consent 상태 스키마(ADR-006), Storage 버킷·정책.
- REL-005: ENT-FAV/NOTIFY/DEV 스키마 + 인덱스.
- REL-006: 동기화 큐/상태 스키마, 정리 Job 스케줄.
- 모든 스키마 변경은 하위호환 2단계(expand/contract), RLS 변경 후 정책 테스트 통과 필수.

## 7. Known Limitations

| 제한 | 영향 | 후속 slice | 승인 여부 |
| --- | --- | --- | --- |
| 지도 WebView 렌더(ADR-003 accepted) | 1000마커 NFR-001 한계, 미달 시 네이티브 브리지로 마이그레이션 | REL-002 벤치마크 | 의도된 1차 선택 |
| 캐시 신선도(ADR-004 accepted) | 단지 30일/실거래 24h(현재월)·7d(과거월) TTL 내 지연 | REL-002 | 의도된 트레이드오프 |
| 공동 편집 미지원(ADR-005 accepted, 작성자 단독 편집) | 동일 사용자 다기기 LWW로 후행이 선행을 덮어쓸 수 있음 | 향후 3인+ 협업 도입 시 | 의도된 범위 축소(FR-NOTE-006) |
| EXIF GPS 강제 제거(ADR-006 accepted) | 사진의 개인 GPS 보존 불가 | — | 공유 안전성 우선 |
| 수익화 없음(ADR-008 accepted=무료) | 인프라 비용 운영자 부담 | 재평가 트리거 도달 시 | 명시적 non-goal |
| Android 우선, iOS 후속 | iOS 미배포 | NFR-007 범위 후속 | 의도된 범위 |
