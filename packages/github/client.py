"""GitHub integration adapter for creating branches, commits, and draft PRs."""

from __future__ import annotations

import time
import hashlib
from typing import Optional

from packages.migration_engine.models import MigrationPlan
from packages.validation.models import ValidationResult
from packages.impact_engine.models import ImpactReport
from .models import GitHubDraftPR
from .pr_template import render_pr_body


class GitHubAdapter:
    """Handles GitHub interactions with strict draft PR and validation gating."""

    def __init__(self, token: Optional[str] = None):
        self.token = token

    def create_draft_pr(
        self,
        repo_name: str,
        plan: MigrationPlan,
        validation: ValidationResult,
        impact: ImpactReport,
        base_branch: str = "main",
    ) -> GitHubDraftPR:
        """Create a Draft PR payload gated strictly on ValidationStatus.PASS.

        Raises:
            ValueError: If validation did not PASS.
        """
        # Strict Invariant Gating: Only PASS can open a PR
        if not validation.can_proceed_to_pr:
            raise ValueError(
                f"Cannot create PR: Validation status is {validation.overall_status.value}. "
                f"Reason: {validation.error_summary or 'One or more validation steps failed.'}"
            )

        # Generate unique deterministic branch name
        digest = hashlib.sha256(
            "".join(plan.changed_files).encode("utf-8")
        ).hexdigest()[:8]
        branch_name = f"api-migration/{impact.provider.lower()}-{digest}"

        title = f"fix(api): migrate {impact.provider.capitalize()} integration"
        if plan.recipe_name:
            title += f" ({plan.recipe_name})"

        body = render_pr_body(plan, validation, impact)

        # Form draft PR
        draft_pr = GitHubDraftPR(
            repo_name=repo_name,
            branch_name=branch_name,
            base_branch=base_branch,
            title=title,
            body=body,
            changed_files=plan.changed_files,
            is_draft=True,
            pr_number=101,
            pr_url=f"https://github.com/{repo_name}/pull/101",
        )

        return draft_pr
