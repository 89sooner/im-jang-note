# 임장노트 구현 요청서 for AI Agent

## 1. 목적

이 문서는 AI Agent에게 임장노트 구현을 요청하기 위한 상세 실행 지시서다. 이 문서는 설계 원본이 아니며, 상위 문서의 승인 범위를 구현 가능한 작업으로 포장한다.

## 2. 필수 입력 문서

1. `../00_governance/document_definitions.md`
2. `../00_governance/implementation_workflow.md`
3. `../10_requirements/srs_final.md`
4. `../10_requirements/prd.md`
5. `imjang_note_product_ia.md`
6. `imjang_note_wireframe_spec.md`
7. `imjang_note_screen_flow_spec.md`
8. `imjang_note_screen_state_matrix.md`
9. `imjang_note_ui_component_spec.md`
10. `imjang_note_design_system_tokens.md`
11. `imjang_note_screen_qa_checklist.md`
12. `../30_technical_architecture/imjang_note_system_architecture.md`
13. `../30_technical_architecture/imjang_note_frontend_architecture.md`
14. `../30_technical_architecture/imjang_note_backend_architecture.md`
15. `../30_technical_architecture/imjang_note_api_contracts.md`
16. `../30_technical_architecture/imjang_note_data_model.md`
17. `../30_technical_architecture/imjang_note_async_events_jobs.md`
18. `../30_technical_architecture/imjang_note_security_privacy_architecture.md`
19. `../30_technical_architecture/imjang_note_infrastructure_operations.md`
20. `../30_technical_architecture/imjang_note_observability_reliability.md`
21. `../40_delivery/imjang_note_implementation_roadmap.md`
22. `../40_delivery/imjang_note_release_validation_plan.md`

## 3. 기술 전제 (확정)

- 클라이언트: React Native + Expo (Android 우선). 서버상태 React Query, 클라이언트상태 Zustand, 알림 expo-notifications, 지도 Kakao Map.
- 백엔드: Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions).
- 외부 데이터: 국토교통부 OpenAPI(단지정보·실거래가)는 Edge Function 프록시·캐시 경유, 키 클라이언트 비노출.
- 테넌시: 워크스페이스(부부 2인) 단위 RLS 격리. 미확정 항목은 ADR-003(지도 연동)·ADR-004(캐싱)·ADR-005(오프라인 충돌)·ADR-006(개인정보 동의)로 우선 확정 후 구현.

## 4. 구현 원칙

- 빈 라우트, TODO-only 화면, 장식용 목업으로 끝내지 않는다.
- 모든 화면(D-001~D-012)은 로딩/빈/오류/권한없음/오프라인·stale/동기화중 상태를 `imjang_note_screen_state_matrix.md`대로 처리한다.
- FE/BE/API/data/infra 변경은 기술 아키텍처 문서(API-*, ENT-*, JOB-*, EVT-*)와 일치해야 한다.
- 모든 쓰기 경로는 RLS·권한(owner/partner)·감사를 우회하지 않는다. 권한 실패를 숨기지 않는다.
- 외부 API는 항상 캐시 폴백·저하 모드(NFR-004)를 갖춘다. 국토부 키를 클라이언트에 두지 않는다.
- 오프라인 작성(F-SYNC-001)은 손실 없이 큐에 저장하고 동기화 충돌은 ADR-005 정책으로 처리한다.

## 5. 구현 단계 (딜리버리 로드맵 REL-* 기준)

1. REL-001: 인증·프로필·워크스페이스 생성/초대(FR-AUTH-001~003, FR-WS-001~003), 앱 셸·내비게이션.
2. REL-002: 지도 홈·단지 마커·클러스터·현위치·단지 상세, 국토부 단지/실거래가 프록시(FR-MAP-001~004, FR-DATA-001~003).
3. REL-003: 임장 노트 작성/목록/수정·삭제, 체크리스트·별점·메모·사진(FR-NOTE-001~006, FR-MEDIA-001).
4. REL-004: 실시간 동기화·코멘트(FR-WS-003, FR-COMMENT-001, EVT-NOTE/CMT).
5. REL-005: 검색·필터·즐겨찾기·비교·알림(FR-SEARCH-*, FR-FAV-*, FR-NOTIFY-*).
6. REL-006: 오프라인·동기화 하드닝, 관측·접근성·성능 마감(FR-SYNC-*, NFR-001/004/005/006).

## 6. 금지 사항 (forbidden shortcuts)

- 국토부/Kakao 키를 앱 번들·클라이언트 코드에 포함.
- RLS 없이 service-role 키로 클라이언트에서 직접 데이터 접근.
- 노트/코멘트 실시간 미반영(폴링 누락), 사진 무제한 업로드, 권한 없는 삭제 허용.
- 상태/예외 미처리 화면, 동의 없는 위치·사진 수집.

## 7. 완료 기준

- 요구사항, 화면, API, 데이터, 테스트가 traceable하다.
- 권한/정책 비활성화 이유가 표시된다.
- async 작업은 job/event/progress/error 상태를 가진다.
- 관측성, 운영 리스크, known limitation이 문서화된다.
- release validation plan의 해당 gate가 통과된다.
