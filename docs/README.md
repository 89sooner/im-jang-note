# 문서 인덱스

## 1. 목적

이 문서는 임장노트의 SRS/PRD 기반 제품 계획 문서 전체를 안내하는 최상위 인덱스다. 목표는 요구사항, UX/UI, 시스템 아키텍처, 프론트엔드, 백엔드, API, 데이터, 인프라, 보안, 운영, 릴리스 검증을 하나의 추적 가능한 문서 체계로 묶는 것이다.

## 2. 전체 구조

```text
docs/
  README.md
  00_governance/
    document_definitions.md
    implementation_workflow.md
  10_requirements/
    feature.md
    prd.md
    workflow.md
    srs_final.md
    requirements_screen_traceability_matrix.md
  20_derived_ui_specs/
    imjang_note_product_ia.md
    imjang_note_wireframe_spec.md
    imjang_note_screen_flow_spec.md
    imjang_note_screen_state_matrix.md
    imjang_note_ui_component_spec.md
    imjang_note_design_system_tokens.md
    imjang_note_screen_qa_checklist.md
    imjang_note_ai_agent_implementation_request.md
    imjang_note_ai_agent_execution_brief.md
  30_technical_architecture/
    imjang_note_system_architecture.md
    imjang_note_frontend_architecture.md
    imjang_note_backend_architecture.md
    imjang_note_api_contracts.md
    imjang_note_data_model.md
    imjang_note_async_events_jobs.md
    imjang_note_security_privacy_architecture.md
    imjang_note_infrastructure_operations.md
    imjang_note_observability_reliability.md
    imjang_note_architecture_decision_records.md
  40_delivery/
    imjang_note_implementation_roadmap.md
    imjang_note_release_validation_plan.md
```

## 3. 문서군

### 3.1 `00_governance`

문서 체계, 우선순위, 충돌 해결, 갱신 규칙, 구현 워크플로를 정의한다.

### 3.2 `10_requirements`

제품 범위, 기능 요구사항, 비기능 요구사항, 제약, 우선순위, 최종 확정 요구사항을 정의한다.

### 3.3 `20_derived_ui_specs`

승인된 요구사항을 화면 구현 관점으로 번역한다. 이 문서군은 제품 범위를 새로 결정할 수 없다.

### 3.4 `30_technical_architecture`

승인된 요구사항과 UI 명세를 실제 구현 가능한 시스템 구조로 번역한다. 프론트엔드, 백엔드, API, 데이터, 비동기 처리, 보안, 인프라, 관측성 기준을 정의한다.

### 3.5 `40_delivery`

구현 순서, 마일스톤, 검증, 릴리스, 롤백, 운영 준비도를 정의한다. 제품 범위를 새로 결정하지 않는다.

## 4. 문서 우선순위

1. `docs/10_requirements/srs_final.md`
2. `docs/10_requirements/prd.md`
3. `docs/10_requirements/workflow.md`
4. `docs/10_requirements/feature.md`
5. `docs/10_requirements/requirements_screen_traceability_matrix.md`
6. `docs/20_derived_ui_specs/imjang_note_product_ia.md`
7. 나머지 파생 UI 문서
8. `docs/30_technical_architecture/*`
9. `docs/40_delivery/*`
10. AI Agent 실행 문서

## 5. 권장 읽기 순서

1. `docs/00_governance/document_definitions.md`
2. `docs/00_governance/implementation_workflow.md`
3. `docs/10_requirements/srs_final.md`
4. `docs/10_requirements/requirements_screen_traceability_matrix.md`
5. `docs/10_requirements/prd.md`
6. `docs/20_derived_ui_specs/imjang_note_product_ia.md`
7. `docs/20_derived_ui_specs/imjang_note_wireframe_spec.md`
8. `docs/30_technical_architecture/imjang_note_system_architecture.md`
9. `docs/30_technical_architecture/imjang_note_frontend_architecture.md`
10. `docs/30_technical_architecture/imjang_note_backend_architecture.md`
11. `docs/30_technical_architecture/imjang_note_api_contracts.md`
12. `docs/30_technical_architecture/imjang_note_data_model.md`
13. `docs/30_technical_architecture/imjang_note_infrastructure_operations.md`
14. `docs/40_delivery/imjang_note_implementation_roadmap.md`
15. `docs/40_delivery/imjang_note_release_validation_plan.md`

## 6. 요구사항 변경 시 갱신 순서

1. `srs_final.md`
2. `prd.md`
3. `requirements_screen_traceability_matrix.md`
4. `imjang_note_product_ia.md`
5. `imjang_note_wireframe_spec.md`
6. `imjang_note_screen_flow_spec.md`
7. `imjang_note_screen_state_matrix.md`
8. `imjang_note_ui_component_spec.md`
9. `imjang_note_design_system_tokens.md`
10. `imjang_note_screen_qa_checklist.md`
11. `30_technical_architecture/*`
12. `40_delivery/*`
13. `imjang_note_ai_agent_implementation_request.md`
14. `imjang_note_ai_agent_execution_brief.md`
