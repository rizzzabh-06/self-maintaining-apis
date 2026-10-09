# Requirements Document

## Introduction

The Self-Maintaining API Agent currently operates against a single mock provider (FakePay) and a local fixture repository. This feature makes the demo production-ready for live presentation by: (A) publishing a purpose-built Next.js TypeScript repository on GitHub that represents a real codebase in its pre-migration state, (B) verifying and finalising the existing FakePay OpenAPI fixture files, (C) adding Stripe Charges → PaymentIntents OpenAPI fixture files that encode a real-world breaking API change, (D) implementing a deterministic `StripeChargesToPaymentIntentsRecipe` in the migration engine, and (E) wiring the demo repository path through the API routes via an environment variable while keeping all 88 existing tests green.

---

## Glossary

- **Pipeline**: The end-to-end autonomous agent flow: spec diff → AST scan → impact analysis → migration plan → sandbox validation → Draft PR.
- **Recipe**: A deterministic `MigrationRecipe` subclass that pattern-matches a set of `APIChange` objects and produces `FilePatch` objects without LLM involvement.
- **RECIPE_REGISTRY**: The list in `packages/migration_engine/planner.py` that the planner searches in order before falling back to the LLM provider.
- **Demo_Repository**: The purpose-built Next.js TypeScript repository (`fakepay-nextjs-demo`) pushed to `https://github.com/rizzzabh-06/fakepay-nextjs-demo`.
- **Fixture_Repository**: The existing local directory at `tests/fixtures/demo-repository` used by all current tests.
- **FakePay_Spec**: The OpenAPI 3.0 YAML files at `tests/fixtures/api-v1/fakepay.yaml` and `tests/fixtures/api-v2/fakepay.yaml`.
- **Stripe_Spec**: The new OpenAPI 3.0 YAML files at `tests/fixtures/api-v1/stripe.yaml` and `tests/fixtures/api-v2/stripe.yaml`.
- **Sandbox**: The `IsolatedSandbox` class in `packages/validation/sandbox.py` that copies a repository into a temp directory, applies patches, and runs structural verification.
- **Diff_Engine**: The `diff_specs()` function in `packages/change_engine/diff.py` that performs deterministic structural comparison of two OpenAPI specs.
- **AST_Scanner**: The repository scanner in `packages/repository_analyzer/scanner.py` that performs static analysis of TypeScript files.
- **FilePatch**: The `FilePatch` model from `packages/migration_engine/models.py` representing one file's before/after content.
- **MigrationPlan**: The `MigrationPlan` model from `packages/migration_engine/models.py` returned by every Recipe.
- **GITHUB_DEMO_REPO_PATH**: An optional environment variable pointing to a locally cloned copy of the Demo_Repository.

---

## Requirements

---

### Requirement 1: Purpose-Built Next.js Demo Repository Structure

**User Story:** As a technical judge or investor watching a live demo, I want to see the pipeline operating against a real GitHub repository with recognisable Next.js patterns so that the demo is credible and easy to understand.

#### Acceptance Criteria

1. THE Demo_Repository SHALL contain the file `src/lib/fakepay-client.ts` implementing an HTTP client class that posts to the `/payment` endpoint with `currency` typed as an optional field.
2. THE Demo_Repository SHALL contain the file `src/lib/stripe-client.ts` implementing an HTTP client class that calls `stripe.charges.create()` and posts to the `/v1/charges` endpoint.
3. THE Demo_Repository SHALL contain the file `src/lib/config.ts` exporting base URL constants: `api.fakepay.dev/v1` for FakePay and `api.stripe.com/v1` for Stripe.
4. THE Demo_Repository SHALL contain the file `src/types/fakepay.ts` exporting a TypeScript interface `CreatePaymentRequest` where the `currency` field is declared as `currency?: string` (optional).
5. THE Demo_Repository SHALL contain the file `src/types/stripe.ts` exporting TypeScript interfaces `CreateChargeRequest` and `CreatePaymentIntentRequest`.
6. THE Demo_Repository SHALL contain the file `src/app/api/checkout/route.ts` implementing a Next.js API route that calls both `createPayment()` from the FakePay client and `createCharge()` from the Stripe client without providing an explicit `currency` argument to either call.
7. THE Demo_Repository SHALL contain the file `tests/checkout.test.ts` with Vitest unit tests that assert the HTTP client posts to `/payment` (FakePay legacy endpoint) and to `/v1/charges` (Stripe legacy endpoint).
8. THE Demo_Repository SHALL contain `package.json` listing `stripe` and `fakepay-sdk` as runtime dependencies and `vitest` as a dev dependency.
9. THE Demo_Repository SHALL contain `tsconfig.json` with a standard Next.js TypeScript compiler configuration.
10. THE Demo_Repository SHALL contain `README.md` explaining that the repository is intentionally in a pre-migration state and serves as a demo target for the Self-Maintaining API Agent.

---

### Requirement 2: Demo Repository Published to GitHub

**User Story:** As a presenter running a live demo, I want the demo repository to be publicly accessible on GitHub so that the audience can see the pipeline open a real GitHub Draft PR.

