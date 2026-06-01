# 임장노트 Execution Brief for AI Agent

## 1. 목적

이 문서는 AI Agent가 바로 구현 작업에 착수하기 위한 압축 실행 브리프다.

## 2. 읽기 순서

1. `../10_requirements/srs_final.md`
2. `../10_requirements/requirements_screen_traceability_matrix.md`
3. `../10_requirements/prd.md`
4. `imjang_note_product_ia.md`
5. `imjang_note_wireframe_spec.md`
6. `imjang_note_screen_flow_spec.md`
7. `imjang_note_screen_state_matrix.md`
8. `imjang_note_ui_component_spec.md`
9. `imjang_note_design_system_tokens.md`
10. `imjang_note_screen_qa_checklist.md`
11. `../30_technical_architecture/imjang_note_system_architecture.md`
12. `../30_technical_architecture/imjang_note_frontend_architecture.md`
13. `../30_technical_architecture/imjang_note_backend_architecture.md`
14. `../30_technical_architecture/imjang_note_api_contracts.md`
15. `../30_technical_architecture/imjang_note_data_model.md`
16. `../30_technical_architecture/imjang_note_infrastructure_operations.md`
17. `../40_delivery/imjang_note_implementation_roadmap.md`
18. `../40_delivery/imjang_note_release_validation_plan.md`

## 3. 타깃 스코프

- 제품: 부부 2인 공유 임장노트 앱. 스택 React Native + Expo / Kakao Map / 국토부 OpenAPI / Supabase.
- 첫 슬라이스 목표(REL-001~003): "로그인 → 워크스페이스 → 지도에서 단지 클릭 → 임장 노트 작성·사진" 엔드투엔드 동작.

## 4. 절대 원칙

- `srs_final.md`와 `prd.md`가 범위를 결정한다.
- UI, architecture, delivery, agent brief는 범위를 새로 만들 수 없다.
- 구현 편의로 문서 범위를 조용히 바꾸지 않는다.
- 외부 API 키는 Edge Function에만 둔다. 데이터 접근은 RLS(워크스페이스 격리)를 통한다.
- ADR-001~008은 모두 accepted(2026-06-01). 본문 결정을 그대로 따르고 임의 변경하지 않는다. 새 결정은 새 ADR ID로 등록 후 진행.

## 5. 구현 순서

1. 요구사항/traceability 확인
2. 화면/상태/컴포넌트 확인
3. API/data/job/event 계약 확인
4. 앱 셸, 도메인 타입, adapter 경계 구현
5. FE/BE/API/data vertical slice 구현
6. 보안/권한/감사/관측성 연결
7. release validation gate 수행

## 6. 제출 형식

- 구현 범위 요약
- 미구현 범위 요약
- 기술 결정 사항과 ADR 영향
- API/data/infra 연결 포인트
- 검증 결과와 known limitation
