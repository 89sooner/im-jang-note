---
name: build-srs-prd-env
description: Create, audit, and update agent-ready SRS/PRD product planning environments with governed Markdown document hierarchies, source-of-truth rules, requirement IDs, traceability matrices, derived UI specs, full technical architecture plans, frontend/backend/API/data/infra/security/observability docs, delivery plans, QA gates, and AI-agent implementation briefs. Use when Codex needs to turn a product idea, reference product analysis, existing requirements, or scattered planning notes into a complete implementation-grade SRS/PRD planning repository for agents such as Codex or Claude Code, or when maintaining an existing SRS/PRD docs environment without drifting from approved scope.
---

# Build SRS PRD Env

## Overview

Use this skill to create or maintain a documentation-first product planning environment where the SRS and PRD are the approved product truth, derived UI specs cannot expand scope, technical architecture is downstream of requirements, and implementation agents get clear execution briefs after requirements and architecture are stable.

The source pattern is a GitKraken-style documentation repository with root agent instructions, nested `AGENTS.md` files, governance docs, requirements docs, derived UI specs, traceability, QA, and final AI-agent implementation briefs.

## Mode Selection

- **Scaffold**: Create the full document hierarchy for a new product or reference-product analysis.
- **Fill**: Populate existing scaffolded docs from a brief, interview notes, source docs, screenshots, or competitive/reference-product analysis.
- **Update**: Apply a requirement or screen change through the cascade without introducing drift.
- **Audit**: Validate an existing SRS/PRD planning repo for missing files, stale references, orphan IDs, and scope leakage.

## Quick Start

For a new planning environment, run the scaffold script from this skill:

```bash
python3 <skill-dir>/scripts/scaffold_srs_prd_env.py --root . --product-name "My Product" --slug my_product --agent-files both
```

Then fill the generated Markdown documents in this order:

1. `docs/00_governance/document_definitions.md`
2. `docs/00_governance/implementation_workflow.md`
3. `docs/10_requirements/feature.md`
4. `docs/10_requirements/prd.md`
5. `docs/10_requirements/workflow.md`
6. `docs/10_requirements/srs_final.md`
7. `docs/10_requirements/requirements_screen_traceability_matrix.md`
8. `docs/20_derived_ui_specs/*_product_ia.md`
9. Remaining `docs/20_derived_ui_specs/*` specs
10. `docs/30_technical_architecture/*_system_architecture.md`
11. Frontend, backend, API, data, async jobs, security, infrastructure, observability, and ADR docs
12. `docs/40_delivery/*_implementation_roadmap.md`
13. `docs/40_delivery/*_release_validation_plan.md`
14. `*_ai_agent_implementation_request.md`
15. `*_ai_agent_execution_brief.md`

For validation, run:

```bash
python3 <skill-dir>/scripts/validate_srs_prd_env.py --root .
```

## Core Rules

- Treat `srs_final.md` as the highest-priority product truth.
- Treat `prd.md` as the detailed product companion to the SRS.
- Treat `feature.md` as a candidate pool; do not implement or derive from a candidate unless it is approved in `srs_final.md` or `prd.md`.
- Treat `20_derived_ui_specs/` as downstream translation only. It must not add product scope.
- Treat `30_technical_architecture/` as downstream implementation architecture. It may choose implementation shape only inside SRS/PRD constraints.
- Treat `40_delivery/` as release slicing and validation packaging. It must not add scope or bypass QA/security/operations gates.
- Update AI-agent briefs last; they package stable requirements, UI, architecture, and delivery decisions and never create decisions.
- Preserve stable IDs. Deprecate IDs by marking status instead of renumbering.
- Every derived requirement reference must resolve upstream and appear in the traceability matrix.
- Every screen ID in the traceability matrix must exist in the IA or wireframe spec.
- If user input is incomplete, write assumptions and open decisions explicitly rather than inventing requirements.

## Authoring Workflow

