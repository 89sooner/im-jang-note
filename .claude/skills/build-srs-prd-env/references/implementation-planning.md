# Implementation Planning Reference

Use this reference when the planning environment must support full product implementation, not only SRS/PRD and UI planning.

## Why This Layer Exists

Requirements and UI specs can tell agents what the product should do and how users experience it, but they are not enough to implement a full product safely. Implementation agents need explicit technical boundaries:

- System runtime boundaries and deployment shape.
- Frontend route, state, data-fetching, and component ownership.
- Backend module, domain, orchestration, and worker ownership.
- API, DTO, event, and idempotency contracts.
- Data model, migrations, retention, tenancy, and consistency rules.
- Async jobs, queues, retries, dead letters, and realtime event streams.
- Security, privacy, permissions, secrets, audit, and threat model.
- Infrastructure, environments, scaling, backup, DR, release, rollback.
- Observability, SLOs, alerts, runbooks, and operational readiness.

## Required Implementation Layers

### `docs/30_technical_architecture`

This layer is downstream of SRS/PRD and derived UI specs. It makes implementation choices but cannot add product scope.

- `*_system_architecture.md`: context, containers, runtime boundaries, dependencies, quality attributes, cross-cutting constraints.
- `*_frontend_architecture.md`: routes, rendering mode, component ownership, state boundaries, data fetching, error/loading model, accessibility/performance.
- `*_backend_architecture.md`: modules/services, domain ownership, orchestration, policy checks, worker boundaries, transaction and failure handling.
- `*_api_contracts.md`: REST/RPC/GraphQL contracts, DTOs, idempotency, pagination, errors, authz, versioning, realtime contracts.
- `*_data_model.md`: entities, ownership, lifecycle, indexes, retention, migration, tenancy, consistency, backup concerns.
- `*_async_events_jobs.md`: jobs, queues, event names, producers/consumers, retries, DLQ, ordering, dedupe, progress reporting.
- `*_security_privacy_architecture.md`: trust boundaries, authn/authz, secret handling, audit, privacy, threat model, abuse cases.
- `*_infrastructure_operations.md`: environments, deployment topology, compute, storage, networking, configuration, rollout, rollback, DR.
- `*_observability_reliability.md`: SLOs, SLIs, metrics, logs, traces, alerts, dashboards, runbooks, capacity and failure modes.
- `*_architecture_decision_records.md`: ADRs for implementation choices that change constraints or future cost.

### `docs/40_delivery`

This layer translates requirements and architecture into execution slices and release gates.

- `*_implementation_roadmap.md`: milestones, vertical slices, dependency map, ownership, sequencing, migration plan.
- `*_release_validation_plan.md`: test strategy, acceptance gates, security review, performance review, accessibility review, operational readiness, rollback checks.

## Architecture Gate

Technical architecture is acceptable when:

- Every major runtime boundary has a clear owner and responsibility.
- Each high-risk requirement maps to FE/BE/API/data/infra work.
- Write operations define authz, policy, idempotency, audit, rollback/recovery, and user-visible status.
- Long-running work defines job state, progress events, retry policy, and failure modes.
- Data model defines lifecycle, retention, migration, indexing, consistency, and tenancy rules.
- Security model includes trust boundaries and secrets, not only login.
- Infrastructure plan names environments, deploy units, backing services, configuration, scaling, backup, and DR.
- Observability plan includes SLOs and actionable alerts.

## Frontend Gate

Frontend planning is acceptable when:

- Routes or screens map to screen IDs and requirement IDs.
- Rendering mode and data-fetch strategy are explicit.
- Server state and client state are separated.
- Component ownership follows the UI component spec.
- Loading, empty, error, no-permission, stale, partial failure, and optimistic states are defined.
- Accessibility, keyboard behavior, responsive constraints, and performance budget are explicit.
- Mock/fixture usage has a replacement path to real API contracts.

## Backend/API Gate

Backend planning is acceptable when:

- Modules map to domain capabilities and requirement IDs.
- API contracts include input/output DTOs, errors, authz, idempotency, pagination/filtering, and versioning.
- Orchestration boundaries are explicit for synchronous vs asynchronous work.
- Policy, audit, and permission checks are defined per write action.
- External integration limits, retries, rate limits, and degraded modes are documented.
- Transaction boundaries and consistency rules are clear.

## Infrastructure/Ops Gate

Infrastructure planning is acceptable when:

- Environments are named and differ only intentionally.
- Runtime services, backing stores, queues, secret stores, and object stores are listed.
- Network boundaries, ingress/egress, private connectivity, and dependency access are clear.
- Deploy, migration, rollback, backup, restore, and cleanup flows are defined.
- SLOs, capacity assumptions, autoscaling, rate limits, and failure modes are explicit.
- Operational runbooks exist for the top failure paths.

## Delivery Gate

Delivery planning is acceptable when:

- Work is sliced vertically enough that each milestone can be validated end-to-end.
- Dependencies are explicit across product, design, frontend, backend, infra, security, and QA.
- Release gates include tests, manual QA, accessibility, security, performance, migration, observability, and rollback.
- Known limitations are documented and mapped to later slices or explicit non-goals.