#### Acceptance Criteria

1. WHEN the demo repository is set up, THE Demo_Repository SHALL be pushed to `https://github.com/rizzzabh-06/fakepay-nextjs-demo` on the `main` branch.
2. THE Demo_Repository SHALL be in a state where no prior migration has been applied, so that the Pipeline has real breaking changes to detect and fix.

---

### Requirement 3: FakePay OpenAPI Fixture Verification

**User Story:** As a developer running the pipeline, I want the FakePay fixture specs to exactly match the transformations the FakePay recipe applies so that the pipeline produces correct patches end-to-end.

#### Acceptance Criteria

1. THE FakePay_Spec v1 file at `tests/fixtures/api-v1/fakepay.yaml` SHALL define a `POST /payment` endpoint with operationId `createPayment` and a `CreatePaymentRequest` schema where `currency` is NOT listed in the `required` array.
2. THE FakePay_Spec v2 file at `tests/fixtures/api-v2/fakepay.yaml` SHALL define a `POST /payments` endpoint (renamed from `/payment`) retaining operationId `createPayment` and a `CreatePaymentRequest` schema where `currency` IS listed in the `required` array.
3. WHEN `diff_specs()` is called with the FakePay v1 and v2 YAML documents, THE Diff_Engine SHALL return at least one `ENDPOINT_RENAMED` change for `POST /payment → POST /payments` and at least one `FIELD_REQUIRED` change for the `currency` field.
4. THE FakePay_Spec v1 and v2 files SHALL be valid OpenAPI 3.0.x documents parseable by a standard YAML loader without errors.

---

### Requirement 4: Stripe OpenAPI Spec Fixtures

**User Story:** As a developer demoing a second provider migration, I want Stripe v1 and v2 OpenAPI fixture files so that the pipeline can detect and migrate the Charges → PaymentIntents breaking change.

#### Acceptance Criteria

1. THE Stripe_Spec v1 file SHALL be created at `tests/fixtures/api-v1/stripe.yaml` and SHALL define a `POST /v1/charges` endpoint with operationId `createCharge` and a `ChargeRequest` schema where `amount` and `currency` are required fields.
2. THE Stripe_Spec v2 file SHALL be created at `tests/fixtures/api-v2/stripe.yaml` and SHALL define a `POST /v1/payment_intents` endpoint with operationId `createCharge` (same operationId, enabling rename detection) and a `PaymentIntentRequest` schema where `amount`, `currency`, and `payment_method` are all required fields, and `automatic_payment_methods` is also a required field.
3. WHEN `diff_specs()` is called with the Stripe v1 and v2 YAML documents, THE Diff_Engine SHALL return at least one `ENDPOINT_RENAMED` change for `POST /v1/charges → POST /v1/payment_intents` and at least one `FIELD_REQUIRED` change for `payment_method`.
4. THE Stripe_Spec v1 and v2 files SHALL be valid OpenAPI 3.0.x documents parseable by a standard YAML loader without errors.

---

### Requirement 5: Stripe Migration Recipe Implementation

**User Story:** As an engineer maintaining the pipeline, I want a deterministic Stripe recipe so that Stripe Charges → PaymentIntents migrations never require LLM fallback and always produce reproducible patches.

#### Acceptance Criteria

1. THE `StripeChargesToPaymentIntentsRecipe` class SHALL be implemented in `packages/migration_engine/recipes/stripe.py` and SHALL extend `MigrationRecipe` from `packages/migration_engine/recipes/base.py`.
2. THE `StripeChargesToPaymentIntentsRecipe` SHALL set the class attribute `provider` to `"stripe"` and the class attribute `name` to `"stripe_charges_to_payment_intents"`.
3. WHEN `can_handle()` is called with a provider value other than `"stripe"`, THE `StripeChargesToPaymentIntentsRecipe` SHALL return `False`.
4. WHEN `can_handle()` is called with provider `"stripe"` and a changes list containing an `ENDPOINT_RENAMED` change where `old_path` is `"/v1/charges"`, THE `StripeChargesToPaymentIntentsRecipe` SHALL return `True`.
5. WHEN `apply()` is called, THE `StripeChargesToPaymentIntentsRecipe` SHALL produce a `FilePatch` for `src/lib/stripe-client.ts` that replaces the `/v1/charges` endpoint reference with `/v1/payment_intents` and replaces the method name `createCharge` with `createPaymentIntent`.
6. WHEN `apply()` is called, THE `StripeChargesToPaymentIntentsRecipe` SHALL produce a `FilePatch` for `src/types/stripe.ts` that adds the `payment_method` field as required and adds `automatic_payment_methods` as a required field to the `CreatePaymentIntentRequest` interface.
7. WHEN `apply()` is called, THE `StripeChargesToPaymentIntentsRecipe` SHALL produce a `FilePatch` for `src/app/api/checkout/route.ts` that replaces the `createCharge()` call site with `createPaymentIntent()` and supplies `payment_method: 'pm_card_visa'` in the argument object.
8. WHEN `apply()` is called, THE `StripeChargesToPaymentIntentsRecipe` SHALL produce a `FilePatch` for `tests/checkout.test.ts` that updates test assertions from `/v1/charges` to `/v1/payment_intents` and adds the `payment_method` field to the expected call argument object.
9. THE `MigrationPlan` returned by `StripeChargesToPaymentIntentsRecipe.apply()` SHALL set `is_deterministic` to `True` and `confidence` to a value greater than or equal to `0.95`.
10. THE `StripeChargesToPaymentIntentsRecipe` source file SHALL use `from __future__ import annotations` as its first non-comment import and SHALL follow the same code style as `packages/migration_engine/recipes/fakepay.py`.

