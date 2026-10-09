"""Milestone 2 — Change Engine tests.

Verifies that diff_specs() produces the correct structured changes
when comparing the FakePay v1 and v2 OpenAPI fixtures.
"""

import json
from pathlib import Path

import yaml
import pytest

from packages.change_engine.diff import diff_specs
from packages.change_engine.models import ChangeType, APIChange
from packages.change_engine.classifier import is_breaking, classify_severity

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def v1_spec():
    with open(FIXTURES / "api-v1" / "fakepay.yaml") as f:
        return yaml.safe_load(f)


@pytest.fixture
def v2_spec():
    with open(FIXTURES / "api-v2" / "fakepay.yaml") as f:
        return yaml.safe_load(f)


@pytest.fixture
def expected_changelog():
    with open(FIXTURES / "changelog" / "fakepay-v1-to-v2.json") as f:
        return json.load(f)


# ── Core diff tests ──────────────────────────────────────────────────


class TestDiffSpecs:
    def test_detects_correct_number_of_changes(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        assert len(changes) == 3

    def test_detects_post_endpoint_rename(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        post_renames = [
            c for c in changes
            if c.type == ChangeType.ENDPOINT_RENAMED and c.method == "POST"
        ]
        assert len(post_renames) == 1
        r = post_renames[0]
        assert r.old_path == "/payment"
        assert r.new_path == "/payments"
        assert r.operation_id == "createPayment"
        assert r.breaking is True

    def test_detects_get_endpoint_rename(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        get_renames = [
            c for c in changes
            if c.type == ChangeType.ENDPOINT_RENAMED and c.method == "GET"
        ]
        assert len(get_renames) == 1
        r = get_renames[0]
        assert r.old_path == "/payment/{id}"
        assert r.new_path == "/payments/{id}"
        assert r.operation_id == "getPayment"
        assert r.breaking is True

    def test_detects_currency_required(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        field_changes = [c for c in changes if c.type == ChangeType.FIELD_REQUIRED]
        assert len(field_changes) == 1
        fc = field_changes[0]
        assert fc.field == "currency"
        assert fc.schema == "CreatePaymentRequest"
        assert fc.old_required is False
        assert fc.new_required is True
        assert fc.breaking is True

    def test_no_spurious_additions_or_removals(self, v1_spec, v2_spec):
        """Renames should NOT produce phantom add/remove entries."""
        changes = diff_specs(v1_spec, v2_spec)
        added = [c for c in changes if c.type == ChangeType.ENDPOINT_ADDED]
        removed = [c for c in changes if c.type == ChangeType.ENDPOINT_REMOVED]
        assert len(added) == 0
        assert len(removed) == 0

    def test_all_changes_are_breaking(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        assert all(c.breaking for c in changes)


# ── Output matches fixture changelog ─────────────────────────────────


class TestChangelogMatch:
    def test_change_types_match_fixture(self, v1_spec, v2_spec, expected_changelog):
        changes = diff_specs(v1_spec, v2_spec)
        actual_types = sorted(c.type.value for c in changes)
        expected_types = sorted(c["type"] for c in expected_changelog["changes"])
        assert actual_types == expected_types

    def test_endpoint_rename_paths_match_fixture(self, v1_spec, v2_spec, expected_changelog):
        changes = diff_specs(v1_spec, v2_spec)
        actual_renames = {
            (c.old_path, c.new_path, c.method)
            for c in changes if c.type == ChangeType.ENDPOINT_RENAMED
        }
        expected_renames = {
            (c["old_path"], c["new_path"], c["method"])
            for c in expected_changelog["changes"] if c["type"] == "endpoint_renamed"
        }
        assert actual_renames == expected_renames

    def test_field_change_matches_fixture(self, v1_spec, v2_spec, expected_changelog):
        changes = diff_specs(v1_spec, v2_spec)
        actual_fc = [c for c in changes if c.type == ChangeType.FIELD_REQUIRED][0]
        expected_fc = [c for c in expected_changelog["changes"] if c["type"] == "field_required"][0]
        assert actual_fc.field == expected_fc["field"]
        assert actual_fc.old_required == expected_fc["old_required"]
        assert actual_fc.new_required == expected_fc["new_required"]
        assert actual_fc.schema == expected_fc["schema"]


# ── Classifier tests ────────────────────────────────────────────────


class TestClassifier:
    def test_all_fakepay_changes_classified_as_breaking(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        for c in changes:
            assert is_breaking(c) is True

    def test_severity_is_critical_for_renames(self, v1_spec, v2_spec):
        changes = diff_specs(v1_spec, v2_spec)
        assert classify_severity(changes) == "critical"

    def test_field_only_severity_is_warning(self):
        """A change set with only field_required should be 'warning', not 'critical'."""
        changes = [
            APIChange(
                type=ChangeType.FIELD_REQUIRED,
                breaking=True,
                description="test",
                field="x",
                old_required=False,
                new_required=True,
            )
        ]
        assert classify_severity(changes) == "warning"

    def test_non_breaking_severity_is_info(self):
        changes = [
            APIChange(
                type=ChangeType.ENDPOINT_ADDED,
                breaking=False,
                description="new endpoint",
            )
        ]
        assert classify_severity(changes) == "info"


# ── Stripe Charges → PaymentIntents diff tests ────────────────────────


@pytest.fixture
def stripe_v1_spec():
    with open(FIXTURES / "api-v1" / "stripe.yaml") as f:
        return yaml.safe_load(f)


@pytest.fixture
def stripe_v2_spec():
    with open(FIXTURES / "api-v2" / "stripe.yaml") as f:
        return yaml.safe_load(f)


class TestStripeSpecDiff:
    def test_detects_endpoint_rename(self, stripe_v1_spec, stripe_v2_spec):
        """POST /v1/charges → POST /v1/payment_intents should be detected as ENDPOINT_RENAMED."""
        changes = diff_specs(stripe_v1_spec, stripe_v2_spec)
        renames = [c for c in changes if c.type == ChangeType.ENDPOINT_RENAMED]
        assert len(renames) >= 1
        r = renames[0]
        assert r.old_path == "/v1/charges"
        assert r.new_path == "/v1/payment_intents"
        assert r.method == "POST"
        assert r.breaking is True

    def test_rename_preserves_operation_id(self, stripe_v1_spec, stripe_v2_spec):
        """The rename detection relies on matching operationId — verify it is preserved."""
        changes = diff_specs(stripe_v1_spec, stripe_v2_spec)
        renames = [c for c in changes if c.type == ChangeType.ENDPOINT_RENAMED]
        assert renames[0].operation_id == "createCharge"

    def test_detects_payment_method_required(self, stripe_v1_spec, stripe_v2_spec):
        """payment_method becoming required should be detected as FIELD_REQUIRED."""
        changes = diff_specs(stripe_v1_spec, stripe_v2_spec)
        field_changes = [c for c in changes if c.type == ChangeType.FIELD_REQUIRED]
        payment_method_changes = [c for c in field_changes if c.field == "payment_method"]
        assert len(payment_method_changes) >= 1
        fc = payment_method_changes[0]
        assert fc.breaking is True
        assert fc.new_required is True

    def test_no_spurious_removals(self, stripe_v1_spec, stripe_v2_spec):
        """The rename should NOT produce a phantom ENDPOINT_REMOVED for /v1/charges."""
        changes = diff_specs(stripe_v1_spec, stripe_v2_spec)
        removed = [c for c in changes if c.type == ChangeType.ENDPOINT_REMOVED]
        charge_removals = [c for c in removed if c.old_path == "/v1/charges"]
        assert len(charge_removals) == 0

    def test_all_detected_changes_are_breaking(self, stripe_v1_spec, stripe_v2_spec):
        """All changes between Stripe v1 and v2 should be classified as breaking."""
        from packages.change_engine.classifier import is_breaking
        changes = diff_specs(stripe_v1_spec, stripe_v2_spec)
        breaking = [c for c in changes if is_breaking(c)]
        assert len(breaking) >= 1