1. Capture product context: target users, business goals, reference products, operating environment, constraints, and explicit exclusions.
2. Build the feature candidate pool: group features by user goal, source evidence, entry point, system response, exception state, implementation dependency, and release candidate.
3. Draft the PRD: product goals, personas, success metrics, scope, priorities, architecture assumptions, open decisions, and release strategy.
4. Lock the SRS: convert approved scope into verifiable "system shall" requirements with requirement IDs, nonfunctional requirements, assumptions, constraints, and out-of-scope items.
5. Build traceability: map source evidence -> feature IDs -> scenario IDs -> requirement IDs -> screen IDs.
6. Derive UI specs: translate approved requirements into IA, wireframes, flows, states, components, design tokens, and QA checklists.
7. Derive technical architecture: define system boundaries, FE/BE responsibilities, API contracts, data model, async jobs/events, security/privacy, infrastructure, observability/reliability, and ADRs.
8. Plan delivery: map requirements and architecture into implementation slices, release gates, validation strategy, rollout, rollback, and operational readiness.
9. Package agent execution: produce implementation request and execution brief after all upstream docs are stable.
10. Validate with the script and targeted `rg` checks before claiming completion.

## Update Cascade

When upstream product scope changes, update downstream documents in this order:

1. `docs/10_requirements/srs_final.md`
2. `docs/10_requirements/prd.md`
3. `docs/10_requirements/requirements_screen_traceability_matrix.md`
4. `docs/20_derived_ui_specs/*_product_ia.md`
5. `docs/20_derived_ui_specs/*_wireframe_spec.md`
6. `docs/20_derived_ui_specs/*_screen_flow_spec.md`
7. `docs/20_derived_ui_specs/*_screen_state_matrix.md`
8. `docs/20_derived_ui_specs/*_ui_component_spec.md`
9. `docs/20_derived_ui_specs/*_design_system_tokens.md`
10. `docs/20_derived_ui_specs/*_screen_qa_checklist.md`
11. `docs/30_technical_architecture/*_system_architecture.md`
12. `docs/30_technical_architecture/*_frontend_architecture.md`
13. `docs/30_technical_architecture/*_backend_architecture.md`
14. `docs/30_technical_architecture/*_api_contracts.md`
15. `docs/30_technical_architecture/*_data_model.md`
16. `docs/30_technical_architecture/*_async_events_jobs.md`
17. `docs/30_technical_architecture/*_security_privacy_architecture.md`
18. `docs/30_technical_architecture/*_infrastructure_operations.md`
19. `docs/30_technical_architecture/*_observability_reliability.md`
20. `docs/30_technical_architecture/*_architecture_decision_records.md`
21. `docs/40_delivery/*_implementation_roadmap.md`
22. `docs/40_delivery/*_release_validation_plan.md`
23. `docs/20_derived_ui_specs/*_ai_agent_implementation_request.md`
24. `docs/20_derived_ui_specs/*_ai_agent_execution_brief.md`

For a screen-only change, verify that the screen is already justified by a requirement ID, then update IA -> wireframe -> flow/state/component/tokens/QA -> agent briefs.

For an implementation-only change, verify the requirement ID and screen/API/data impact first, then update the affected technical architecture doc, delivery plan, validation plan, and agent briefs.

## References

- Read `references/source-pattern-analysis.md` when you need the rationale extracted from the GitKraken-style source repository.
- Read `references/document-contracts.md` before adding, renaming, or restructuring documents.
- Read `references/authoring-gates.md` before finalizing SRS/PRD content, traceability, derived UI specs, or agent briefs.
- Read `references/implementation-planning.md` before filling architecture, frontend, backend, API, data, infrastructure, observability, or release planning docs.

## Completion Standard

Return the created or changed file list, validation result, unresolved decisions, and the next document that should be filled or reviewed. Do not present a planning environment as complete while `srs_final.md`, traceability, IA, state handling, API/data contracts, FE/BE architecture, infrastructure/operations, observability, QA, delivery validation, or agent briefs are missing.