---

### Requirement 6: Recipe Registry Registration

**User Story:** As a developer triggering a Stripe migration, I want the pipeline planner to automatically select the Stripe recipe so that no manual configuration is needed.

#### Acceptance Criteria

1. THE `RECIPE_REGISTRY` list in `packages/migration_engine/planner.py` SHALL include `StripeChargesToPaymentIntentsRecipe` imported from `packages.migration_engine.recipes.stripe`.
2. WHEN `generate_migration_plan()` is called with provider `"stripe"` and changes matching the Stripe Charges → PaymentIntents breaking change, THE Pipeline SHALL execute `StripeChargesToPaymentIntentsRecipe.apply()` and SHALL NOT invoke any LLM provider.

---

### Requirement 7: Demo Repository Path Environment Variable

**User Story:** As a presenter running a live demo against the real GitHub repository, I want to point the pipeline at a locally cloned copy of the demo repo by setting a single environment variable so that I do not need to change any source code between demo runs.

#### Acceptance Criteria

1. WHEN the environment variable `GITHUB_DEMO_REPO_PATH` is set to a valid directory path, THE repositories API route SHALL use that path as the repository root for scan and migration operations instead of `tests/fixtures/demo-repository`.
2. WHEN the environment variable `GITHUB_DEMO_REPO_PATH` is not set or is empty, THE repositories API route SHALL fall back to `tests/fixtures/demo-repository` as the repository root.
3. WHEN the environment variable `GITHUB_DEMO_REPO_PATH` is not set or is empty, THE migrations API route SHALL fall back to `tests/fixtures/demo-repository` as the repository root.
4. WHEN the environment variable `GITHUB_DEMO_REPO_PATH` is set to a valid directory path, THE migrations API route SHALL use that path as the repository root for migration operations.
5. THE fallback behaviour described in criteria 2 and 3 SHALL preserve the existing behaviour such that all 88 existing pytest tests continue to pass without modification.

---

### Requirement 8: GitHub Repository Listing includes Demo Repository Entry

**User Story:** As a user of the web UI, I want to see `fakepay-nextjs-demo` listed in the available repositories so that I can connect and scan it in the demo flow.

#### Acceptance Criteria

1. THE `list_github_repositories` endpoint at `GET /api/repositories/github` SHALL include an entry for `fakepay-nextjs-demo` with `full_name` set to `"rizzzabh-06/fakepay-nextjs-demo"`, `language` set to `"TypeScript"`, and a non-empty `description` field.
2. WHEN `fakepay-nextjs-demo` has been connected via the `POST /api/repositories/connect` endpoint, THE `list_github_repositories` response SHALL return `is_connected: true` for the `fakepay-nextjs-demo` entry.
3. WHEN `fakepay-nextjs-demo` has not been connected, THE `list_github_repositories` response SHALL return `is_connected: false` for the `fakepay-nextjs-demo` entry.

---

### Requirement 9: Backward Compatibility with Existing Test Suite

**User Story:** As a developer merging this feature, I want all existing automated tests to keep passing so that the new functionality does not regress the working pipeline.

#### Acceptance Criteria

1. WHEN the test suite is executed with `GITHUB_DEMO_REPO_PATH` unset, THE test runner SHALL report zero failures across all 88 existing pytest test cases.
2. THE FakePay_Spec fixture files SHALL NOT be modified in any way that changes the output of `diff_specs()` for the existing FakePay v1 → v2 comparison.
3. THE `FakePayV1ToV2Recipe` class and its file SHALL NOT be modified.
4. THE `Sandbox` verification logic in `packages/validation/sandbox.py` SHALL NOT be modified except to support the Demo_Repository's file layout if the file paths in the Demo_Repository exactly mirror those expected by the existing contract verification methods.

---

### Requirement 10: OpenAPI Spec Round-Trip Integrity

**User Story:** As a developer verifying fixture correctness, I want to confirm that loading and re-serialising each YAML fixture produces an equivalent document so that YAML formatting issues do not cause silent test failures.

#### Acceptance Criteria

1. FOR ALL four YAML fixture files (`api-v1/fakepay.yaml`, `api-v2/fakepay.yaml`, `api-v1/stripe.yaml`, `api-v2/stripe.yaml`), loading the file with `yaml.safe_load()` and then serialising with `yaml.dump()` and loading again SHALL produce a dictionary equal to the first load result (round-trip property).
2. THE four YAML fixture files SHALL each declare `openapi: "3.0.3"` or `openapi: "3.0.x"` as their first key-value pair.
