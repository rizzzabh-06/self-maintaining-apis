"""Background job worker orchestrating the end-to-end self-maintaining API migration pipeline."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import yaml

from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact
from packages.migration_engine.planner import generate_migration_plan
from packages.validation.runner import validate_migration
from packages.github.client import GitHubAdapter
from packages.github.models import GitHubDraftPR


def run_pipeline(
    old_spec_data: dict,
    new_spec_data: dict,
    repo_path: str | Path,
    repo_name: str = "demo-org/demo-checkout",
    provider: str = "fakepay",
) -> dict[str, Any]:
    """Execute the full end-to-end pipeline:
    1. Change Engine: diff specs
    2. Repository Scanner: build inventory
    3. Impact Engine: correlate changes & assess risk
    4. Migration Engine: generate deterministic patches
    5. Validation Engine: isolated sandbox test & contract check
    6. GitHub Adapter: create Draft PR (strictly gated on PASS)
    """
    root = Path(repo_path).resolve()

    # 1. Detect changes
    changes = diff_specs(old_spec_data, new_spec_data)

    # 2. Scan repository
    scan_result = scan_repository(root)

    # 3. Analyze impact
    impact_report = analyze_impact(changes, scan_result, provider=provider)

    # 4. Generate migration plan
    migration_plan = generate_migration_plan(root, changes, impact_report)

    # 5. Validate in isolated sandbox
    validation_result = validate_migration(root, migration_plan)

    # 6. GitHub draft PR (only if PASS)
    draft_pr: GitHubDraftPR | None = None
    if validation_result.can_proceed_to_pr:
        adapter = GitHubAdapter()
        draft_pr = adapter.create_draft_pr(
            repo_name=repo_name,
            plan=migration_plan,
            validation=validation_result,
            impact=impact_report,
        )

    return {
        "provider": provider,
        "repo_name": repo_name,
        "changes_detected": len(changes),
        "affected_files": impact_report.affected_files,
        "risk_level": impact_report.risk_level.value,
        "confidence": impact_report.overall_confidence,
        "validation_status": validation_result.overall_status.value,
        "pr_created": draft_pr is not None,
        "draft_pr": draft_pr.to_dict() if draft_pr else None,
    }
