# 구현 작업 워크플로

## 1. 목적

본 문서는 임장노트 문서 세트를 기준으로 실제 제품 계획, 구현 준비, 구현 검증을 어떤 순서로 진행할지 정의한다.

## 2. 작업 원칙

1. 항상 상위 요구사항을 먼저 확인하고 파생 UI 문서는 그 다음에 본다.
2. 파생 UI 문서는 화면 구현 기준이지 제품 범위 결정 문서가 아니다.
3. 충돌이 발생하면 `srs_final.md`를 기준으로 되돌아간다.
4. 구현 전 범위, 우선순위, 예외 상태, 권한 정책을 잠근다.
5. 구현 완료 판단은 QA 체크리스트와 상태 매트릭스까지 통과해야 한다.

## 3. 권장 작업 순서

### Phase 0. 문서 기준선 잠금

- 읽기: `document_definitions.md`, `srs_final.md`, traceability matrix, `prd.md`
- 산출물: 작업 범위 메모, 대상 요구사항/화면 목록

### Phase 1. 상위 요구사항 검증

- 읽기: `feature.md`, `workflow.md`
- 산출물: 기능 근거 목록, 실현 방식 분류 메모

### Phase 2. 화면 구조 번역

- 읽기: product IA, wireframe spec
- 산출물: 화면 ID 목록, 화면별 구현 우선순위

### Phase 3. 상호작용과 상태 설계

- 읽기: screen flow, state matrix, component spec
- 산출물: 흐름, 상태, 컴포넌트 분해

### Phase 4. 시각 규칙 적용

- 읽기: design tokens
- 산출물: 스타일 적용 기준

### Phase 5. 구현 지시 패키징

- 읽기: QA checklist
- 산출물: implementation request, execution brief

## 4. 요구사항 변경 시 역방향 갱신

요구사항이 바뀌면 `srs_final.md`부터 시작해 `docs/README.md`의 cascade 순서대로 갱신한다.
