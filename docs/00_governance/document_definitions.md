# 문서 정의서

## 1. 목적

본 문서는 임장노트 문서 세트의 역할, 기준성, 참조 순서, 갱신 원칙을 정의한다.

## 2. 문서군 정의

### 2.1 거버넌스 문서군

- 위치: `docs/00_governance`
- 목적: 문서 체계, 작업 순서, 갱신 규칙, 기준 문서 우선순위 정의

### 2.2 요구사항 원본 문서군

- 위치: `docs/10_requirements`
- 목적: 제품 범위, 요구사항, 제약, 우선순위, 최종 기준선 정의
- 최상위 기준: `srs_final.md`

### 2.3 화면 구현 파생 문서군

- 위치: `docs/20_derived_ui_specs`
- 목적: 승인된 요구사항을 화면, 상태, 컴포넌트, QA, 구현 지시로 번역
- 제약: 상위 요구사항에 없는 기능을 독립적으로 추가할 수 없음

## 3. 문서별 정의

- `feature.md`: 기능 후보군 및 참고 문서. 최종 기준 문서가 아니다.
- `prd.md`: 제품 요구사항과 우선순위의 상세 기준 문서.
- `workflow.md`: 요구사항 도출, 정제, 검토 절차 문서.
- `srs_final.md`: 구현 기준이 되는 최종 요구사항 정의서.
- `requirements_screen_traceability_matrix.md`: 요구사항 ID와 화면 ID를 연결하는 추적 문서.
- `imjang_note_product_ia.md`: 제품 표면, 화면 구조, 전역 정보구조 기준 문서.
- `imjang_note_wireframe_spec.md`: 화면별 섹션, 컴포넌트, 상태, 이벤트, 권한 문서.
- `imjang_note_screen_flow_spec.md`: 화면 전환, 예외 흐름, deeplink 규칙 문서.
- `imjang_note_screen_state_matrix.md`: 화면 상태, 오류, 권한, 복구 경로 표준 문서.
- `imjang_note_ui_component_spec.md`: 공통 UI 및 도메인 컴포넌트 계약 문서.
- `imjang_note_design_system_tokens.md`: 디자인 토큰과 시각 규칙 문서.
- `imjang_note_screen_qa_checklist.md`: 화면별 QA 및 수용 기준 문서.
- `imjang_note_ai_agent_implementation_request.md`: AI Agent용 상세 구현 요청서.
- `imjang_note_ai_agent_execution_brief.md`: AI Agent용 압축 실행 브리프.

## 4. 문서 운영 원칙

1. 기능 범위 변경은 `srs_final.md`에서 먼저 승인한다.
2. `prd.md`가 `srs_final.md`와 충돌하면 `srs_final.md`를 우선한다.
3. `feature.md`는 후보 수집과 확장 검토에만 사용한다.
4. 파생 UI 문서는 상위 요구사항을 번역할 뿐 범위를 새로 결정하지 않는다.
5. AI Agent용 문서는 상위 문서 정합성 검토 후 마지막에 갱신한다.
