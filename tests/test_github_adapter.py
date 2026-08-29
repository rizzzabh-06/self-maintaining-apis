"""Milestone 7 — GitHub Adapter tests.

Verifies Draft PR generation, PR body templating with evidence and validation,
and strict gating preventing PR creation on failed validations.
"""

from pathlib import Path
import pytest
import yaml

from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact
from packages.migration_engine.planner import generate_migration_plan
from packages.validation.runner import validate_migration
from packages.validation.models import ValidationResult, ValidationStatus
from packages.github.client import GitHubAdapter
from packages.github.models import GitHubDraftPR
from packages.github.pr_template import render_pr_body

FIXTURES = Path(__file__).parent / "fixtures"
DEMO_REPO = FIXTURES / "demo-repository"


@pytest.fixture(scope="module")
def valid_pipeline_context():
    with open(FIXTURES / "api-v1" / "fakepay.yaml") as f:
        v1 = yaml.safe_load(f)
    with open(FIXTURES / "api-v2" / "fakepay.yaml") as f:
        v2 = yaml.safe_load(f)
    changes = diff_specs(v1, v2)
    scan = scan_repository(DEMO_REPO)
    impact = analyze_impact(changes, scan, provider="fakepay")
    plan = generate_migration_plan(DEMO_REPO, changes, impact)
    validation = validate_migration(DEMO_REPO, plan)
    return changes, impact, plan, validation


class TestGitHubDraftPRCreation:
    def test_creates_draft_pr_on_passed_validation(self, valid_pipeline_context):
        _, impact, plan, validation = valid_pipeline_context
        adapter = GitHubAdapter()

        pr = adapter.create_draft_pr(
            repo_name="demo-org/demo-checkout",
            plan=plan,
            validation=validation,
            impact=impact,
        )

        assert pr.is_draft is True
        assert pr.repo_name == "demo-org/demo-checkout"
        assert "fakepay" in pr.branch_name
        assert len(pr.changed_files) >= 4
        assert pr.pr_url is not None

    def test_pr_body_contains_all_required_sections(self, valid_pipeline_context):
        _, impact, plan, validation = valid_pipeline_context
        body = render_pr_body(plan, validation, impact)

        assert "## Provider" in body
        assert "Fakepay" in body
        assert "## Change" in body
        assert "POST /payment renamed to POST /payments" in body
        assert "## Impact" in body
        assert "## Validation" in body
        assert "✓ TypeScript compilation" in body
        assert "## Confidence & Risk" in body
        assert "Human review required" in body

    def test_safety_invariant_enforces_draft_flag(self):
        with pytest.raises(ValueError, match="Safety violation"):
            GitHubDraftPR(
                repo_name="org/repo",
                branch_name="branch",
                base_branch="main",
                title="title",
                body="body",
                changed_files=["file.ts"],
                is_draft=False,
            )


class TestGatingOnValidationFailure:
    def test_failed_validation_blocks_pr_creation(self, valid_pipeline_context):
        _, impact, plan, _ = valid_pipeline_context
        failed_validation = ValidationResult(
            overall_status=ValidationStatus.FAIL,
            build_passed=False,
            test_passed=False,
            error_summary="Type check failed with 3 errors",
        )
        adapter = GitHubAdapter()

        with pytest.raises(ValueError, match="Cannot create PR: Validation status is FAIL"):
            adapter.create_draft_pr(
                repo_name="demo-org/demo-checkout",
                plan=plan,
                validation=failed_validation,
                impact=impact,
            )
