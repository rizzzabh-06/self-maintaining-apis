"""Deterministic recipe for Stripe Charges -> PaymentIntents migration."""

from __future__ import annotations

from pathlib import Path

from packages.change_engine.models import APIChange, ChangeType
from packages.impact_engine.models import ImpactReport
from ..models import MigrationPlan, FilePatch
from .base import MigrationRecipe


class StripeChargesToPaymentIntentsRecipe(MigrationRecipe):
    """Deterministic migration recipe for Stripe Charges → PaymentIntents API evolution.

    Handles the breaking change where:
    - POST /v1/charges → POST /v1/payment_intents (endpoint rename)
    - payment_method becomes required (new field)
    - automatic_payment_methods becomes required (new field)
    """

    name = "stripe_charges_to_payment_intents"
    provider = "stripe"

    def can_handle(self, changes: list[APIChange], provider: str) -> bool:
        """Return True if this recipe can handle the given changes for the provider."""
        if provider.lower() != "stripe":
            return False

        # Check if changes contain the Stripe Charges → PaymentIntents rename
        return any(
            c.type == ChangeType.ENDPOINT_RENAMED and c.old_path == "/v1/charges"
            for c in changes
        )

    def apply(
        self,
        repo_path: Path,
        changes: list[APIChange],
        impact_report: ImpactReport,
    ) -> MigrationPlan:
        """Generate migration patches for Stripe Charges → PaymentIntents."""
        patches: list[FilePatch] = []
        steps: list[str] = []

        # 1. Update src/lib/stripe-client.ts: /v1/charges → /v1/payment_intents, createCharge → createPaymentIntent
        client_path = repo_path / "src" / "lib" / "stripe-client.ts"
        if client_path.is_file():
            orig = client_path.read_text(encoding="utf-8")
            mod = orig.replace("Stripe Charges API", "Stripe PaymentIntents API")
            mod = mod.replace("POST /v1/charges", "POST /v1/payment_intents")
            # Replace endpoint path first (before generic replacements)
            mod = mod.replace('"/v1/charges"', '"/v1/payment_intents"')
            mod = mod.replace("'/v1/charges'", "'/v1/payment_intents'")
            # Replace specific identifiers before generic ones
            mod = mod.replace("CreateChargeRequest", "CreatePaymentIntentRequest")
            mod = mod.replace("createCharge", "createPaymentIntent")
            # Replace type names carefully to avoid over-replacement
            mod = mod.replace("Promise<Charge>", "Promise<PaymentIntent>")
            mod = mod.replace(": Charge", ": PaymentIntent")
            # Update comments (only in comment contexts)
            mod = mod.replace("// charge", "// payment intent")
            mod = mod.replace("/* charge", "/* payment intent")
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/lib/stripe-client.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update StripeClient to use PaymentIntents API (POST /v1/payment_intents)",
                    )
                )
                steps.append("Update Stripe client endpoints from /v1/charges to /v1/payment_intents in src/lib/stripe-client.ts")

        # 2. Update src/types/stripe.ts: add payment_method and automatic_payment_methods to CreatePaymentIntentRequest
        types_path = repo_path / "src" / "types" / "stripe.ts"
        if types_path.is_file():
            orig = types_path.read_text(encoding="utf-8")
            mod = orig
            
            # Add payment_method field if not present
            if "payment_method" not in mod:
                # Insert after currency field in CreatePaymentIntentRequest
                mod = mod.replace(
                    "  /** ISO 4217 currency code. */\n  currency: string;",
                    "  /** ISO 4217 currency code. */\n  currency: string;\n\n  /** ID of the PaymentMethod to attach to this PaymentIntent. */\n  payment_method: string;"
                )
            
            # Add automatic_payment_methods field if not present
            if "automatic_payment_methods" not in mod:
                # Insert after payment_method
                mod = mod.replace(
                    "  /** ID of the PaymentMethod to attach to this PaymentIntent. */\n  payment_method: string;",
                    "  /** ID of the PaymentMethod to attach to this PaymentIntent. */\n  payment_method: string;\n\n  /** Settings to automatically detect compatible payment methods. */\n  automatic_payment_methods: { enabled: boolean };"
                )
            
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/types/stripe.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Add required payment_method and automatic_payment_methods fields to CreatePaymentIntentRequest",
                    )
                )
                steps.append("Add payment_method and automatic_payment_methods to CreatePaymentIntentRequest in src/types/stripe.ts")


        # 3. Update src/app/api/checkout/route.ts: createCharge → createPaymentIntent, add payment_method argument
        checkout_path = repo_path / "src" / "app" / "api" / "checkout" / "route.ts"
        if checkout_path.is_file():
            orig = checkout_path.read_text(encoding="utf-8")
            mod = orig
            
            # Replace createCharge with createPaymentIntent
            mod = mod.replace("createCharge(", "createPaymentIntent(")
            mod = mod.replace("CreateChargeRequest", "CreatePaymentIntentRequest")
            
            # Add payment_method to the argument object if not present
            if "payment_method" not in mod:
                # Pattern 1: has description after currency
                mod = mod.replace(
                    'currency: "usd",\n    description:',
                    'currency: "usd",\n    payment_method: "pm_card_visa",\n    automatic_payment_methods: { enabled: true },\n    description:'
                )
                # Pattern 2: currency is last field before closing
                if "payment_method" not in mod:
                    mod = mod.replace(
                        'currency: "usd",\n  }',
                        'currency: "usd",\n    payment_method: "pm_card_visa",\n    automatic_payment_methods: { enabled: true },\n  }'
                    )
            
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="src/app/api/checkout/route.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update checkout route to use createPaymentIntent with required payment_method",
                    )
                )
                steps.append("Update createCharge to createPaymentIntent in src/app/api/checkout/route.ts")

        # 4. Update tests/checkout.test.ts: update assertions to expect /v1/payment_intents and payment_method
        test_path = repo_path / "tests" / "checkout.test.ts"
        if test_path.is_file():
            orig = test_path.read_text(encoding="utf-8")
            mod = orig
            
            # Update test descriptions
            mod = mod.replace('"/v1/charges"', '"/v1/payment_intents"')
            mod = mod.replace("createCharge", "createPaymentIntent")
            mod = mod.replace("charge", "payment intent")
            mod = mod.replace("Charge", "PaymentIntent")
            
            # Add payment_method to test expectations if not present
            if "payment_method" not in mod and "toHaveBeenCalledWith" in mod:
                # Add payment_method field to expected argument object in assertions
                mod = mod.replace(
                    'currency: "usd",\n      description:',
                    'currency: "usd",\n      payment_method: "pm_card_visa",\n      automatic_payment_methods: { enabled: true },\n      description:'
                )
                # Fallback: add before closing brace if description is last
                if "payment_method" not in mod:
                    mod = mod.replace(
                        'description: "Order',
                        'payment_method: "pm_card_visa",\n      automatic_payment_methods: { enabled: true },\n      description: "Order'
                    )
            
            if orig != mod:
                patches.append(
                    FilePatch(
                        file_path="tests/checkout.test.ts",
                        original_content=orig,
                        modified_content=mod,
                        description="Update unit tests to assert /v1/payment_intents endpoint and payment_method field",
                    )
                )
                steps.append("Update unit test assertions in tests/checkout.test.ts")

        summary = (
            f"Deterministic migration recipe '{self.name}' generated {len(patches)} file patch(es) "
            f"to migrate Stripe from Charges to PaymentIntents API."
        )

        return MigrationPlan(
            provider="stripe",
            recipe_name=self.name,
            steps=steps,
            file_patches=patches,
            confidence=0.97,
            risk_level="high",
            is_deterministic=True,
            summary=summary,
        )
