#!/usr/bin/env python3
"""Scaffold an agent-ready SRS/PRD product planning environment."""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import textwrap
from pathlib import Path


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "product"


def render(template: str, context: dict[str, str]) -> str:
    text = textwrap.dedent(template).lstrip()
    for key, value in context.items():
        text = text.replace("{{" + key + "}}", value)
    return text


def build_templates(slug: str) -> dict[str, str]:
    derived = f"docs/20_derived_ui_specs/{slug}"
    return {
        "AGENTS.md": """
            <!-- Generated: {{DATE}} -->

            # {{PRODUCT_NAME}}

            ## Purpose

            Documentation-first product planning repository for {{PRODUCT_NAME}}. This repo holds governance rules, PRD/SRS requirements, traceability, derived UI specifications, QA gates, and AI-agent execution briefs.

            ## Key Files

            | File | Description |
            | --- | --- |
            | `docs/README.md` | Master index, reading order, priority rules, and update cascade |
            | `docs/10_requirements/srs_final.md` | Final implementation baseline and highest-priority product truth |

            ## Subdirectories

            | Directory | Purpose |
            | --- | --- |
            | `docs/00_governance/` | Document roles, priority, and workflow rules |
            | `docs/10_requirements/` | Feature candidates, PRD, workflow, SRS, traceability |
            | `docs/20_derived_ui_specs/` | IA, wireframes, flows, states, components, tokens, QA, agent briefs |

            ## For AI Agents

            - Read `docs/README.md` before editing planning documents.
            - Never invent requirements. Approved scope starts in `docs/10_requirements/srs_final.md`.
            - Conflict priority: `srs_final.md` > `prd.md` > `workflow.md` > `feature.md` > traceability matrix > derived UI specs > AI-agent briefs.
            - When upstream requirements change, cascade updates through downstream docs in the order defined by `docs/README.md`.
            - Keep IDs stable. Deprecate by marking; do not renumber.
            - Preserve the repository language and document style.

            ## Testing Requirements

            This repository may be documentation-only. If no application source exists, validate with document checks:

            ```bash
            rg "FR-[A-Z0-9]+-[0-9]+" docs/
            rg "\\b[DWA]-[0-9]{3}" docs/
            rg "docs/.+\\.md" docs/
            ```

            ## Dependencies

            None by default.
        """,
        "CLAUDE.md": """
            # CLAUDE.md

            This file provides guidance to Claude Code when working with this repository.

            ## Repository Type

            This repository is a documentation-first SRS/PRD product planning environment for {{PRODUCT_NAME}}. There may be no application source code, build system, test suite, or package manifest until implementation begins.

            ## Core Working Principle

            Favor correctness, traceability, and minimal changes over speed. Do not assume missing requirements. Surface ambiguity, document assumptions, and preserve the hierarchy of source documents.

            ## Document Hierarchy

            - `docs/00_governance/`: rules that govern every other document.
            - `docs/10_requirements/`: authoritative product scope.
            - `docs/20_derived_ui_specs/`: screen-level and execution-level documents derived from approved requirements.

            ## Conflict-Resolution Priority

            1. `docs/10_requirements/srs_final.md`
            2. `docs/10_requirements/prd.md`
            3. `docs/10_requirements/workflow.md`
            4. `docs/10_requirements/feature.md`
            5. `docs/10_requirements/requirements_screen_traceability_matrix.md`
            6. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
            7. Remaining derived UI specs
            8. AI-agent implementation request and execution brief

            Derived UI specs can never expand scope beyond the SRS or PRD. If a derived document needs something the SRS does not grant, update the SRS first.

            ## Update Cascade

            1. `srs_final.md`
            2. `prd.md`
            3. `requirements_screen_traceability_matrix.md`
            4. `{{SLUG}}_product_ia.md`
            5. `{{SLUG}}_wireframe_spec.md`
            6. `{{SLUG}}_screen_flow_spec.md`
            7. `{{SLUG}}_screen_state_matrix.md`
            8. `{{SLUG}}_ui_component_spec.md`
            9. `{{SLUG}}_design_system_tokens.md`
            10. `{{SLUG}}_screen_qa_checklist.md`
            11. `{{SLUG}}_ai_agent_implementation_request.md`
            12. `{{SLUG}}_ai_agent_execution_brief.md`

            ## ID Conventions

            - Functional requirements: `FR-<AREA>-###`
            - Nonfunctional requirements: `NFR-###`
            - Scenarios: `SCN-###`
            - Screens: `D-###`, `W-###`, `A-###`
            - Components: `C-###`
            - Flows: `F-###`
            - Decisions: `ADR-###`

            ## Verification

            Since this may be a documentation-only repository, verification is manual and link-based unless code tooling exists.

            ```bash
            rg "FR-[A-Z0-9]+-[0-9]+" docs/
            rg "\\b[DWA]-[0-9]{3}" docs/
            rg "TODO|TBD|미정|결정 필요" docs/
            ```

            ## Application Code Guidelines

            Apply this section only if application source code exists or is added later. Application code must implement the approved scope from `srs_final.md` and `prd.md`; it must not implement candidate-only ideas from `feature.md`.
        """,
        "docs/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # docs

            ## Purpose

            Root of all product planning documentation. The numbered directories encode priority and reading order: governance defines the rules, requirements lock scope, and derived UI specs translate approved scope into implementable plans.

            ## For AI Agents

            - Start at `README.md` before editing anything else.
            - Do not rename numbered directories unless the governance docs are updated first.
            - When adding a document, register it in `README.md` and `00_governance/document_definitions.md`.
            - Derived docs must not contradict `10_requirements/srs_final.md`.

            ## Testing Requirements

            - Verify every referenced path resolves.
            - Grep for old names after renames.
            - Check requirement IDs and screen IDs after traceability edits.
        """,
        "docs/00_governance/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # 00_governance

            ## Purpose

            Defines how every other document is read, written, prioritized, and updated.

            ## For AI Agents

            - Edit with care. Changes here alter the meaning of every downstream document.
            - When adding a new document type, register its role, priority, and update rule here before writing the document.
            - After governance edits, re-check `docs/README.md` priority and cascade sections.
        """,
        "docs/10_requirements/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # 10_requirements

            ## Purpose

            Authoritative requirements layer. `srs_final.md` is the single source of truth for approved scope; all other files either feed it, explain it, or map it to downstream documents.

            ## For AI Agents

            - Treat `srs_final.md` as frozen unless the user explicitly authorizes scope change.
            - `feature.md` is an idea pool, not approved scope.
            - When the SRS changes, update the traceability matrix in the same pass.
            - Never introduce a requirement ID that is absent from traceability.
        """,
        "docs/20_derived_ui_specs/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # 20_derived_ui_specs

            ## Purpose

            Screen-level and execution-level derived specifications. These docs translate the locked SRS/PRD into IA, wireframes, flows, states, components, tokens, QA, and AI-agent briefs.

            ## For AI Agents

            - Never add a screen, section, state, or component that is not justified by a requirement ID.
            - Update in cascade order: IA -> wireframe -> flow/state -> component -> tokens -> QA -> agent briefs.
            - AI-agent briefs are execution-layer docs and never the source of design decisions.
        """,
        "docs/README.md": """
            # 문서 인덱스

            ## 1. 목적

            이 문서는 {{PRODUCT_NAME}}의 SRS/PRD 기반 제품 계획 문서 전체를 안내하는 최상위 인덱스다.

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
                {{SLUG}}_product_ia.md
                {{SLUG}}_wireframe_spec.md
                {{SLUG}}_screen_flow_spec.md
                {{SLUG}}_screen_state_matrix.md
                {{SLUG}}_ui_component_spec.md
                {{SLUG}}_design_system_tokens.md
                {{SLUG}}_screen_qa_checklist.md
                {{SLUG}}_ai_agent_implementation_request.md
                {{SLUG}}_ai_agent_execution_brief.md
            ```

            ## 3. 문서군

            ### 3.1 `00_governance`

            문서 체계, 우선순위, 충돌 해결, 갱신 규칙, 구현 워크플로를 정의한다.

            ### 3.2 `10_requirements`

            제품 범위, 기능 요구사항, 비기능 요구사항, 제약, 우선순위, 최종 확정 요구사항을 정의한다.

            ### 3.3 `20_derived_ui_specs`

            승인된 요구사항을 화면 구현 관점으로 번역한다. 이 문서군은 제품 범위를 새로 결정할 수 없다.

            ## 4. 문서 우선순위

            1. `docs/10_requirements/srs_final.md`
            2. `docs/10_requirements/prd.md`
            3. `docs/10_requirements/workflow.md`
            4. `docs/10_requirements/feature.md`
            5. `docs/10_requirements/requirements_screen_traceability_matrix.md`
            6. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
            7. 나머지 파생 UI 문서
            8. AI Agent 실행 문서

            ## 5. 권장 읽기 순서

            1. `docs/00_governance/document_definitions.md`
            2. `docs/00_governance/implementation_workflow.md`
            3. `docs/10_requirements/srs_final.md`
            4. `docs/10_requirements/requirements_screen_traceability_matrix.md`
            5. `docs/10_requirements/prd.md`
            6. `docs/10_requirements/feature.md`
            7. `docs/10_requirements/workflow.md`
            8. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
            9. `docs/20_derived_ui_specs/{{SLUG}}_wireframe_spec.md`
            10. 나머지 파생 UI 문서

            ## 6. 요구사항 변경 시 갱신 순서

            1. `srs_final.md`
            2. `prd.md`
            3. `requirements_screen_traceability_matrix.md`
            4. `{{SLUG}}_product_ia.md`
            5. `{{SLUG}}_wireframe_spec.md`
            6. `{{SLUG}}_screen_flow_spec.md`
            7. `{{SLUG}}_screen_state_matrix.md`
            8. `{{SLUG}}_ui_component_spec.md`
            9. `{{SLUG}}_design_system_tokens.md`
            10. `{{SLUG}}_screen_qa_checklist.md`
            11. `{{SLUG}}_ai_agent_implementation_request.md`
            12. `{{SLUG}}_ai_agent_execution_brief.md`
        """,
        "docs/00_governance/document_definitions.md": """
            # 문서 정의서

            ## 1. 목적

            본 문서는 {{PRODUCT_NAME}} 문서 세트의 역할, 기준성, 참조 순서, 갱신 원칙을 정의한다.

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
            - `{{SLUG}}_product_ia.md`: 제품 표면, 화면 구조, 전역 정보구조 기준 문서.
            - `{{SLUG}}_wireframe_spec.md`: 화면별 섹션, 컴포넌트, 상태, 이벤트, 권한 문서.
            - `{{SLUG}}_screen_flow_spec.md`: 화면 전환, 예외 흐름, deeplink 규칙 문서.
            - `{{SLUG}}_screen_state_matrix.md`: 화면 상태, 오류, 권한, 복구 경로 표준 문서.
            - `{{SLUG}}_ui_component_spec.md`: 공통 UI 및 도메인 컴포넌트 계약 문서.
            - `{{SLUG}}_design_system_tokens.md`: 디자인 토큰과 시각 규칙 문서.
            - `{{SLUG}}_screen_qa_checklist.md`: 화면별 QA 및 수용 기준 문서.
            - `{{SLUG}}_ai_agent_implementation_request.md`: AI Agent용 상세 구현 요청서.
            - `{{SLUG}}_ai_agent_execution_brief.md`: AI Agent용 압축 실행 브리프.

            ## 4. 문서 운영 원칙

            1. 기능 범위 변경은 `srs_final.md`에서 먼저 승인한다.
            2. `prd.md`가 `srs_final.md`와 충돌하면 `srs_final.md`를 우선한다.
            3. `feature.md`는 후보 수집과 확장 검토에만 사용한다.
            4. 파생 UI 문서는 상위 요구사항을 번역할 뿐 범위를 새로 결정하지 않는다.
            5. AI Agent용 문서는 상위 문서 정합성 검토 후 마지막에 갱신한다.
        """,
        "docs/00_governance/implementation_workflow.md": """
            # 구현 작업 워크플로

            ## 1. 목적

            본 문서는 {{PRODUCT_NAME}} 문서 세트를 기준으로 실제 제품 계획, 구현 준비, 구현 검증을 어떤 순서로 진행할지 정의한다.

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
        """,
        "docs/10_requirements/feature.md": """
            # {{PRODUCT_NAME}} 기능 후보 문서

            ## 1. 목적

            이 문서는 {{PRODUCT_NAME}}의 후보 기능을 수집하고 정규화한다. 이 문서는 승인된 범위가 아니며, `srs_final.md` 또는 `prd.md`에 반영된 항목만 구현 범위가 된다.

            ## 2. 기능 후보 작성 형식

            | 기능 ID | 기능명 | 사용자 목표 | 출처/근거 | 진입점 | 시스템 반응 | 예외/제약 | 실현 방식 | 릴리스 후보 | 상태 |
            | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
            | F-CORE-001 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | Type A/B/C/D | P0/P1/P2 | 후보 |

            ## 3. 기능군

            ### 3.1 CORE

            - 제품의 핵심 반복 사용 흐름을 정의한다.

            ### 3.2 AUTH / PERMISSION

            - 인증, 권한, 정책, 감사 요구를 정의한다.

            ### 3.3 WORKFLOW

            - 사용자가 목표를 달성하는 업무 흐름을 정의한다.

            ### 3.4 ADMIN / OPERATIONS

            - 운영자, 관리자, 보안 담당자의 기능 후보를 정의한다.

            ## 4. 제외 후보

            제외 또는 후순위 후보도 근거와 함께 남긴다.
        """,
        "docs/10_requirements/prd.md": """
            # {{PRODUCT_NAME}} PRD

            ## 1. 문서 개요

            - 문서명: {{PRODUCT_NAME}} 제품 요구사항 문서
            - 문서 버전: v0.1
            - 작성일: {{DATE}}
            - 대상 독자: Product, Design, Engineering, QA, Security, Operations

            ## 2. 제품 목표

            - 결정 필요

            ## 3. 대상 사용자

            | 사용자 유형 | 목표 | 주요 작업 | 권한/제약 |
            | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 4. 성공 지표

            | 지표 | 목표 | 측정 방법 |
            | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 5. 범위

            ### 5.1 In Scope

            - 결정 필요

            ### 5.2 Conditional Scope

            - 결정 필요

            ### 5.3 Out of Scope

            - 결정 필요

            ## 6. 핵심 사용자 시나리오

            ### SCN-001 결정 필요

            - 시작 조건:
            - 기본 흐름:
            - 대체 흐름:
            - 오류 흐름:
            - 관련 요구사항:

            ## 7. 기능 요구사항 요약

            | 요구사항 ID | 요약 | 우선순위 | 근거 |
            | --- | --- | --- | --- |
            | FR-CORE-001 | 결정 필요 | Must | 결정 필요 |

            ## 8. 비기능 요구사항 요약

            - 성능:
            - 보안:
            - 권한:
            - 감사:
            - 가용성:
            - 접근성:
            - 운영성:

            ## 9. 아키텍처 및 실행 환경 가정

            - 결정 필요

            ## 10. 릴리스 전략

            - P0:
            - P1:
            - P2:

            ## 11. 오픈 결정 사항

            | 결정 ID | 질문 | 선택지 | 필요 결정일 | 담당 |
            | --- | --- | --- | --- | --- |
            | ADR-001 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |
        """,
        "docs/10_requirements/workflow.md": """
            # {{PRODUCT_NAME}} SRS 작성 워크플로

            ## 1. 목적

            이 문서는 {{PRODUCT_NAME}}의 요구사항을 후보 기능에서 최종 SRS까지 정제하는 절차를 정의한다.

            ## 2. 단계

            1. 분석 범위 정의
            2. 소스 수집 및 분석 기준 수립
            3. 기능 인벤토리 작성
            4. 기능 클러스터링 및 정보 구조 정리
            5. 사용자 시나리오 및 업무 흐름 도출
            6. 구현/운영 대응성 검토
            7. 비기능 요구사항 및 제약 정의
            8. SRS 초안 작성
            9. 검토, 우선순위화, 확정

            ## 3. 기능 분석 필드

            - 기능 ID
            - 사용자 목표
            - 출처/근거
            - 진입 화면 또는 트리거
            - 주요 액션
            - 시스템 반응
            - 예외 상황
            - 데이터 모델 영향
            - 권한 및 감사 요구
            - 실현 방식
            - 릴리스 후보

            ## 4. 추적 구조

            소스 문서 ID -> 기능 ID -> 시나리오 ID -> 요구사항 ID -> 화면 ID -> QA 항목

            ## 5. SRS 작성 원칙

            - 기능 요구사항은 고유 요구사항 ID를 가진다.
            - 검증 가능한 문장으로 작성한다.
            - UI 설명과 시스템 행위를 구분한다.
            - 제외 범위와 조건부 범위를 명시한다.
        """,
        "docs/10_requirements/srs_final.md": """
            # {{PRODUCT_NAME}} 최종 요구사항 정의서

            ## 1. 문서 개요

            - 문서명: {{PRODUCT_NAME}} 최종 요구사항 정의서
            - 문서 버전: v0.1
            - 문서 성격: 최종 SRS 겸 구현 기준 문서
            - 기준 문서: `feature.md`, `prd.md`, `workflow.md`

            ## 2. 통합 결론

            - 결정 필요

            ## 3. 제품 비전과 목표

            ### 3.1 제품 비전

            - 결정 필요

            ### 3.2 정량 목표

            - 결정 필요

            ## 4. 범위 정의

            ### 4.1 In Scope

            - 결정 필요

            ### 4.2 Conditional Scope

            - 결정 필요

            ### 4.3 Out of Scope

            - 결정 필요

            ## 5. 가정과 제약

            ### 5.1 기본 가정

            1. 결정 필요

            ### 5.2 기술 제약

            1. 결정 필요

            ### 5.3 보안/운영 제약

            1. 결정 필요

            ## 6. 사용자와 권한 모델

            | 사용자 유형 | 권한 | 주요 목표 |
            | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 7. 대표 사용자 시나리오

            ### SCN-001 결정 필요

            - 목표:
            - 시작 조건:
            - 기본 흐름:
            - 예외 흐름:

            ## 8. 기능 실현 방식 분류

            - Type A: 기존 API 또는 설정으로 구현 가능
            - Type B: 서버/백엔드 실행 계층 필요
            - Type C: UX 재설계 필요
            - Type D: 정책상 제외 또는 후순위

            ## 9. 기능 요구사항

            ### 9.1 FR-CORE 공통 기능

            - FR-CORE-001 시스템은 결정 필요.

            ## 10. 외부 인터페이스 요구사항

            - 결정 필요

            ## 11. 데이터 및 추적성 요구사항

            - 결정 필요

            ## 12. 비기능 요구사항

            ### NFR-001 성능

            - 결정 필요

            ### NFR-002 보안

            - 결정 필요

            ### NFR-003 접근성

            - 결정 필요

            ### NFR-004 운영성

            - 결정 필요

            ## 13. 우선순위와 릴리스 전략

            - Must:
            - Should:
            - Could:
            - Won't:

            ## 14. 오픈 결정 사항

            | 결정 ID | 질문 | 상태 |
            | --- | --- | --- |
            | ADR-001 | 결정 필요 | open |
        """,
        "docs/10_requirements/requirements_screen_traceability_matrix.md": """
            # 요구사항-화면 추적 매트릭스

            ## 1. 목적

            본 문서는 `srs_final.md`의 요구사항 ID를 `{{SLUG}}_*` 파생 문서군의 화면 ID와 연결한다.

            ## 2. 사용 원칙

            1. 기능 기준은 `srs_final.md`다.
            2. 화면 ID 기준은 `../20_derived_ui_specs/{{SLUG}}_product_ia.md`와 `../20_derived_ui_specs/{{SLUG}}_wireframe_spec.md`다.
            3. 하나의 요구사항은 하나 이상의 화면 ID와 연결될 수 있다.
            4. UI가 직접 없는 요구사항도 관리자, 설정, 감사, 상태 화면 등 간접 노출 지점으로 연결한다.

            ## 3. 화면군 요약

            - `D-000` Entry / Auth / Gate
            - `D-001` Main Workspace
            - `D-010` Core Task Shell
            - `A-001` Admin Overview

            ## 4. 요구사항-화면 매트릭스

            | 요구사항 ID | 주요 화면 ID | 관련 화면 ID | 비고 |
            | --- | --- | --- | --- |
            | FR-CORE-001 | D-001 | D-010 | 결정 필요 |

            ## 5. 검증 메모

            - 모든 요구사항 ID는 `srs_final.md` 또는 `prd.md`에 존재해야 한다.
            - 모든 화면 ID는 IA 또는 wireframe 문서에 존재해야 한다.
        """,
        f"{derived}_product_ia.md": """
            # {{PRODUCT_NAME}} 제품 IA 문서

            ## 0. 현재 문서 세트와 사용 순서

            이 문서는 `docs/20_derived_ui_specs/`의 최상위 IA 기준 문서다. 제품 범위를 새로 정하지 않으며 `srs_final.md`와 `prd.md`의 승인 범위를 화면 구조로 번역한다.

            ## 1. 문서 범위

            - 제품 표면
            - 화면 계층
            - 전역 내비게이션
            - 주요 진입 경로
            - 화면 ID 체계

            ## 2. IA 설계 원칙

            1. 작업 중심 구조
            2. 점진적 공개
            3. 복구 가능성 우선
            4. 권한/정책 상태의 명시적 노출

            ## 3. 제품 표면 정의

            ```text
            Product Surface
            ├─ Primary App
            │  ├─ D-000 Entry / Auth / Gate
            │  ├─ D-001 Main Workspace
            │  └─ D-010 Core Task Shell
            └─ Admin Console
               └─ A-001 Admin Overview
            ```

            ## 4. 화면 ID 목록

            | 화면 ID | 화면명 | 목적 | 관련 요구사항 |
            | --- | --- | --- | --- |
            | D-000 | Entry / Auth / Gate | 사용자 진입과 인증/권한 확인 | FR-CORE-001 |
            | D-001 | Main Workspace | 핵심 업무 시작점 | FR-CORE-001 |
            | D-010 | Core Task Shell | 반복 작업이 수행되는 기본 셸 | FR-CORE-001 |
            | A-001 | Admin Overview | 관리/정책/감사 진입점 | 결정 필요 |

            ## 5. 구현 우선순위

            - P0:
            - P1:
            - P2:
        """,
        f"{derived}_wireframe_spec.md": """
            # {{PRODUCT_NAME}} 와이어프레임 사양서

            ## 0. 문서 위치와 책임

            이 문서는 화면별 목적, 진입 경로, 레이아웃, 섹션, 컴포넌트, 상태, 이벤트, 권한/정책을 정의한다.

            ## 1. 공통 화면 사양 형식

            각 화면은 다음 순서를 따른다.

            - 화면 목적
            - 진입 경로
            - 레이아웃 구조
            - 섹션 정의
            - 주요 컴포넌트
            - 상태 정의
            - 이벤트 정의
            - 권한/정책
            - 구현 메모

            ## 2. 공통 컴포넌트 레지스트리

            | 컴포넌트 ID | 이름 | 목적 |
            | --- | --- | --- |
            | C-001 | AppTopBar | 전역 컨텍스트와 주요 액션 |
            | C-002 | LeftNavPanel | 주요 화면 이동 |
            | C-003 | InspectorPanel | 선택 항목 상세 |
            | C-004 | EmptyState | 빈 상태 안내 |
            | C-005 | ErrorBanner | 오류 상태 안내 |

            ## D-000 Entry / Auth / Gate

            ### 화면 목적

            사용자 진입, 인증 상태, 권한 게이트를 처리한다.

            ### 상태 정의

            - loading_initial
            - unauthenticated
            - no_permission
            - ready

            ### 이벤트 정의

            - `auth.start`
            - `auth.retry`

            ## D-001 Main Workspace

            ### 화면 목적

            사용자의 핵심 업무 시작점이다.

            ### 섹션 정의

            - 전역 헤더
            - 주요 작업 목록
            - 최근 항목
            - 상태/알림

            ### 상태 정의

            - loading_initial
            - empty
            - partial_data
            - ready

            ### 이벤트 정의

            - `workspace.open`
            - `item.pin`
            - `item.search`

            ## D-010 Core Task Shell

            ### 화면 목적

            반복 작업과 상세 확인이 수행되는 주 작업 셸이다.

            ### 레이아웃 구조

            - Top bar
            - Left navigation
            - Center work area
            - Right inspector
            - Bottom task/status area
        """,
        f"{derived}_screen_flow_spec.md": """
            # {{PRODUCT_NAME}} 화면 플로우 명세서

            ## 1. 전환 규칙

            - 전환은 사용자의 현재 컨텍스트를 보존해야 한다.
            - 실패 전환은 원인, 영향, 복구 경로를 표시해야 한다.
            - 모달/드로어/풀스크린 전환은 뒤로가기와 ESC 동작을 정의해야 한다.

            ## 2. Deeplink 규칙

            - 존재하지 않는 대상: not_found 상태
            - 권한 없음: no_permission 상태
            - 인증 만료: auth_expired 상태

            ## F-000 Entry Flow

            1. 사용자가 진입한다.
            2. 시스템이 인증/세션/권한을 확인한다.
            3. 성공 시 `D-001`로 이동한다.
            4. 실패 시 원인별 복구 경로를 제공한다.

            ## F-010 Core Task Flow

            1. 사용자가 `D-001`에서 작업 대상을 선택한다.
            2. 시스템이 `D-010` 작업 셸을 연다.
            3. 사용자는 세부 작업을 수행한다.
            4. 시스템은 성공/실패/부분 실패를 상태로 표시한다.

            ## 3. 공통 예외 흐름

            - not_found
            - no_permission
            - auth_expired
            - offline
            - partial_failure
        """,
        f"{derived}_screen_state_matrix.md": """
            # {{PRODUCT_NAME}} 화면 상태 매트릭스

            ## 1. 상태 설계 원칙

            상태는 단순 문구가 아니라 사용자가 다음 행동을 결정할 수 있는 UI로 표현한다.

            ## 2. 공통 상태 분류

            | 상태 | 의미 | 필수 UI |
            | --- | --- | --- |
            | loading_initial | 최초 데이터 로딩 | skeleton 또는 progress |
            | empty | 표시할 데이터 없음 | 원인과 다음 액션 |
            | stale | 최신성이 낮음 | refresh 안내 |
            | no_permission | 권한 없음 | 필요한 권한과 요청 경로 |
            | auth_expired | 인증 만료 | 재인증 액션 |
            | offline | 연결 없음 | 사용 가능 범위와 재시도 |
            | partial_failure | 일부 실패 | 성공/실패 분리 표시 |
            | recoverable_error | 복구 가능 오류 | retry 또는 대체 경로 |
            | unrecoverable_error | 복구 불가 오류 | 영향과 지원 경로 |

            ## 3. 화면별 상태

            | 화면 ID | 필수 상태 | 복구 경로 |
            | --- | --- | --- |
            | D-000 | loading_initial, unauthenticated, no_permission, ready | retry/re-auth |
            | D-001 | loading_initial, empty, partial_failure, ready | refresh/search |
            | D-010 | loading_initial, stale, operation_pending, recoverable_error | retry/rollback |
        """,
        f"{derived}_ui_component_spec.md": """
            # {{PRODUCT_NAME}} UI 컴포넌트 명세서

            ## 1. 문서 원칙

            동일 의미의 컴포넌트를 중복 구현하지 않는다. 각 컴포넌트는 책임, 입력, 상태, 이벤트, 접근성을 가진다.

            ## 2. 컴포넌트 분류

            - App Shell Components
            - Navigation Components
            - Data Surface Components
            - Action Components
            - Feedback Components

            ## C-001 AppTopBar

            - 책임: 전역 컨텍스트와 주요 명령 제공
            - 필수 상태: default, loading, disabled_by_policy
            - 접근성: landmark 또는 명확한 label 제공

            ## C-002 LeftNavPanel

            - 책임: 주요 화면 이동
            - 이벤트: `nav.open`
            - 접근성: keyboard navigation, selected state

            ## C-003 InspectorPanel

            - 책임: 선택 항목 상세와 보조 액션
            - 상태: empty_selection, loading, ready, error

            ## C-004 EmptyState

            - 책임: 빈 상태의 원인과 다음 액션 제공

            ## C-005 ErrorBanner

            - 책임: 오류 원인, 영향, 복구 액션 제공
        """,
        f"{derived}_design_system_tokens.md": """
            # {{PRODUCT_NAME}} 디자인 시스템 토큰 문서

            ## 1. 디자인 원칙

            - 제품 도메인에 맞는 정보 밀도 유지
            - 상태와 권한을 색상만으로 전달하지 않기
            - 재사용 가능한 semantic token 우선

            ## 2. 토큰 계층

            - Primitive token: raw scale
            - Semantic token: 제품 의미
            - Component token: 컴포넌트 적용

            ## 3. Color Tokens

            | Token | 목적 |
            | --- | --- |
            | `surface.base` | 기본 배경 |
            | `surface.raised` | 패널/오버레이 |
            | `text.primary` | 주요 텍스트 |
            | `text.muted` | 보조 텍스트 |
            | `border.default` | 기본 경계 |
            | `status.success` | 성공 |
            | `status.warning` | 경고 |
            | `status.danger` | 위험 |

            ## 4. Typography Tokens

            - `type.body`
            - `type.label`
            - `type.heading`
            - `type.mono`

            ## 5. Spacing / Layout

            - dense operational surfaces use compact spacing.
            - major content regions must have stable dimensions and avoid layout shift.

            ## 6. Interaction

            - hover
            - focus
            - selected
            - disabled
            - loading
        """,
        f"{derived}_screen_qa_checklist.md": """
            # {{PRODUCT_NAME}} 화면 QA 체크리스트

            ## 1. 사용 방법

            구현 후 화면별로 체크하고, 실패 항목은 요구사항 또는 화면 ID에 연결한다.

            ## 2. 공통 검수 항목

            - 주요 화면 간 이동이 되는가
            - loading, empty, error, no_permission 상태가 있는가
            - 권한 또는 정책으로 비활성화된 액션이 이유를 표시하는가
            - destructive action에 확인과 복구 경로가 있는가
            - keyboard navigation과 focus indicator가 있는가
            - 텍스트와 컨트롤이 겹치지 않는가

            ## 3. 화면별 체크리스트

            ## D-000 Entry / Auth / Gate

            - [ ] 인증 전/후 상태가 구분된다.
            - [ ] 실패 시 재시도 경로가 있다.

            ## D-001 Main Workspace

            - [ ] 검색/필터/선택 흐름이 동작한다.
            - [ ] 빈 상태가 다음 행동을 제시한다.

            ## D-010 Core Task Shell

            - [ ] 좌측 탐색, 중앙 작업, 우측 상세, 하단 상태 영역이 연결된다.
            - [ ] 작업 진행 상태가 표시된다.

            ## 4. 릴리즈 게이트

            - [ ] SRS 요구사항과 추적 가능하다.
            - [ ] 상태 매트릭스와 불일치가 없다.
            - [ ] 알려진 제한이 문서화되어 있다.
        """,
        f"{derived}_ai_agent_implementation_request.md": """
            # {{PRODUCT_NAME}} 구현 요청서 for AI Agent

            ## 1. 목적

            이 문서는 AI Agent에게 {{PRODUCT_NAME}} 구현을 요청하기 위한 상세 실행 지시서다. 이 문서는 설계 원본이 아니며, 상위 문서의 승인 범위를 구현 가능한 작업으로 포장한다.

            ## 2. 필수 입력 문서

            1. `../00_governance/document_definitions.md`
            2. `../00_governance/implementation_workflow.md`
            3. `../10_requirements/srs_final.md`
            4. `../10_requirements/prd.md`
            5. `{{SLUG}}_product_ia.md`
            6. `{{SLUG}}_wireframe_spec.md`
            7. `{{SLUG}}_screen_flow_spec.md`
            8. `{{SLUG}}_screen_state_matrix.md`
            9. `{{SLUG}}_ui_component_spec.md`
            10. `{{SLUG}}_design_system_tokens.md`
            11. `{{SLUG}}_screen_qa_checklist.md`

            ## 3. 구현 원칙

            - 빈 라우트, TODO-only 화면, 장식용 목업으로 끝내지 않는다.
            - 상태, 예외, 권한, 복구 흐름을 포함한다.
            - 공통 컴포넌트와 화면 전용 컴포넌트를 구분한다.
            - 기존 저장소가 있다면 기존 기술 스택과 패턴을 우선한다.
            - 더미 데이터가 필요하면 실제 도메인 모델을 흉내 낸 realistic fixture를 사용한다.

            ## 4. 구현 범위

            ### 4.1 1차 범위

            - D-000
            - D-001
            - D-010

            ### 4.2 2차 범위

            - 결정 필요

            ## 5. 완료 기준

            - 화면 간 이동 가능
            - 각 화면의 주요 상태 구현
            - 권한/정책 비활성화 이유 표시
            - QA 체크리스트 self-check 결과 기록
            - 미구현 범위와 API 연결 지점 문서화
        """,
        f"{derived}_ai_agent_execution_brief.md": """
            # {{PRODUCT_NAME}} Execution Brief for AI Agent

            ## 1. 목적

            이 문서는 AI Agent가 바로 구현 작업에 착수하기 위한 압축 실행 브리프다.

            ## 2. 읽기 순서

            1. `../10_requirements/srs_final.md`
            2. `../10_requirements/requirements_screen_traceability_matrix.md`
            3. `../10_requirements/prd.md`
            4. `{{SLUG}}_product_ia.md`
            5. `{{SLUG}}_wireframe_spec.md`
            6. `{{SLUG}}_screen_flow_spec.md`
            7. `{{SLUG}}_screen_state_matrix.md`
            8. `{{SLUG}}_ui_component_spec.md`
            9. `{{SLUG}}_design_system_tokens.md`
            10. `{{SLUG}}_screen_qa_checklist.md`

            ## 3. 절대 원칙

            - `srs_final.md`와 `prd.md`가 범위를 결정한다.
            - 파생 문서와 이 브리프는 범위를 새로 만들 수 없다.
            - 구현 편의로 문서 범위를 조용히 바꾸지 않는다.

            ## 4. 1차 실행 범위

            - D-000 Entry / Auth / Gate
            - D-001 Main Workspace
            - D-010 Core Task Shell

            ## 5. 구현 순서

            1. 앱 셸과 라우팅/전환 구조
            2. 도메인 타입과 fixture/mock adapter
            3. 화면별 컨테이너
            4. 공통 상태와 오류/권한 처리
            5. QA 체크와 known limitations 기록

            ## 6. 제출 형식

            - 구현 범위 요약
            - 미구현 범위 요약
            - 기술 결정 사항
            - API 연결 포인트
            - 검증 결과
        """,
    }


