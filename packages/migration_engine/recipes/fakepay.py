"""Deterministic recipe for FakePay v1 -> v2 migration."""

from __future__ import annotations

import re
from pathlib import Path

from packages.change_engine.models import APIChange, ChangeType
from packages.impact_engine.models import ImpactReport
from ..models import MigrationPlan, FilePatch
from .base import MigrationRecipe


class FakePayV1ToV2Recipe(MigrationRecipe):
    name = "fakepay_v1_to_v2"
    provider = "fakepay"

    def can_handle(self, changes: list[APIChange], provider: str) -> bool:
        if provider.lower() != "fakepay":
            return False
        # Handles endpoint renames /payment -> /payments and required currency field
        has_rename = any(
            c.type == ChangeType.ENDPOINT_RENAMED and c.old_path in ("/payment", "/payment/{id}")
            for c in changes
        )
        has_field = any(
            c.type == ChangeType.FIELD_REQUIRED and c.field == "currency"
            for c in changes
        )
        return has_rename or has_field

    def apply(
        self,
        repo_path: Path,
        changes: list[APIChange],
        impact_report: ImpactReport,
    ) -> MigrationPlan:
        patches: list[FilePatch] = []
        steps: list[str] = []

        # 1. Update config.ts: update base URL to v2
        config_path = repo_path / "src" / "config.ts"
        if config_path.is_file():
            orig = config_path.read_text(encoding="utf-8")
            mod = orig.replace("https://api.fakepay.dev/v1", "https://api.fakepay.dev/v2")
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/config.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update FakePay API base URL from v1 to v2",
                    )
                )
                steps.append("Update FakePay API base URL to v2 in src/config.ts")

        # 2. Update types.ts: make currency required in CreatePaymentRequest
        types_path = repo_path / "src" / "types.ts"
        if types_path.is_file():
            orig = types_path.read_text(encoding="utf-8")
            mod = orig.replace(
                "/** FakePay request and response types (v1). */",
                "/** FakePay request and response types (v2). */",
            )
            mod = mod.replace(
                "/** Optional in v1 — defaults to USD on the server. */\n  currency?: string;",
                "/** Required in v2. */\n  currency: string;",
            )
            # fallback if comments slightly different
            if "currency?: string;" in mod:
                mod = mod.replace("currency?: string;", "currency: string;")
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/types.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update CreatePaymentRequest interface to mark currency as required",
                    )
                )
                steps.append("Make currency required in CreatePaymentRequest in src/types.ts")

        # 3. Update fakepay-client.ts: rename endpoints /payment -> /payments, /payment/${id} -> /payments/${id}
        client_path = repo_path / "src" / "fakepay-client.ts"
        if client_path.is_file():
            orig = client_path.read_text(encoding="utf-8")
            mod = orig.replace("FakePay v1 API", "FakePay v2 API")
            mod = mod.replace("POST /payment ", "POST /payments ")
            mod = mod.replace("GET  /payment/:id", "GET  /payments/:id")
            mod = mod.replace('"/payment"', '"/payments"')
            mod = mod.replace('`/payment/${id}`', '`/payments/${id}`')
            mod = mod.replace(
                "`currency` is optional in v1 (server defaults to USD)",
                "`currency` is required in v2",
            )
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/fakepay-client.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update FakePayClient endpoints to /payments and /payments/${id}",
                    )
                )
                steps.append("Update HTTP client endpoints to /payments in src/fakepay-client.ts")

        # 4. Update checkout.ts: pass required currency: "usd"
        checkout_path = repo_path / "src" / "checkout.ts"
        if checkout_path.is_file():
            orig = checkout_path.read_text(encoding="utf-8")
            # Replace the createPayment argument object
            old_block = (
                "  const payment = await fakepay.createPayment({\n"
                "    amount: amountCents,\n"
                "    source: paymentToken,\n"
                "    description: `Order ${orderId}`,\n"
                "    // currency intentionally omitted — v1 defaults to \"usd\"\n"
                "  });"
            )
            new_block = (
                "  const payment = await fakepay.createPayment({\n"
                "    amount: amountCents,\n"
                "    source: paymentToken,\n"
                "    description: `Order ${orderId}`,\n"
                "    currency: \"usd\",\n"
                "  });"
            )
            if old_block in orig:
                mod = orig.replace(old_block, new_block)
            else:
                # Regex fallback
                mod = re.sub(
                    r"description:\s*`Order \${orderId}`\s*,?(?:\s*//[^\n]*)?",
                    'description: `Order ${orderId}`,\n    currency: "usd",',
                    orig,
                )
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/checkout.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Pass required currency field in processCheckout",
                    )
                )
                steps.append("Add currency: 'usd' to createPayment in src/checkout.ts")

        # 5. Update tests/checkout.test.ts: reflect /payments endpoint and currency
        test_path = repo_path / "tests" / "checkout.test.ts"
        if test_path.is_file():
            orig = test_path.read_text(encoding="utf-8")
            mod = orig.replace(
                'it("should POST to /payment with amount and source"',
                'it("should POST to /payments with amount, source, and currency"',
            )
            mod = mod.replace('// Note: currency NOT passed — relying on v1 default\n    });', 'currency: "usd",\n    });')
            mod = mod.replace('toHaveBeenCalledWith("/payment", {', 'toHaveBeenCalledWith("/payments", {')
            # Add currency to expected object in test if missing
            old_expect = (
                'expect(instance.post).toHaveBeenCalledWith("/payments", {\n'
                '      amount: 5000,\n'
                '      source: "tok_visa_4242",\n'
                '      description: "Order #1234",\n'
                '    });'
            )
            new_expect = (
                'expect(instance.post).toHaveBeenCalledWith("/payments", {\n'
                '      amount: 5000,\n'
                '      source: "tok_visa_4242",\n'
                '      description: "Order #1234",\n'
                '      currency: "usd",\n'
                '    });'
            )
            if old_expect in mod:
                mod = mod.replace(old_expect, new_expect)

            mod = mod.replace('it("should GET /payment/:id"', 'it("should GET /payments/:id"')
            mod = mod.replace('client.getPayment("pay_abc123");', 'client.getPayment("pay_abc123");')
            mod = mod.replace('toHaveBeenCalledWith("/payment/pay_abc123")', 'toHaveBeenCalledWith("/payments/pay_abc123")')

            mod = mod.replace(
                'it("should create a payment without currency (v1 default)"',
                'it("should create a payment with required currency (v2)"',
            )

            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="tests/checkout.test.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update unit tests to assert /payments endpoint and required currency",
                    )
                )
                steps.append("Update unit test assertions in tests/checkout.test.ts")

        summary = (
            f"Deterministic migration recipe '{self.name}' generated {len(patches)} file patch(es) "
            f"to migrate FakePay from v1 to v2."
        )

        return MigrationPlan(
            provider="fakepay",
            recipe_name=self.name,
            steps=steps,
            file_patches=patches,
            confidence=0.98,
            risk_level="high",
            is_deterministic=True,
            summary=summary,
        )
