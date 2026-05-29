<!-- Generated: 2026-05-29 -->

# 임장노트

## Purpose

Documentation-first product planning repository for 임장노트. This repo holds governance rules, PRD/SRS requirements, traceability, derived UI specifications, technical architecture, delivery validation, QA gates, and AI-agent execution briefs.

## Key Files

| File | Description |
| --- | --- |
| `docs/README.md` | Master index, reading order, priority rules, and update cascade |
| `docs/10_requirements/srs_final.md` | Final implementation baseline and highest-priority product truth |
| `docs/30_technical_architecture/imjang_note_system_architecture.md` | System/runtime architecture derived from approved requirements |
| `docs/40_delivery/imjang_note_release_validation_plan.md` | Release gates and validation plan |

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
rg "\b[DWA]-[0-9]{3}" docs/
rg "\b(API|ENT|JOB|EVT)-[A-Z0-9]+-[0-9]{3}|\bREL-[0-9]{3}" docs/
rg "docs/.+\.md" docs/
```
