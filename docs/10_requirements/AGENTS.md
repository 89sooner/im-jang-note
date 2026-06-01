<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-29 -->

# 10_requirements

## Purpose

Authoritative requirements layer. `srs_final.md` is the single source of truth for approved scope; all other files either feed it, explain it, or map it to downstream documents.

## For AI Agents

- Treat `srs_final.md` as frozen unless the user explicitly authorizes scope change.
- `feature.md` is an idea pool, not approved scope.
- When the SRS changes, update the traceability matrix in the same pass.
- Never introduce a requirement ID that is absent from traceability.
