"""Milestone 5 — Migration Engine tests.

Verifies deterministic recipe selection, patch generation for FakePay v1->v2,
and bounded LLM fallback behavior.
"""

from pathlib import Path
import pytest
import yaml

from packages.change_engine.diff import diff_specs
from packages.change_engine.models import APIChange, ChangeType
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact
from packages.impact_engine.models import ImpactReport, RiskLevel
from packages.migration_engine.planner import generate_migration_plan
from packages.migration_engine.llm.base import StubLLMProvider

FIXTURES = Path(__file__).parent / "fixtures"
DEMO_REPO = FIXTURES / "demo-repository"


@pytest.fixture(scope="module")
def fakepay_changes():
    with open(FIXTURES / "api-v1" / "fakepay.yaml") as f:
        v1 = yaml.safe_load(f)
    with open(FIXTURES / "api-v2" / "fakepay.yaml") as f:
        v2 = yaml.safe_load(f)
    return diff_specs(v1, v2)


@pytest.fixture(scope="module")
def impact_report(fakepay_changes):
    scan = scan_repository(DEMO_REPO)
    return analyze_impact(fakepay_changes, scan, provider="fakepay")


@pytest.fixture(scope="module")
def migration_plan(fakepay_changes, impact_report):
    return generate_migration_plan(DEMO_REPO, fakepay_changes, impact_report)


class TestDeterministicMigrationPlan:
    def test_selects_fakepay_deterministic_recipe(self, migration_plan):
        assert migration_plan.is_deterministic is True
        assert migration_plan.recipe_name == "fakepay_v1_to_v2"
        assert migration_plan.provider == "fakepay"
        assert migration_plan.confidence >= 0.95

    def test_generates_patches_for_all_affected_files(self, migration_plan):
        changed_files = set(migration_plan.changed_files)
        expected = {
            "src/config.ts",
            "src/types.ts",
            "src/fakepay-client.ts",
            "src/checkout.ts",
            "tests/checkout.test.ts",
        }
        assert expected.issubset(changed_files)

    def test_diffs_are_non_empty(self, migration_plan):
        for patch in migration_plan.file_patches:
            assert len(patch.diff) > 0
            assert "--- a/" in patch.diff
            assert "+++ b/" in patch.diff


class TestPatchesContentCorrectness:
    def test_config_patch_updates_base_url_to_v2(self, migration_plan):
        patch = migration_plan.patch_for_file("src/config.ts")
        assert patch is not None
        assert "https://api.fakepay.dev/v2" in patch.modified_content
        assert "https://api.fakepay.dev/v1" not in patch.modified_content

    def test_types_patch_makes_currency_required(self, migration_plan):
        patch = migration_plan.patch_for_file("src/types.ts")
        assert patch is not None
        assert "currency: string;" in patch.modified_content
        assert "currency?: string;" not in patch.modified_content

    def test_client_patch_renames_endpoints(self, migration_plan):
        patch = migration_plan.patch_for_file("src/fakepay-client.ts")
        assert patch is not None
        assert '"/payments"' in patch.modified_content
        assert '"/payment"' not in patch.modified_content
        assert '`/payments/${id}`' in patch.modified_content

    def test_checkout_patch_supplies_currency(self, migration_plan):
        patch = migration_plan.patch_for_file("src/checkout.ts")
        assert patch is not None
        assert 'currency: "usd"' in patch.modified_content

    def test_test_patch_updates_endpoint_assertions(self, migration_plan):
        patch = migration_plan.patch_for_file("tests/checkout.test.ts")
        assert patch is not None
        assert '"/payments"' in patch.modified_content
        assert 'currency: "usd"' in patch.modified_content


class TestLLMFallbackBranch:
    def test_unknown_provider_triggers_llm_fallback(self):
        unknown_change = APIChange(
            type=ChangeType.ENDPOINT_RENAMED,
            breaking=True,
            description="Rename /foo to /bar",
            old_path="/foo",
            new_path="/bar",
            method="POST",
        )
        fake_impact = ImpactReport(
            provider="unknown_provider",
            repository_path=str(DEMO_REPO),
            changes=[unknown_change],
            affected_files=["src/config.ts"],
            affected_usages=[],
            overall_confidence=0.7,
            risk_level=RiskLevel.MEDIUM,
            summary="Test fallback",
        )
        plan = generate_migration_plan(
            DEMO_REPO,
            [unknown_change],
            fake_impact,
            llm_provider=StubLLMProvider(),
        )
        assert plan.is_deterministic is False
        assert plan.recipe_name is None
        assert len(plan.steps) >= 1
