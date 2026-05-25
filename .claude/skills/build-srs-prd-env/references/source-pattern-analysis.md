# Source Pattern Analysis

This skill is derived from a documentation-only GitKraken-style product planning repository. The useful pattern is not GitKraken-specific; it is the operating model:

- A repository can be useful before code exists if it has strict document hierarchy, traceability, and agent instructions.
- Root instructions (`CLAUDE.md`, `AGENTS.md`) tell coding agents how to interpret the repository.
- Nested `AGENTS.md` files make local rules discoverable before edits.
- `docs/00_governance` defines document roles, priority, update order, and implementation workflow.
- `docs/10_requirements` owns product truth: feature candidates, PRD, SRS, workflow, and traceability.
- `docs/20_derived_ui_specs` translates approved requirements into UI, state, QA, and agent execution docs.
- A full implementation-grade environment also needs downstream technical architecture and delivery layers; the source repository carries some of this inside `prd.md`, but that is too dense for reusable agent execution.

## Critical Behaviors

The source repository behaves like a requirements operating system:

1. `srs_final.md` is the final scope baseline and wins conflicts.
2. `prd.md` is the detailed product companion and is subordinate to the SRS.
3. `feature.md` is an idea pool, not approved scope.
4. `requirements_screen_traceability_matrix.md` bridges requirements to screens.
5. Derived UI specs cannot add scope. They translate and refine approved scope.
6. AI-agent implementation briefs are execution packaging and are updated last.
7. There is no build/test suite in a docs-only repo. Verification is manual, ID-based, and link-based.
8. If code is added later, code remains subordinate to approved docs until the docs are intentionally revised.
9. Architecture decisions must be derived from requirements and quality attributes, not from implementation convenience.
10. Delivery plans must validate the whole product path: UI, API, data, workers, infrastructure, security, operations, and rollback.

## Runtime/Execution Environment Pattern

The source repo explicitly separates documentation work from application work:

- Current state: documentation-only, no package manifest, no guaranteed `pnpm`, test, lint, or build command.
- Documentation validation: use `rg`/grep for requirement IDs, screen IDs, and path references.
- Future application guidelines: only apply when source code exists.
- Expected future stack can be documented, but implementation convenience must not override the SRS/PRD hierarchy.
- Implementation planning should explicitly separate frontend, backend, API contracts, data, async jobs/events, infrastructure, security, observability, and release validation.

## Extracted Design Principles

- Put governance before content.
- Keep source-of-truth priority visible in several places: root instructions, docs index, governance docs, and nested agent files.
- Keep update cascade explicit so changes do not silently drift.
- Require stable IDs for requirements, scenarios, screens, components, flows, states, and QA items.
- Treat generated implementation briefs as downstream artifacts.
- Include "out of scope" and "conditional scope"; these prevent agents from overbuilding.
- Prefer structured Korean documents when the product planning context is Korean; preserve the user's planning language.

## Generalization

When adapting this pattern to another product:

- Rename product-specific file prefixes with a stable slug such as `my_product_product_ia.md`.
- Keep the three-layer `00_governance`, `10_requirements`, `20_derived_ui_specs` structure.
- Replace GitKraken-specific feature categories with the user's domain categories.
- Keep the same conflict priority and cascade rules unless the user explicitly defines a different governance model.
- Add code-specific instructions only after the product planning docs define an approved implementation target.
- For full product implementation, use `30_technical_architecture` and `40_delivery` so implementation agents do not infer backend, data, infra, or operations from UI docs alone.
