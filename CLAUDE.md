# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Repository Type

This repository is a documentation-first SRS/PRD product planning environment for 임장노트. It is intended to support full product implementation planning across product, UX, frontend, backend, API, data, infrastructure, security, operations, QA, and release validation.

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
6. `docs/20_derived_ui_specs/imjang_note_product_ia.md`
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
rg "\b[DWA]-[0-9]{3}" docs/
rg "\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\bREL-[0-9]{3}" docs/
rg "TODO|TBD|미정|결정 필요" docs/
```

## Application Code Guidelines

Apply this section only if application source code exists or is added later. Application code must implement the approved scope from `srs_final.md` and `prd.md`; it must not implement candidate-only ideas from `feature.md`.