def build_full_product_templates(slug: str) -> dict[str, str]:
    arch = f"docs/30_technical_architecture/{slug}"
    delivery = f"docs/40_delivery/{slug}"
    derived = f"docs/20_derived_ui_specs/{slug}"
    return {
        "AGENTS.md": """
            <!-- Generated: {{DATE}} -->

            # {{PRODUCT_NAME}}

            ## Purpose

            Documentation-first product planning repository for {{PRODUCT_NAME}}. This repo holds governance rules, PRD/SRS requirements, traceability, derived UI specifications, technical architecture, delivery validation, QA gates, and AI-agent execution briefs.

            ## Key Files

            | File | Description |
            | --- | --- |
            | `docs/README.md` | Master index, reading order, priority rules, and update cascade |
            | `docs/10_requirements/srs_final.md` | Final implementation baseline and highest-priority product truth |
            | `docs/30_technical_architecture/{{SLUG}}_system_architecture.md` | System/runtime architecture derived from approved requirements |
            | `docs/40_delivery/{{SLUG}}_release_validation_plan.md` | Release gates and validation plan |

            ## Subdirectories

            | Directory | Purpose |
            | --- | --- |
            | `docs/00_governance/` | Document roles, priority, and workflow rules |
            | `docs/10_requirements/` | Feature candidates, PRD, workflow, SRS, traceability |
            | `docs/20_derived_ui_specs/` | IA, wireframes, flows, states, components, tokens, QA, agent briefs |
            | `docs/30_technical_architecture/` | System, frontend, backend, API, data, async, security, infra, observability architecture |
            | `docs/40_delivery/` | Implementation roadmap and release validation |

            ## For AI Agents

            - Read `docs/README.md` before editing planning documents.
            - Never invent requirements. Approved scope starts in `docs/10_requirements/srs_final.md`.
            - Conflict priority: `srs_final.md` > `prd.md` > `workflow.md` > `feature.md` > traceability matrix > derived UI specs > technical architecture > delivery docs > AI-agent briefs.
            - Architecture can choose implementation shape only inside approved SRS/PRD constraints.
            - Delivery plans package approved work; they do not add product scope.
            - Keep IDs stable. Deprecate by marking; do not renumber.
            - Preserve the repository language and document style.

            ## Testing Requirements

            This repository may be documentation-only. If no application source exists, validate with document checks:

            ```bash
            rg "FR-[A-Z0-9]+-[0-9]+" docs/
            rg "\\b[DWA]-[0-9]{3}" docs/
            rg "\\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\\bREL-[0-9]{3}" docs/
            rg "docs/.+\\.md" docs/
            ```
        """,
        "CLAUDE.md": """
            # CLAUDE.md

            This file provides guidance to Claude Code when working with this repository.

            ## Repository Type

            This repository is a documentation-first SRS/PRD product planning environment for {{PRODUCT_NAME}}. It is intended to support full product implementation planning across product, UX, frontend, backend, API, data, infrastructure, security, operations, QA, and release validation.

            ## Core Working Principle

            Favor correctness, traceability, and minimal changes over speed. Do not assume missing requirements. Surface ambiguity, document assumptions, and preserve the hierarchy of source documents.

            ## Document Hierarchy

            - `docs/00_governance/`: rules that govern every other document.
            - `docs/10_requirements/`: authoritative product scope.
            - `docs/20_derived_ui_specs/`: screen-level and execution-level documents derived from approved requirements.
            - `docs/30_technical_architecture/`: implementation architecture derived from requirements and UI specs.
            - `docs/40_delivery/`: implementation slices, release validation, rollout, rollback, and readiness gates.

            ## Conflict-Resolution Priority

            1. `docs/10_requirements/srs_final.md`
            2. `docs/10_requirements/prd.md`
            3. `docs/10_requirements/workflow.md`
            4. `docs/10_requirements/feature.md`
            5. `docs/10_requirements/requirements_screen_traceability_matrix.md`
            6. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
            7. Remaining derived UI specs
            8. `docs/30_technical_architecture/*`
            9. `docs/40_delivery/*`
            10. AI-agent implementation request and execution brief

            Derived UI, technical architecture, delivery, and agent briefs can never expand scope beyond the SRS or PRD. If downstream docs need something the SRS does not grant, update the SRS first.

            ## Update Cascade

            1. `srs_final.md`
            2. `prd.md`
            3. `requirements_screen_traceability_matrix.md`
            4. derived UI specs in `docs/20_derived_ui_specs/`
            5. technical architecture docs in `docs/30_technical_architecture/`
            6. delivery docs in `docs/40_delivery/`
            7. AI-agent implementation request and execution brief

            ## ID Conventions

            - Functional requirements: `FR-<AREA>-###`
            - Nonfunctional requirements: `NFR-###`
            - Scenarios: `SCN-###`
            - Screens: `D-###`, `W-###`, `A-###`
            - Components: `C-###`
            - Flows: `F-###`
            - API operations: `API-<AREA>-###`
            - Data entities: `ENT-<AREA>-###`
            - Jobs: `JOB-<AREA>-###`
            - Events: `EVT-<AREA>-###`
            - Release slices: `REL-###`
            - Decisions: `ADR-###`

            ## Verification

            Since this may be a documentation-only repository, verification is manual and link-based unless code tooling exists.

            ```bash
            rg "FR-[A-Z0-9]+-[0-9]+" docs/
            rg "\\b[DWA]-[0-9]{3}" docs/
            rg "\\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\\bREL-[0-9]{3}" docs/
            rg "TODO|TBD|미정|결정 필요" docs/
            ```

            ## Application Code Guidelines

            Apply this section only if application source code exists or is added later. Application code must implement the approved scope from `srs_final.md` and `prd.md`; it must not implement candidate-only ideas from `feature.md`.
        """,
        "docs/README.md": """
            # 문서 인덱스

            ## 1. 목적

            이 문서는 {{PRODUCT_NAME}}의 SRS/PRD 기반 제품 계획 문서 전체를 안내하는 최상위 인덱스다. 목표는 요구사항, UX/UI, 시스템 아키텍처, 프론트엔드, 백엔드, API, 데이터, 인프라, 보안, 운영, 릴리스 검증을 하나의 추적 가능한 문서 체계로 묶는 것이다.

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
                {{SLUG}}_product_ia.md
                {{SLUG}}_wireframe_spec.md
                {{SLUG}}_screen_flow_spec.md
                {{SLUG}}_screen_state_matrix.md
                {{SLUG}}_ui_component_spec.md
                {{SLUG}}_design_system_tokens.md
                {{SLUG}}_screen_qa_checklist.md
                {{SLUG}}_ai_agent_implementation_request.md
                {{SLUG}}_ai_agent_execution_brief.md
              30_technical_architecture/
                {{SLUG}}_system_architecture.md
                {{SLUG}}_frontend_architecture.md
                {{SLUG}}_backend_architecture.md
                {{SLUG}}_api_contracts.md
                {{SLUG}}_data_model.md
                {{SLUG}}_async_events_jobs.md
                {{SLUG}}_security_privacy_architecture.md
                {{SLUG}}_infrastructure_operations.md
                {{SLUG}}_observability_reliability.md
                {{SLUG}}_architecture_decision_records.md
              40_delivery/
                {{SLUG}}_implementation_roadmap.md
                {{SLUG}}_release_validation_plan.md
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
            6. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
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
            6. `docs/20_derived_ui_specs/{{SLUG}}_product_ia.md`
            7. `docs/20_derived_ui_specs/{{SLUG}}_wireframe_spec.md`
            8. `docs/30_technical_architecture/{{SLUG}}_system_architecture.md`
            9. `docs/30_technical_architecture/{{SLUG}}_frontend_architecture.md`
            10. `docs/30_technical_architecture/{{SLUG}}_backend_architecture.md`
            11. `docs/30_technical_architecture/{{SLUG}}_api_contracts.md`
            12. `docs/30_technical_architecture/{{SLUG}}_data_model.md`
            13. `docs/30_technical_architecture/{{SLUG}}_infrastructure_operations.md`
            14. `docs/40_delivery/{{SLUG}}_implementation_roadmap.md`
            15. `docs/40_delivery/{{SLUG}}_release_validation_plan.md`

            ## 6. 요구사항 변경 시 갱신 순서

            1. `srs_final.md`
            2. `prd.md`
            3. `requirements_screen_traceability_matrix.md`
            4. `{{SLUG}}_product_ia.md`
            5. `{{SLUG}}_wireframe_spec.md`
            6. `{{SLUG}}_screen_flow_spec.md`
            7. `{{SLUG}}_screen_state_matrix.md`
            8. `{{SLUG}}_ui_component_spec.md`
            9. `{{SLUG}}_design_system_tokens.md`
            10. `{{SLUG}}_screen_qa_checklist.md`
            11. `30_technical_architecture/*`
            12. `40_delivery/*`
            13. `{{SLUG}}_ai_agent_implementation_request.md`
            14. `{{SLUG}}_ai_agent_execution_brief.md`
        """,
        "docs/30_technical_architecture/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # 30_technical_architecture

            ## Purpose

            Implementation architecture layer for {{PRODUCT_NAME}}. Documents here translate approved SRS/PRD scope and derived UI specs into system, frontend, backend, API, data, async, security, infrastructure, observability, and ADR decisions.

            ## For AI Agents

            - Do not add product scope from architecture docs.
            - Every major architecture decision must cite requirement IDs, quality attributes, or ADRs.
            - Keep API, data, job, event, and release IDs stable.
            - If architecture requires new product behavior, update `../10_requirements/srs_final.md` first and cascade.
        """,
        "docs/40_delivery/AGENTS.md": """
            <!-- Parent: ../AGENTS.md -->
            <!-- Generated: {{DATE}} -->

            # 40_delivery

            ## Purpose

            Delivery planning layer for {{PRODUCT_NAME}}. Documents here convert approved requirements and architecture into implementation slices, release gates, validation plans, rollout, rollback, and operational readiness.

            ## For AI Agents

            - Delivery docs package approved work; they do not add scope.
            - Cross-functional dependencies must be explicit.
            - Release validation must include product, frontend, backend, API, data, infrastructure, security, accessibility, performance, observability, and rollback checks.
        """,
        f"{arch}_system_architecture.md": """
            # {{PRODUCT_NAME}} 시스템 아키텍처

            ## 1. 목적

            이 문서는 {{PRODUCT_NAME}}의 전체 런타임 구조와 기술 경계를 정의한다. 모든 결정은 `../10_requirements/srs_final.md`와 `../10_requirements/prd.md`의 승인 범위 안에서만 유효하다.

            ## 2. 품질 속성

            | 속성 | 목표 | 관련 요구사항 | 설계 영향 |
            | --- | --- | --- | --- |
            | 성능 | 결정 필요 | NFR-001 | 결정 필요 |
            | 보안 | 결정 필요 | NFR-002 | 결정 필요 |
            | 가용성 | 결정 필요 | NFR-004 | 결정 필요 |

            ## 3. 상위 런타임 구조

            ```text
            Product Runtime
            ├─ Web / Client App
            ├─ API Gateway / BFF
            ├─ Domain API Services
            ├─ Worker / Job Runtime
            ├─ External Integrations
            ├─ Realtime Gateway
            ├─ Data Stores
            ├─ Queue / Event Bus
            ├─ Secret Store
            └─ Observability / Operations
            ```

            ## 4. 시스템 경계

            | 경계 | 책임 | 소유 문서 | 관련 요구사항 |
            | --- | --- | --- | --- |
            | Frontend | 사용자 경험, 화면 상태, API 호출 | `{{SLUG}}_frontend_architecture.md` | 결정 필요 |
            | Backend | 도메인 로직, 권한, 오케스트레이션 | `{{SLUG}}_backend_architecture.md` | 결정 필요 |
            | Data | 영속성, 조회 모델, 마이그레이션 | `{{SLUG}}_data_model.md` | 결정 필요 |
            | Infra | 배포, 네트워크, 런타임, 복구 | `{{SLUG}}_infrastructure_operations.md` | 결정 필요 |

            ## 5. 주요 의존성

            - 결정 필요

            ## 6. 핵심 아키텍처 리스크

            | 리스크 | 영향 | 완화 | ADR |
            | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | ADR-001 |
        """,
        f"{arch}_frontend_architecture.md": """
            # {{PRODUCT_NAME}} 프론트엔드 아키텍처

            ## 1. 목적

            화면 ID, 라우팅, 렌더링 방식, 상태 경계, 컴포넌트 책임, API 호출, 접근성, 성능 기준을 정의한다.

            ## 2. 기술 스택 가정

            | 항목 | 결정 | ADR |
            | --- | --- | --- |
            | Framework | 결정 필요 | ADR-001 |
            | Language | TypeScript 권장 | ADR-001 |
            | State | 결정 필요 | ADR-002 |
            | Data Fetching | 결정 필요 | ADR-002 |

            ## 3. 라우트/화면 매핑

            | Route | 화면 ID | 관련 요구사항 | Rendering | 데이터 출처 |
            | --- | --- | --- | --- | --- |
            | `/` | D-000 | FR-CORE-001 | 결정 필요 | API-CORE-001 |

            ## 4. 상태 경계

            - Server state:
            - Client state:
            - URL state:
            - Form/draft state:
            - Realtime event state:

            ## 5. 컴포넌트 소유권

            | 컴포넌트 ID | 컴포넌트 | 책임 | 소유 영역 |
            | --- | --- | --- | --- |
            | C-001 | AppTopBar | 전역 컨텍스트 | app shell |

            ## 6. 오류/로딩/권한 모델

            - loading_initial:
            - empty:
            - recoverable_error:
            - no_permission:
            - stale/partial data:

            ## 7. 접근성 및 성능 기준

            - 키보드 이동:
            - focus 표시:
            - 화면 리더 label:
            - 리스트/테이블 virtualization:
            - 초기 로딩 예산:

            ## 8. 테스트 전략

            - Unit:
            - Component:
            - Integration:
            - E2E:
        """,
        f"{arch}_backend_architecture.md": """
            # {{PRODUCT_NAME}} 백엔드 아키텍처

            ## 1. 목적

            백엔드 모듈, 도메인 경계, 권한/정책 검사, 오케스트레이션, 외부 연동, 트랜잭션, 실패 처리를 정의한다.

            ## 2. 모듈 맵

            | 모듈 | 책임 | 관련 요구사항 | API | 데이터 |
            | --- | --- | --- | --- | --- |
            | core | 결정 필요 | FR-CORE-001 | API-CORE-001 | ENT-CORE-001 |

            ## 3. 동기/비동기 경계

            | 작업 | 방식 | Job/Event | 사용자 피드백 |
            | --- | --- | --- | --- |
            | 결정 필요 | sync/async | JOB-CORE-001 | 결정 필요 |

            ## 4. 권한/정책/감사

            모든 write action은 다음을 정의한다.

            - actor context
            - resource context
            - permission check
            - policy check
            - idempotency key
            - audit event
            - rollback 또는 recovery path

            ## 5. 외부 연동

            | 연동 | 목적 | 인증 | rate limit | 장애 모드 |
            | --- | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 6. 실패 처리

            - validation failure:
            - auth failure:
            - dependency timeout:
            - partial failure:
            - retry exhausted:
        """,
        f"{arch}_api_contracts.md": """
            # {{PRODUCT_NAME}} API 계약

            ## 1. 목적

            프론트엔드와 백엔드, 외부 연동, 실시간 이벤트 간 계약을 정의한다.

            ## 2. 공통 원칙

            1. 조회 API와 write API를 분리한다.
            2. write API는 idempotency key를 가진다.
            3. 모든 오류는 기계 판독 가능한 code와 사용자 조치 힌트를 가진다.
            4. 권한/정책으로 거부된 액션은 숨기지 않고 사유를 제공한다.

            ## 3. API 카탈로그

            | API ID | Method | Path/Operation | 목적 | Request | Response | Error | Authz | 관련 요구사항 |
            | --- | --- | --- | --- | --- | --- | --- | --- | --- |
            | API-CORE-001 | GET | `/api/core` | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | FR-CORE-001 |

            ## 4. DTO 표준

            - ID는 stable canonical ID를 사용한다.
            - 시간은 ISO-8601로 전달한다.
            - enum은 문서화된 값만 허용한다.
            - optional과 nullable을 구분한다.

            ## 5. 오류 모델

            | Error Code | HTTP/Transport | 의미 | 사용자 조치 |
            | --- | --- | --- | --- |
            | CORE_VALIDATION_FAILED | 400 | 결정 필요 | 결정 필요 |

            ## 6. Realtime/Event 계약

            | Event ID | Event Name | Producer | Consumer | Payload | Ordering |
            | --- | --- | --- | --- | --- | --- |
            | EVT-CORE-001 | `core.updated` | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |
        """,
        f"{arch}_data_model.md": """
            # {{PRODUCT_NAME}} 데이터 모델

            ## 1. 목적

            핵심 엔티티, 관계, 소유권, 수명주기, 마이그레이션, 보존, 백업/복구 기준을 정의한다.

            ## 2. 엔티티 카탈로그

            | Entity ID | 엔티티 | 책임 | 주요 필드 | 소유 모듈 | 관련 요구사항 |
            | --- | --- | --- | --- | --- | --- |
            | ENT-CORE-001 | CoreEntity | 결정 필요 | 결정 필요 | core | FR-CORE-001 |

            ## 3. 관계 및 일관성

            - 결정 필요

            ## 4. 인덱스 및 조회 패턴

            | 엔티티 | 조회 패턴 | 인덱스 | 성능 목표 |
            | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 5. 마이그레이션 정책

            - backward compatible migration:
            - destructive migration:
            - rollback:
            - seed/fixture:

            ## 6. 보존/삭제/백업

            - retention:
            - soft delete:
            - hard delete:
            - backup/restore:
        """,
        f"{arch}_async_events_jobs.md": """
            # {{PRODUCT_NAME}} 비동기 작업 및 이벤트

            ## 1. 목적

            장시간 작업, 큐, 이벤트, 재시도, dead letter, 진행률, 실시간 갱신 계약을 정의한다.

            ## 2. Job 카탈로그

            | Job ID | 작업 | Trigger | Worker | Retry | Timeout | Progress Event | 관련 요구사항 |
            | --- | --- | --- | --- | --- | --- | --- | --- |
            | JOB-CORE-001 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | EVT-CORE-001 | FR-CORE-001 |

            ## 3. Event 카탈로그

            | Event ID | 이름 | Producer | Consumer | Payload | Ordering/Dedupe |
            | --- | --- | --- | --- | --- | --- |
            | EVT-CORE-001 | `core.job.progress` | worker | frontend | 결정 필요 | 결정 필요 |

            ## 4. 실패 처리

            - retryable:
            - non-retryable:
            - dead letter:
            - user-visible recovery:

            ## 5. 운영 지표

            - queue depth:
            - job latency:
            - retry rate:
            - DLQ count:
        """,
        f"{arch}_security_privacy_architecture.md": """
            # {{PRODUCT_NAME}} 보안 및 개인정보 아키텍처

            ## 1. 목적

            trust boundary, 인증, 권한, 정책, secret, 감사, 개인정보, threat model, abuse case를 정의한다.

            ## 2. Trust Boundaries

            | Boundary | 신뢰 수준 | 통제 | 관련 요구사항 |
            | --- | --- | --- | --- |
            | 사용자 브라우저 | untrusted | session/csrf/csp | NFR-002 |
            | API | controlled | authz/policy/audit | NFR-002 |

            ## 3. 인증/권한 모델

            - principal:
            - role:
            - resource:
            - permission:
            - policy:

            ## 4. Secret Handling

            | Secret | 저장 위치 | 접근 주체 | 회전 | 감사 |
            | --- | --- | --- | --- | --- |
            | 결정 필요 | secret store | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 5. 감사 모델

            모든 중요 write action은 actor, resource, action, decision, result, request id, timestamp를 남긴다.

            ## 6. Threat / Abuse Cases

            | Threat ID | 시나리오 | 영향 | 완화 |
            | --- | --- | --- | --- |
            | THR-001 | 결정 필요 | 결정 필요 | 결정 필요 |
        """,
        f"{arch}_infrastructure_operations.md": """
            # {{PRODUCT_NAME}} 인프라 및 운영 아키텍처

            ## 1. 목적

            환경, 배포 토폴로지, compute/storage/network, configuration, scaling, migration, backup, restore, rollout, rollback, DR을 정의한다.

            ## 2. 환경

            | Environment | 목적 | 데이터 | 접근 | 배포 방식 |
            | --- | --- | --- | --- | --- |
            | local | 개발 | fixture/dev | 개발자 | 결정 필요 |
            | staging | 검증 | masked/sample | 제한 | 결정 필요 |
            | production | 운영 | real | 운영 정책 | 결정 필요 |

            ## 3. 배포 단위

            | Unit | 책임 | Scale 기준 | Health Check | Rollback |
            | --- | --- | --- | --- | --- |
            | web | UI | RPS/latency | `/health` | 결정 필요 |
            | api | API/BFF | RPS/latency | `/health` | 결정 필요 |
            | worker | jobs | queue depth | job heartbeat | 결정 필요 |

            ## 4. Backing Services

            - Database:
            - Cache:
            - Queue:
            - Object storage:
            - Secret store:
            - Realtime gateway:

            ## 5. 운영 절차

            - deploy:
            - migration:
            - rollback:
            - backup/restore:
            - disaster recovery:
            - scheduled cleanup:
        """,
        f"{arch}_observability_reliability.md": """
            # {{PRODUCT_NAME}} 관측성 및 신뢰성

            ## 1. 목적

            SLO, SLI, 로그, 메트릭, 트레이스, 알림, 대시보드, 런북, 장애 모드, 용량 계획을 정의한다.

            ## 2. SLO / SLI

            | SLO | SLI | 목표 | 측정 | 관련 요구사항 |
            | --- | --- | --- | --- | --- |
            | 결정 필요 | latency/error rate | 결정 필요 | 결정 필요 | NFR-004 |

            ## 3. Telemetry

            - request logs:
            - audit logs:
            - job logs:
            - frontend events:
            - traces:
            - business metrics:

            ## 4. Alerts

            | Alert | 조건 | Severity | Runbook |
            | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 5. Runbooks

            - dependency outage:
            - auth failure spike:
            - queue backlog:
            - database migration failure:
            - partial outage/degraded mode:
        """,
        f"{arch}_architecture_decision_records.md": """
            # {{PRODUCT_NAME}} Architecture Decision Records

            ## 1. 목적

            구현 비용, 운영 리스크, 확장성, 보안, 개발 속도에 영향을 주는 아키텍처 결정을 기록한다.

            ## 2. ADR 목록

            | ADR ID | 제목 | 상태 | 결정일 | 영향 문서 |
            | --- | --- | --- | --- | --- |
            | ADR-001 | 기술 스택 결정 | proposed | {{DATE}} | system/frontend/backend |

            ## ADR-001 기술 스택 결정

            ### Context

            - 결정 필요

            ### Options

            1. 결정 필요
            2. 결정 필요

            ### Decision

            - 결정 필요

            ### Consequences

            - Positive:
            - Negative:
            - Follow-up:
        """,
        f"{delivery}_implementation_roadmap.md": """
            # {{PRODUCT_NAME}} 구현 로드맵

            ## 1. 목적

            승인된 요구사항과 아키텍처를 실제 구현 가능한 vertical slice와 milestone으로 분해한다.

            ## 2. 원칙

            - 각 slice는 요구사항, 화면, API, 데이터, 테스트, 운영 준비를 함께 가진다.
            - UI만 구현하거나 API만 구현한 상태를 완료로 보지 않는다.
            - 선행 의존성을 명시하고, 위험한 결정은 ADR로 연결한다.

            ## 3. Milestones

            | REL ID | 목표 | 포함 요구사항 | 주요 산출물 | Exit Criteria |
            | --- | --- | --- | --- | --- |
            | REL-001 | 기반 셸과 핵심 경로 | FR-CORE-001 | FE/BE/API/data baseline | 결정 필요 |

            ## 4. Slice Definition

            | Slice | FE | BE/API | Data | Infra/Ops | QA | Risk |
            | --- | --- | --- | --- | --- | --- | --- |
            | REL-001 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |

            ## 5. 의존성 지도

            - Product:
            - Design:
            - Frontend:
            - Backend:
            - Infrastructure:
            - Security:
            - QA:

            ## 6. Known Limitations

            | 제한 | 영향 | 후속 slice | 승인 여부 |
            | --- | --- | --- | --- |
            | 결정 필요 | 결정 필요 | 결정 필요 | 결정 필요 |
        """,
        f"{delivery}_release_validation_plan.md": """
            # {{PRODUCT_NAME}} 릴리스 검증 계획

            ## 1. 목적

            릴리스 전 기능, 품질, 보안, 성능, 접근성, 운영 준비, 롤백 가능성을 검증한다.

            ## 2. 검증 범위

            | 영역 | 검증 방식 | 통과 기준 | 담당 |
            | --- | --- | --- | --- |
            | Requirements | traceability review | 모든 REL 항목이 요구사항과 연결 | Product/QA |
            | Frontend | component/e2e/a11y | 핵심 흐름 통과 | FE/QA |
            | Backend/API | unit/integration/contract | API 계약 통과 | BE/QA |
            | Data | migration/rollback | 무손실 롤백 경로 | BE/DBA |
            | Infra | deploy/rollback/DR | 운영 절차 검증 | Infra/SRE |
            | Security | threat/authz/secret/audit | high risk 미해결 0 | Security |
            | Observability | dashboard/alert/runbook | 주요 SLO 관측 가능 | SRE |

            ## 3. Release Gates

            - Gate 1: SRS/PRD/traceability review
            - Gate 2: Architecture/ADR review
            - Gate 3: Implementation test suite
            - Gate 4: Security and privacy review
            - Gate 5: Performance and accessibility review
            - Gate 6: Operational readiness and rollback rehearsal

            ## 4. Rollout / Rollback

            - rollout strategy:
            - feature flags:
            - migration order:
            - rollback trigger:
            - rollback owner:
            - user communication:

            ## 5. Release Signoff

            | Role | Signoff Criteria | Status |
            | --- | --- | --- |
            | Product | Scope accepted | pending |
            | Engineering | Tests and architecture accepted | pending |
            | Security | High-risk issues closed | pending |
            | Operations | Runbooks and alerts ready | pending |
            | QA | Release checklist passed | pending |
        """,
        f"{derived}_ai_agent_implementation_request.md": """
            # {{PRODUCT_NAME}} 구현 요청서 for AI Agent

            ## 1. 목적

            이 문서는 AI Agent에게 {{PRODUCT_NAME}} 구현을 요청하기 위한 상세 실행 지시서다. 이 문서는 설계 원본이 아니며, 상위 문서의 승인 범위를 구현 가능한 작업으로 포장한다.

            ## 2. 필수 입력 문서

            1. `../00_governance/document_definitions.md`
            2. `../00_governance/implementation_workflow.md`
            3. `../10_requirements/srs_final.md`
            4. `../10_requirements/prd.md`
            5. `{{SLUG}}_product_ia.md`
            6. `{{SLUG}}_wireframe_spec.md`
            7. `{{SLUG}}_screen_flow_spec.md`
            8. `{{SLUG}}_screen_state_matrix.md`
            9. `{{SLUG}}_ui_component_spec.md`
            10. `{{SLUG}}_design_system_tokens.md`
            11. `{{SLUG}}_screen_qa_checklist.md`
            12. `../30_technical_architecture/{{SLUG}}_system_architecture.md`
            13. `../30_technical_architecture/{{SLUG}}_frontend_architecture.md`
            14. `../30_technical_architecture/{{SLUG}}_backend_architecture.md`
            15. `../30_technical_architecture/{{SLUG}}_api_contracts.md`
            16. `../30_technical_architecture/{{SLUG}}_data_model.md`
            17. `../30_technical_architecture/{{SLUG}}_async_events_jobs.md`
            18. `../30_technical_architecture/{{SLUG}}_security_privacy_architecture.md`
            19. `../30_technical_architecture/{{SLUG}}_infrastructure_operations.md`
            20. `../30_technical_architecture/{{SLUG}}_observability_reliability.md`
            21. `../40_delivery/{{SLUG}}_implementation_roadmap.md`
            22. `../40_delivery/{{SLUG}}_release_validation_plan.md`

            ## 3. 구현 원칙

            - 빈 라우트, TODO-only 화면, 장식용 목업으로 끝내지 않는다.
            - 상태, 예외, 권한, 복구 흐름을 포함한다.
            - FE/BE/API/data/infra 변경은 기술 아키텍처 문서와 일치해야 한다.
            - 기존 저장소가 있다면 기존 기술 스택과 패턴을 우선한다.
            - 더미 데이터가 필요하면 실제 도메인 모델을 흉내 낸 realistic fixture를 사용하고 API 계약으로 교체 가능한 경계를 둔다.

            ## 4. 완료 기준

            - 요구사항, 화면, API, 데이터, 테스트가 traceable하다.
            - 권한/정책 비활성화 이유가 표시된다.
            - async 작업은 job/event/progress/error 상태를 가진다.
            - 관측성, 운영 리스크, known limitation이 문서화된다.
            - release validation plan의 해당 gate가 통과된다.
        """,
        f"{derived}_ai_agent_execution_brief.md": """
            # {{PRODUCT_NAME}} Execution Brief for AI Agent

            ## 1. 목적

            이 문서는 AI Agent가 바로 구현 작업에 착수하기 위한 압축 실행 브리프다.

            ## 2. 읽기 순서

            1. `../10_requirements/srs_final.md`
            2. `../10_requirements/requirements_screen_traceability_matrix.md`
            3. `../10_requirements/prd.md`
            4. `{{SLUG}}_product_ia.md`
            5. `{{SLUG}}_wireframe_spec.md`
            6. `{{SLUG}}_screen_flow_spec.md`
            7. `{{SLUG}}_screen_state_matrix.md`
            8. `{{SLUG}}_ui_component_spec.md`
            9. `{{SLUG}}_design_system_tokens.md`
            10. `{{SLUG}}_screen_qa_checklist.md`
            11. `../30_technical_architecture/{{SLUG}}_system_architecture.md`
            12. `../30_technical_architecture/{{SLUG}}_frontend_architecture.md`
            13. `../30_technical_architecture/{{SLUG}}_backend_architecture.md`
            14. `../30_technical_architecture/{{SLUG}}_api_contracts.md`
            15. `../30_technical_architecture/{{SLUG}}_data_model.md`
            16. `../30_technical_architecture/{{SLUG}}_infrastructure_operations.md`
            17. `../40_delivery/{{SLUG}}_implementation_roadmap.md`
            18. `../40_delivery/{{SLUG}}_release_validation_plan.md`

            ## 3. 절대 원칙

            - `srs_final.md`와 `prd.md`가 범위를 결정한다.
            - UI, architecture, delivery, agent brief는 범위를 새로 만들 수 없다.
            - 구현 편의로 문서 범위를 조용히 바꾸지 않는다.

            ## 4. 구현 순서

            1. 요구사항/traceability 확인
            2. 화면/상태/컴포넌트 확인
            3. API/data/job/event 계약 확인
            4. 앱 셸, 도메인 타입, adapter 경계 구현
            5. FE/BE/API/data vertical slice 구현
            6. 보안/권한/감사/관측성 연결
            7. release validation gate 수행

            ## 5. 제출 형식

            - 구현 범위 요약
            - 미구현 범위 요약
            - 기술 결정 사항과 ADR 영향
            - API/data/infra 연결 포인트
            - 검증 결과와 known limitation
        """,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Target repository root")
    parser.add_argument("--product-name", required=True, help="Human-readable product name")
    parser.add_argument("--slug", help="File prefix slug; defaults from product name")
    parser.add_argument("--agent-files", choices=["both", "codex", "claude", "none"], default="both")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    parser.add_argument("--dry-run", action="store_true", help="Print planned files without writing")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    slug = slugify(args.slug or args.product_name)
    today = dt.date.today().isoformat()
    context = {
        "PRODUCT_NAME": args.product_name,
        "SLUG": slug,
        "DATE": today,
    }

    templates = build_templates(slug)
    templates.update(build_full_product_templates(slug))
    if args.agent_files == "codex":
        templates.pop("CLAUDE.md", None)
    elif args.agent_files == "claude":
        templates.pop("AGENTS.md", None)
    elif args.agent_files == "none":
        templates.pop("AGENTS.md", None)
        templates.pop("CLAUDE.md", None)

    created: list[Path] = []
    skipped: list[Path] = []

    for rel, template in templates.items():
        path = root / rel
        if path.exists() and not args.force:
            skipped.append(path)
            continue
        if args.dry_run:
            created.append(path)
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render(template, context), encoding="utf-8")
        created.append(path)

    label = "Would create" if args.dry_run else "Created"
    for path in created:
        print(f"{label}: {path}")
    for path in skipped:
        print(f"Skipped existing: {path}")

    print()
    print(f"Product: {args.product_name}")
    print(f"Slug: {slug}")
    print(f"Root: {root}")
    if skipped and not args.force:
        print("Use --force to overwrite skipped files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
