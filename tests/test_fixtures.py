"""Milestone 1 — Fixture validation tests.

Verifies that all fixture files (FakePay v1/v2 OpenAPI specs, changelog,
and demo-repository TypeScript project) are present and structurally correct.
"""

import json
import os
from pathlib import Path

import yaml
import pytest

FIXTURES = Path(__file__).parent / "fixtures"
API_V1 = FIXTURES / "api-v1"
API_V2 = FIXTURES / "api-v2"
CHANGELOG = FIXTURES / "changelog"
DEMO_REPO = FIXTURES / "demo-repository"


# ── FakePay OpenAPI specs ────────────────────────────────────────────

class TestFakePayV1:
    @pytest.fixture(autouse=True)
    def load_spec(self):
        with open(API_V1 / "fakepay.yaml") as f:
            self.spec = yaml.safe_load(f)

    def test_version_is_1(self):
        assert self.spec["info"]["version"] == "1.0.0"

    def test_endpoint_is_payment_singular(self):
        assert "/payment" in self.spec["paths"]
        assert "/payment/{id}" in self.spec["paths"]
        assert "/payments" not in self.spec["paths"]

    def test_currency_is_optional(self):
        required = self.spec["components"]["schemas"]["CreatePaymentRequest"]["required"]
        assert "currency" not in required

    def test_has_post_and_get(self):
        assert "post" in self.spec["paths"]["/payment"]
        assert "get" in self.spec["paths"]["/payment/{id}"]


class TestFakePayV2:
    @pytest.fixture(autouse=True)
    def load_spec(self):
        with open(API_V2 / "fakepay.yaml") as f:
            self.spec = yaml.safe_load(f)

    def test_version_is_2(self):
        assert self.spec["info"]["version"] == "2.0.0"

    def test_endpoint_is_payments_plural(self):
        assert "/payments" in self.spec["paths"]
        assert "/payments/{id}" in self.spec["paths"]
        assert "/payment" not in self.spec["paths"]

    def test_currency_is_required(self):
        required = self.spec["components"]["schemas"]["CreatePaymentRequest"]["required"]
        assert "currency" in required

    def test_has_post_and_get(self):
        assert "post" in self.spec["paths"]["/payments"]
        assert "get" in self.spec["paths"]["/payments/{id}"]


# ── Changelog ────────────────────────────────────────────────────────

class TestChangelog:
    @pytest.fixture(autouse=True)
    def load_changelog(self):
        with open(CHANGELOG / "fakepay-v1-to-v2.json") as f:
            self.changelog = json.load(f)

    def test_version_range(self):
        assert self.changelog["from_version"] == "1.0.0"
        assert self.changelog["to_version"] == "2.0.0"

    def test_all_changes_are_breaking(self):
        assert all(c["breaking"] for c in self.changelog["changes"])

    def test_has_endpoint_renames(self):
        renames = [c for c in self.changelog["changes"] if c["type"] == "endpoint_renamed"]
        assert len(renames) == 2
        old_paths = {c["old_path"] for c in renames}
        new_paths = {c["new_path"] for c in renames}
        assert old_paths == {"/payment", "/payment/{id}"}
        assert new_paths == {"/payments", "/payments/{id}"}

    def test_has_field_required_change(self):
        field_changes = [c for c in self.changelog["changes"] if c["type"] == "field_required"]
        assert len(field_changes) == 1
        fc = field_changes[0]
        assert fc["field"] == "currency"
        assert fc["old_required"] is False
        assert fc["new_required"] is True


# ── Demo repository structure ────────────────────────────────────────

class TestDemoRepository:
    def test_package_json_exists_and_has_fakepay(self):
        with open(DEMO_REPO / "package.json") as f:
            pkg = json.load(f)
        assert "fakepay-sdk" in pkg["dependencies"]
        assert "axios" in pkg["dependencies"]

    def test_tsconfig_exists(self):
        assert (DEMO_REPO / "tsconfig.json").is_file()

    def test_source_files_exist(self):
        expected = ["config.ts", "types.ts", "fakepay-client.ts", "checkout.ts", "index.ts"]
        for fname in expected:
            assert (DEMO_REPO / "src" / fname).is_file(), f"Missing src/{fname}"

    def test_test_file_exists(self):
        assert (DEMO_REPO / "tests" / "checkout.test.ts").is_file()

    def test_client_uses_payment_singular_endpoint(self):
        """The v1 client must reference /payment (singular) — the migration target."""
        client_src = (DEMO_REPO / "src" / "fakepay-client.ts").read_text()
        assert '"/payment"' in client_src
        assert '`/payment/' in client_src
        # Should NOT already use the v2 plural form
        assert '"/payments"' not in client_src

    def test_checkout_omits_currency(self):
        """processCheckout must NOT pass currency — it relies on v1 server default."""
        checkout_src = (DEMO_REPO / "src" / "checkout.ts").read_text()
        # Extract the createPayment call arguments block
        call_block = checkout_src.split("createPayment(")[1].split(");")[0]
        # Strip comments — only look at actual code lines
        code_lines = [
            line.strip() for line in call_block.splitlines()
            if line.strip() and not line.strip().startswith("//")
        ]
        code_only = " ".join(code_lines)
        # There should be no `currency:` property assignment in the args
        assert "currency:" not in code_only

    def test_config_has_v1_base_url(self):
        config_src = (DEMO_REPO / "src" / "config.ts").read_text()
        assert "https://api.fakepay.dev/v1" in config_src
