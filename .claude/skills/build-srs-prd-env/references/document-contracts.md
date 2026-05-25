# Document Contracts

Use these contracts when scaffolding, filling, or updating an SRS/PRD planning environment.

## Required Tree

```text
.
  AGENTS.md
  CLAUDE.md
  docs/
    README.md
    AGENTS.md
    00_governance/
      AGENTS.md
      document_definitions.md
      implementation_workflow.md
    10_requirements/
      AGENTS.md
      feature.md
      prd.md
      workflow.md
      srs_final.md
      requirements_screen_traceability_matrix.md
    20_derived_ui_specs/
      AGENTS.md
      <slug>_product_ia.md
      <slug>_wireframe_spec.md
      <slug>_screen_flow_spec.md
      <slug>_screen_state_matrix.md
      <slug>_ui_component_spec.md
      <slug>_design_system_tokens.md
      <slug>_screen_qa_checklist.md
      <slug>_ai_agent_implementation_request.md
      <slug>_ai_agent_execution_brief.md
    30_technical_architecture/
      AGENTS.md
      <slug>_system_architecture.md
      <slug>_frontend_architecture.md
      <slug>_backend_architecture.md
      <slug>_api_contracts.md
      <slug>_data_model.md
      <slug>_async_events_jobs.md
      <slug>_security_privacy_architecture.md
      <slug>_infrastructure_operations.md
      <slug>_observability_reliability.md
      <slug>_architecture_decision_records.md
    40_delivery/
      AGENTS.md
      <slug>_implementation_roadmap.md
      <slug>_release_validation_plan.md
```

## Root Agent Files

`AGENTS.md`:

- State repository purpose.
- Name key files and subdirectories.
- Define AI-agent working rules.
- Say how to validate docs when no code exists.
- Identify external dependencies, if any.

`CLAUDE.md`:

- Provide equivalent guidance for Claude Code.
- State that the repo is documentation-only until code is added.
- Repeat hierarchy, priority, cascade, ID rules, language/style rules, verification commands, and future code guidelines.

## Governance Layer

`docs/README.md`:

- Master index.
- Full tree.
- Document roles.
- Reading order for understanding, implementation, and scope changes.
- Conflict priority.
- Update cascade.
- Recommended usage by task.

`docs/00_governance/document_definitions.md`:

- Define each document's role, authority, allowed content, and update policy.
- Explain relations between candidate features, PRD, SRS, traceability, derived specs, technical architecture, delivery docs, QA, and agent briefs.
- List conflict-resolution priority.

`docs/00_governance/implementation_workflow.md`:

- Define phase gates from baseline locking to QA.
- Include work products per phase.
- Include reverse update rules when requirements or screens change.

## Requirements Layer

`docs/10_requirements/feature.md`:

- Candidate feature inventory.
- Source evidence, user goal, entry point, system response, exception, data impact, authority, feasibility, release candidate.
- Must mark candidate status. Do not imply approval unless reflected in SRS/PRD.

`docs/10_requirements/prd.md`:

- Product goal, target users, success metrics, scope, priorities, operating model, high-level architecture assumptions, open decisions, release plan.
- Use product language and tradeoffs.
- Keep detailed UI layout out of this file unless it is necessary product scope.

`docs/10_requirements/workflow.md`:

- How requirements are discovered, normalized, classified, reviewed, and approved.
- Include source -> feature -> scenario -> requirement -> screen traceability.

`docs/10_requirements/srs_final.md`:

- Final implementation baseline.
- Use verifiable requirement statements.
- Include In Scope, Conditional Scope, Out of Scope, assumptions, constraints, users/roles, scenarios, functional requirements, interfaces, data requirements, NFRs, priority, open decisions.

`docs/10_requirements/requirements_screen_traceability_matrix.md`:

- Map requirement IDs to screen IDs.
- Include indirect UI exposure for non-UI requirements through admin, settings, audit, or status surfaces.
- Include requirement coverage notes and implementation status when useful.

## Derived UI Layer

`<slug>_product_ia.md`:

- Product surfaces, screen families, navigation, global shell, screen ID system, priority.
- It is the highest-priority derived UI document.

`<slug>_wireframe_spec.md`:

- For each screen: purpose, entry path, layout, sections, components, states, events, permissions/policies, implementation notes.

`<slug>_screen_flow_spec.md`:

- Flow IDs, transitions, modal/drawer/fullscreen rules, deeplinks, success/failure paths, exception flows.

`<slug>_screen_state_matrix.md`:

