"""Milestone 4 — Impact Engine tests.

Verifies that analyze_impact() correlates detected API changes with repository
usages to identify affected files, symbols, risk levels, and confidence scores.
"""

from pathlib import Path
import pytest
import yaml

from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact
from packages.impact_engine.models import RiskLevel

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
def scanned_repo():
    return scan_repository(DEMO_REPO)


@pytest.fixture(scope="module")
def impact_report(fakepay_changes, scanned_repo):
    return analyze_impact(fakepay_changes, scanned_repo, provider="fakepay")


class TestImpactAnalysisFiles:
    def test_identifies_all_core_affected_files(self, impact_report):
        affected_files = set(impact_report.affected_files)
        # Must identify the client, checkout logic, config, and types
        assert "src/fakepay-client.ts" in affected_files
        assert "src/checkout.ts" in affected_files
        assert "src/config.ts" in affected_files
        assert "src/types.ts" in affected_files

    def test_affected_usages_contain_line_and_symbol_info(self, impact_report):
        assert len(impact_report.affected_usages) >= 4
        client_usages = impact_report.usages_for_file("src/fakepay-client.ts")
        assert len(client_usages) >= 1
        assert any(u.symbol in ("createPayment", "getPayment", "FakePayClient") for u in client_usages)

    def test_types_file_impacted_by_schema_change(self, impact_report):
        type_usages = impact_report.usages_for_file("src/types.ts")
        assert len(type_usages) >= 1
        assert any("CreatePaymentRequest" in str(u.symbol) or "field" in u.change_reason for u in type_usages)

    def test_checkout_file_impacted_by_caller_methods(self, impact_report):
        checkout_usages = impact_report.usages_for_file("src/checkout.ts")
        assert len(checkout_usages) >= 1
        assert any(u.symbol in ("createPayment", "processCheckout") for u in checkout_usages)


class TestImpactRiskAndConfidence:
    def test_risk_level_is_critical_for_multi_file_breaking_changes(self, impact_report):
        assert impact_report.risk_level in (RiskLevel.CRITICAL, RiskLevel.HIGH)

    def test_overall_confidence_is_high(self, impact_report):
        # We target >= 0.85 confidence on supported deterministic patterns
        assert impact_report.overall_confidence >= 0.85

    def test_summary_is_descriptive(self, impact_report):
        assert "impacting" in impact_report.summary
        assert "risk" in impact_report.summary.lower()


class TestImpactReportSerialization:
    def test_to_dict_format(self, impact_report):
        data = impact_report.to_dict()
        assert data["provider"] == "fakepay"
        assert len(data["affected_files"]) >= 4
        assert data["overall_confidence"] >= 0.85
        assert data["risk_level"] in ("critical", "high")
        assert isinstance(data["affected_usages"], list)
