#!/usr/bin/env python3
"""Validate the shape and traceability of an SRS/PRD planning environment."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


REQ_RE = re.compile(r"\b(?:FR-[A-Z0-9]+-\d{3}|NFR-\d{3}|REQ-[A-Z0-9-]+|SCN-\d{3}|ADR-\d{3})\b")
SCREEN_RE = re.compile(r"\b(?:D|W|A)-\d{3}(?:-[A-Z0-9]+)?\b")
TECH_RE = re.compile(r"\b(?:(?:API|ENT|JOB|EVT)-[A-Z0-9]+-\d{3}|REL-\d{3})\b")


@dataclass
class Finding:
    level: str
    message: str


def read(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def ids(pattern: re.Pattern[str], text: str) -> set[str]:
    return set(pattern.findall(text))


def detect_slug(root: Path, explicit: str | None) -> str | None:
    if explicit:
        return explicit
    specs = sorted((root / "docs/20_derived_ui_specs").glob("*_product_ia.md"))
    if not specs:
        return None
    name = specs[0].name
    return name[: -len("_product_ia.md")]


def required_files(slug: str | None) -> list[str]:
    base = [
        "docs/README.md",
        "docs/AGENTS.md",
        "docs/00_governance/AGENTS.md",
        "docs/00_governance/document_definitions.md",
        "docs/00_governance/implementation_workflow.md",
        "docs/10_requirements/AGENTS.md",
        "docs/10_requirements/feature.md",
        "docs/10_requirements/prd.md",
        "docs/10_requirements/workflow.md",
        "docs/10_requirements/srs_final.md",
        "docs/10_requirements/requirements_screen_traceability_matrix.md",
        "docs/20_derived_ui_specs/AGENTS.md",
        "docs/30_technical_architecture/AGENTS.md",
        "docs/40_delivery/AGENTS.md",
    ]
    if slug:
        base.extend(
            [
                f"docs/20_derived_ui_specs/{slug}_product_ia.md",
                f"docs/20_derived_ui_specs/{slug}_wireframe_spec.md",
                f"docs/20_derived_ui_specs/{slug}_screen_flow_spec.md",
                f"docs/20_derived_ui_specs/{slug}_screen_state_matrix.md",
                f"docs/20_derived_ui_specs/{slug}_ui_component_spec.md",
                f"docs/20_derived_ui_specs/{slug}_design_system_tokens.md",
                f"docs/20_derived_ui_specs/{slug}_screen_qa_checklist.md",
                f"docs/20_derived_ui_specs/{slug}_ai_agent_implementation_request.md",
                f"docs/20_derived_ui_specs/{slug}_ai_agent_execution_brief.md",
                f"docs/30_technical_architecture/{slug}_system_architecture.md",
                f"docs/30_technical_architecture/{slug}_frontend_architecture.md",
                f"docs/30_technical_architecture/{slug}_backend_architecture.md",
                f"docs/30_technical_architecture/{slug}_api_contracts.md",
                f"docs/30_technical_architecture/{slug}_data_model.md",
                f"docs/30_technical_architecture/{slug}_async_events_jobs.md",
                f"docs/30_technical_architecture/{slug}_security_privacy_architecture.md",
                f"docs/30_technical_architecture/{slug}_infrastructure_operations.md",
                f"docs/30_technical_architecture/{slug}_observability_reliability.md",
                f"docs/30_technical_architecture/{slug}_architecture_decision_records.md",
                f"docs/40_delivery/{slug}_implementation_roadmap.md",
                f"docs/40_delivery/{slug}_release_validation_plan.md",
            ]
        )
    return base


def validate(root: Path, slug: str | None) -> list[Finding]:
    findings: list[Finding] = []

    for rel in required_files(slug):
        if not (root / rel).exists():
            findings.append(Finding("ERROR", f"Missing required file: {rel}"))

    srs = read(root / "docs/10_requirements/srs_final.md")
    prd = read(root / "docs/10_requirements/prd.md")
    matrix = read(root / "docs/10_requirements/requirements_screen_traceability_matrix.md")
    derived_text = ""
    if (root / "docs/20_derived_ui_specs").exists():
        for path in sorted((root / "docs/20_derived_ui_specs").glob("*.md")):
            derived_text += "\n" + read(path)
    technical_text = ""
    for dirname in ["30_technical_architecture", "40_delivery"]:
        if (root / "docs" / dirname).exists():
            for path in sorted((root / "docs" / dirname).glob("*.md")):
                technical_text += "\n" + read(path)

    upstream_req_ids = ids(REQ_RE, srs + "\n" + prd)
    matrix_req_ids = {item for item in ids(REQ_RE, matrix) if item.startswith(("FR-", "NFR-", "REQ-"))}
    derived_req_ids = {item for item in ids(REQ_RE, derived_text) if item.startswith(("FR-", "NFR-", "REQ-"))}
    technical_req_ids = {item for item in ids(REQ_RE, technical_text) if item.startswith(("FR-", "NFR-", "REQ-"))}
    technical_ids = ids(TECH_RE, technical_text)

    ia_wireframe = ""
    if slug:
        ia_wireframe = read(root / f"docs/20_derived_ui_specs/{slug}_product_ia.md")
        ia_wireframe += "\n" + read(root / f"docs/20_derived_ui_specs/{slug}_wireframe_spec.md")
    else:
        for path in sorted((root / "docs/20_derived_ui_specs").glob("*_product_ia.md")):
            ia_wireframe += "\n" + read(path)
        for path in sorted((root / "docs/20_derived_ui_specs").glob("*_wireframe_spec.md")):
            ia_wireframe += "\n" + read(path)

    declared_screens = ids(SCREEN_RE, ia_wireframe)
    matrix_screens = ids(SCREEN_RE, matrix)
    derived_screens = ids(SCREEN_RE, derived_text)

    if not upstream_req_ids:
        findings.append(Finding("WARN", "No requirement/scenario/decision IDs found in SRS or PRD. Fill the requirements layer."))
    if not declared_screens:
        findings.append(Finding("WARN", "No screen IDs found in IA or wireframe specs. Fill the derived UI layer."))
    if not matrix_req_ids:
        findings.append(Finding("WARN", "No requirement IDs found in traceability matrix."))
    if not matrix_screens:
        findings.append(Finding("WARN", "No screen IDs found in traceability matrix."))
    if not technical_ids:
        findings.append(Finding("WARN", "No API/entity/job/event/release IDs found in technical architecture or delivery docs. Fill implementation planning docs."))

    for req_id in sorted(matrix_req_ids - upstream_req_ids):
        findings.append(Finding("ERROR", f"Traceability matrix references unknown requirement ID: {req_id}"))

    for req_id in sorted(derived_req_ids - matrix_req_ids - upstream_req_ids):
        findings.append(Finding("ERROR", f"Derived docs reference unknown requirement ID: {req_id}"))

    for req_id in sorted(derived_req_ids & upstream_req_ids - matrix_req_ids):
        findings.append(Finding("WARN", f"Derived docs reference requirement not mapped in traceability matrix: {req_id}"))

    for req_id in sorted(technical_req_ids - upstream_req_ids):
        findings.append(Finding("ERROR", f"Technical/delivery docs reference unknown requirement ID: {req_id}"))

    for req_id in sorted((technical_req_ids & upstream_req_ids - matrix_req_ids) - {item for item in technical_req_ids if item.startswith("NFR-")}):
        findings.append(Finding("WARN", f"Technical/delivery docs reference requirement not mapped in traceability matrix: {req_id}"))

    for screen_id in sorted(matrix_screens - declared_screens):
        findings.append(Finding("ERROR", f"Traceability matrix references unknown screen ID: {screen_id}"))

    for screen_id in sorted(derived_screens - declared_screens):
        # Derived docs include IA/wireframe text too, so this catches flow/state/QA IDs missing from IA/wireframe.
        findings.append(Finding("WARN", f"Derived docs mention screen ID not declared in IA/wireframe: {screen_id}"))

    docs_readme = read(root / "docs/README.md")
    for rel in ["srs_final.md", "prd.md", "requirements_screen_traceability_matrix.md", "30_technical_architecture", "40_delivery"]:
        if rel not in docs_readme:
            findings.append(Finding("WARN", f"docs/README.md does not mention {rel}"))

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Planning repository root")
    parser.add_argument("--slug", help="Derived UI spec slug; auto-detected by default")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    slug = detect_slug(root, args.slug)

    findings = validate(root, slug)
    errors = [f for f in findings if f.level == "ERROR"]

    print(f"Root: {root}")
    print(f"Slug: {slug or '(not detected)'}")
    if not findings:
        print("OK: no structural or traceability issues found.")
        return 0

    for finding in findings:
        print(f"{finding.level}: {finding.message}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