- Shared state taxonomy: loading, empty, stale, no permission, auth expired, offline, partial failure, recoverable error, unrecoverable error, operation pending.
- Per-screen state matrix and recovery path.

`<slug>_ui_component_spec.md`:

- Component IDs, responsibility, required props/data, variants, events, accessibility, usage rules.

`<slug>_design_system_tokens.md`:

- Semantic colors, typography, spacing, density, radius, elevation, focus, selected, disabled, motion, content density.

`<slug>_screen_qa_checklist.md`:

- Common QA, per-screen QA, regression, keyboard/accessibility, abnormal flows, release gate, QA record template.

`<slug>_ai_agent_implementation_request.md`:

- Long-form implementation request.
- Include mandatory input docs, implementation principles, scope phases, expected code/docs outputs, forbidden shortcuts, quality gates.

`<slug>_ai_agent_execution_brief.md`:

- Short execution brief for a coding agent.
- Include read order, target scope, implementation order, completion criteria, validation checks.

## Technical Architecture Layer

`docs/30_technical_architecture/AGENTS.md`:

- State that implementation architecture is downstream of SRS/PRD and UI specs.
- Require explicit requirement IDs, ADR links, and quality-attribute rationale for significant decisions.
- Forbid adding product scope from architecture docs.

`<slug>_system_architecture.md`:

- Product context, container/runtime view, major services, dependency map, cross-cutting concerns, quality attributes, tradeoffs.
- Include boundaries for web app, API/BFF, workers, integrations, data stores, queues, events, secret stores, and admin/ops surfaces.

`<slug>_frontend_architecture.md`:

- Framework assumptions, route tree, rendering mode, state boundaries, data fetching, component ownership, form/error/loading model, accessibility, performance, test strategy.
- Map routes/screens to screen IDs and requirement IDs.

`<slug>_backend_architecture.md`:

- Service/module map, domain ownership, orchestration, sync vs async boundaries, policy/audit checks, external integrations, failure handling.
- Map modules to requirement IDs and API/data contracts.

`<slug>_api_contracts.md`:

- Endpoint or operation catalog, DTOs, error model, authz model, idempotency, pagination/filtering, versioning, realtime/event contracts.

`<slug>_data_model.md`:

- Entities, ownership, relationships, indexes, migration policy, retention, tenancy, consistency rules, backup/restore impact.

`<slug>_async_events_jobs.md`:

- Jobs, queues, event names, producers/consumers, retry policy, dead-letter behavior, ordering/deduplication, progress reporting.

`<slug>_security_privacy_architecture.md`:

- Trust boundaries, authn/authz, secret handling, permission model, audit model, privacy/data classification, threat model, abuse cases.

`<slug>_infrastructure_operations.md`:

- Environments, deployment topology, compute, storage, networking, secrets/configuration, scaling, migrations, backup, restore, rollout, rollback, DR.

`<slug>_observability_reliability.md`:

- SLIs/SLOs, logs, metrics, traces, alert rules, dashboards, runbooks, capacity, degraded modes, incident response expectations.

`<slug>_architecture_decision_records.md`:

- ADR table and decision details. Include context, decision, options, consequences, status, affected docs, and date.

## Delivery Layer

`docs/40_delivery/AGENTS.md`:

- State that delivery docs convert approved requirements and architecture into implementation slices and validation gates.
- Require cross-functional dependencies and release risks to be explicit.

`<slug>_implementation_roadmap.md`:

- Milestones, vertical slices, dependencies, ownership, sequencing, migration plan, API/data/infra prerequisites, known limitations.

`<slug>_release_validation_plan.md`:

- Unit/integration/e2e/contract/performance/accessibility/security/operational validation, release gates, rollout, rollback, monitoring, signoff criteria.

## ID Conventions

Recommended defaults:

- Feature IDs: `F-<AREA>-###`
- Scenario IDs: `SCN-###`
- Functional requirements: `FR-<AREA>-###`
- Nonfunctional requirements: `NFR-###`
- Screen IDs: `D-###` for primary app screens, `W-###` for web/cloud surfaces, `A-###` for admin surfaces.
- Component IDs: `C-###`
- Flow IDs: `F-###`
- Decision IDs: `ADR-###`
- API operation IDs: `API-<AREA>-###`
- Data entity IDs: `ENT-<AREA>-###`
- Job IDs: `JOB-<AREA>-###`
- Event IDs: `EVT-<AREA>-###`
- Release slice IDs: `REL-###`

Keep IDs stable. If an item is removed, mark it deprecated or out of scope and preserve the rationale.
