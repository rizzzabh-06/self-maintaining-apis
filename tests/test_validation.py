"""Milestone 6 — Sandbox Worker + Validation Engine tests.

Verifies isolated sandbox execution, patch application, build/contract/test verification,
and strict PASS/FAIL gating for PR generation.
"""

from pathlib import Path
import pytest
import yaml

from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact
from packages.migration_engine.planner import generate_migration_plan
from packages.migration_engine.models import MigrationPlan, FilePatch
from packages.validation.runner import validate_migration
from packages.validation.models import ValidationStatus

FIXTURES = Path(__file__).parent / "fixtures"
DEMO_REPO = FIXTURES / "demo-repository"


@pytest.fixture(scope="module")
def valid_migration_plan():
    with open(FIXTURES / "api-v1" / "fakepay.yaml") as f:
        v1 = yaml.safe_load(f)
    with open(FIXTURES / "api-v2" / "fakepay.yaml") as f:
        v2 = yaml.safe_load(f)
    changes = diff_specs(v1, v2)
    scan = scan_repository(DEMO_REPO)
    impact = analyze_impact(changes, scan, provider="fakepay")
    return generate_migration_plan(DEMO_REPO, changes, impact)


class TestSuccessfulValidation:
    def test_full_validation_passes_on_valid_plan(self, valid_migration_plan):
        result = validate_migration(DEMO_REPO, valid_migration_plan)
        assert result.overall_status == ValidationStatus.PASS
        assert result.can_proceed_to_pr is True
        assert result.build_passed is True
        assert result.test_passed is True
        assert result.contract_passed is True
        assert result.error_summary is None

    def test_all_individual_steps_passed(self, valid_migration_plan):
        result = validate_migration(DEMO_REPO, valid_migration_plan)
        step_names = {s.name for s in result.steps}
        assert {"apply_patches", "build", "contract", "tests"}.issubset(step_names)
        assert all(s.passed for s in result.steps)

    def test_host_repository_remains_unmodified(self, valid_migration_plan):
        """Host repository files must NEVER be modified directly."""
        client_file = DEMO_REPO / "src" / "fakepay-client.ts"
        content_before = client_file.read_text(encoding="utf-8")

        # Run validation
        validate_migration(DEMO_REPO, valid_migration_plan)

        content_after = client_file.read_text(encoding="utf-8")
        assert content_before == content_after
        # Host repo still has v1 code
        assert '"/payment"' in content_after


class TestFailedValidationGating:
    def test_broken_patch_fails_validation_and_blocks_pr(self):
        """An incomplete patch that leaves legacy endpoint must FAIL and block PR creation."""
        broken_plan = MigrationPlan(
            provider="fakepay",
            recipe_name="broken_recipe",
            steps=["Partial update"],
            file_patches=[
                FilePatch(
                    file_path="src/config.ts",
                    original_content="fake",
                    modified_content="export const config = { fakepay: { baseUrl: 'https://api.fakepay.dev/v1' } };",
                    description="Incomplete patch leaving v1 URL",
                )
            ],
            confidence=0.5,
            risk_level="high",
            is_deterministic=True,
        )

        result = validate_migration(DEMO_REPO, broken_plan)
        assert result.overall_status == ValidationStatus.FAIL
        assert result.can_proceed_to_pr is False
        assert result.error_summary is not None

    def test_serialization_of_validation_result(self, valid_migration_plan):
        result = validate_migration(DEMO_REPO, valid_migration_plan)
        data = result.to_dict()
        assert data["overall_status"] == "PASS"
        assert data["can_proceed_to_pr"] is True
        assert len(data["steps"]) >= 4
