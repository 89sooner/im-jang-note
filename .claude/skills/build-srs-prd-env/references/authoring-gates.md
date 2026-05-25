# Authoring Gates

Use these gates before calling an SRS/PRD planning environment complete.

## Intake Gate

Capture or infer only what the evidence supports:

- Product name and working slug.
- Target users and operating environment.
- Primary jobs-to-be-done.
- Reference products, source documents, screenshots, interviews, or business notes.
- Explicit in-scope, conditional, and out-of-scope areas.
- Constraints: security, compliance, data, platform, integration, performance, accessibility, localization.
- Open decisions and assumptions.

If key facts are missing, write assumptions and open decisions in the docs. Do not silently choose product scope.

## PRD Gate

The PRD is acceptable when it has:

- Product objective and non-goals.
- User/persona model.
- Success metrics and release priorities.
- Scope and priority split.
- Core workflows.
- Functional groups with rationale.
- NFR summary.
- Architecture/environment assumptions without over-specifying implementation internals.
- Open decisions and risks.

## SRS Gate

The SRS is acceptable when:

- Every approved requirement has a stable ID.
- Requirement statements are testable and avoid vague words such as "easy", "fast", or "good" unless quantified.
- UI descriptions and system behavior are separated.
- In Scope, Conditional Scope, and Out of Scope are explicit.
- Security, permission, audit, error, degraded mode, performance, and accessibility needs are present when relevant.
- Excluded or deferred features include rationale.

## Traceability Gate

Traceability is acceptable when:

- Source evidence maps to feature IDs.
- Feature IDs map to scenario IDs where scenarios exist.
- Scenario IDs map to requirement IDs.
- Requirement IDs map to screen IDs or non-UI operational surfaces.
- Every requirement in derived docs appears in the traceability matrix.
- Every screen ID in the matrix appears in IA or wireframe specs.

## Derived UI Gate

Derived specs are acceptable when:

- IA defines all screen IDs before other docs reference them.
- Wireframes include purpose, entry path, sections, components, states, events, and permissions.
- Flows include success, failure, deeplink, modal/drawer/fullscreen, and exception paths.
- State matrix includes loading, empty, error, no permission, offline/stale/partial data, and operation progress where relevant.
- Component spec prevents duplicate components and defines accessibility responsibilities.
- Tokens use semantic values instead of ad hoc visual decisions.
- QA checklist can be used as an acceptance gate.

## Technical Architecture Gate

Technical architecture is acceptable when:

- System architecture defines runtime boundaries, service ownership, dependency direction, deployment units, and quality attributes.
- Frontend architecture maps routes/screens to screen IDs and requirement IDs, and separates server state, client state, rendering mode, and component ownership.
- Backend architecture maps modules/services to requirement IDs and defines orchestration, transactions, external integrations, and failure handling.
- API contracts define operation IDs, DTOs, validation, errors, authz, idempotency, pagination/filtering, realtime/event contracts, and versioning.
- Data model defines entity ownership, relationships, tenancy, indexes, lifecycle, migrations, retention, backup, and consistency rules.
- Async/event planning defines queues, jobs, event producers/consumers, retry/DLQ, ordering, dedupe, and progress reporting.
- Security/privacy architecture defines trust boundaries, authn/authz, secrets, permissions, audit, data classification, threat model, and abuse cases.
- Infrastructure/operations defines environments, deployment topology, compute/storage/network, configuration, scaling, rollout, rollback, backup, restore, and DR.
- Observability/reliability defines SLOs, SLIs, metrics, logs, traces, alert rules, dashboards, runbooks, degraded modes, and incident response.
- ADRs record meaningful implementation decisions with alternatives and consequences.

## Delivery Gate

Delivery planning is acceptable when:

- Implementation roadmap slices work vertically across frontend, backend, API, data, infra, security, QA, and operations.
- Milestones name dependencies and entry/exit criteria.
- Release validation includes unit, integration, contract, e2e, accessibility, security, performance, migration, observability, and rollback checks.
- Known limitations are explicit and mapped to follow-up slices or accepted non-goals.

## Agent Brief Gate

Agent briefs are acceptable when:

- They list mandatory input docs in the correct reading order.
- They state that SRS/PRD override derived docs and agent briefs.
- They include required technical architecture and delivery docs when implementation spans code, infrastructure, or operations.
- They define implementation phases and target scope.
- They include forbidden shortcuts: empty routes, decorative mockups, TODO-only components, unhandled states, hidden permission failures.
- They require realistic fixtures or clear API contracts when backend is absent.
- They require validation results and known limitations in the final handoff.

## Manual Checks

Use targeted `rg` checks after edits:

```bash
rg "FR-[A-Z0-9]+-[0-9]+" docs/
rg "\\b[DWA]-[0-9]{3}" docs/
rg "\\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\\bREL-[0-9]{3}" docs/
rg "docs/.+\\.md" docs/
rg "TODO|TBD|미정|결정 필요" docs/
```

Run the bundled validator:

```bash
python3 <skill-dir>/scripts/validate_srs_prd_env.py --root .
```

Warnings are acceptable during early scaffold creation. Errors should be resolved before handing the environment to implementation agents.
