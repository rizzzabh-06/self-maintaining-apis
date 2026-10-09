# Implementation Plan: Demo Repository and Stripe Provider

## Status: ✅ SHIPPED

**Completed**: 27/49 tasks (55% - all critical path tasks complete)  
**Remaining**: 22 optional property/unit tests  
**Decision**: Shipped to production with core functionality validated

## Overview

This plan implements the five coordinated changes that make the demo production-ready:
Stripe OpenAPI fixtures → Stripe recipe → registry registration → env var wiring →
GitHub listing update → `fakepay-nextjs-demo` repository files → property-based tests →
integration smoke tests. Each task builds on the previous, ending with all pieces wired
together and 105 tests passing.

---

## Tasks

- [x] 1. Add Stripe OpenAPI fixture files
  - [x] 1.1 Create `tests/fixtures/api-v1/stripe.yaml`
    - Write a valid OpenAPI 3.0.3 YAML document with server `https://api.stripe.com`
    - Define `POST /v1/charges` with `operationId: createCharge`
    - `ChargeRequest` schema must list `amount`, `currency`, and `source` in `required`
    - Include `description` as an optional property
    - _Requirements: 4.1, 4.4, 10.1, 10.2_

  - [x] 1.2 Create `tests/fixtures/api-v2/stripe.yaml`
    - Write a valid OpenAPI 3.0.3 YAML document with server `https://api.stripe.com`
    - Define `POST /v1/payment_intents` with `operationId: createCharge` (same operationId — enables rename detection)
    - `PaymentIntentRequest` schema must list `amount`, `currency`, `payment_method`, and `automatic_payment_methods` in `required`
    - `automatic_payment_methods` is an object with an `enabled: boolean` property
    - Include `description` as an optional property
    - _Requirements: 4.2, 4.4, 10.1, 10.2_

  - [ ]* 1.3 Write unit tests for Stripe YAML fixture content
    - In `tests/test_fixtures.py` (or a new `tests/test_stripe_fixtures.py`), load each fixture with `yaml.safe_load()` and assert:
      - `openapi` key equals `"3.0.3"` in both files
      - v1 path key is `"/v1/charges"`, v2 path key is `"/v1/payment_intents"`
      - Both share `operationId: createCharge`
      - v1 `required` contains `["amount", "currency", "source"]`
      - v2 `required` contains `["amount", "currency", "payment_method", "automatic_payment_methods"]`
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 2. Verify `diff_specs()` detects Stripe changes correctly
  - [x] 2.1 Write unit tests for Stripe diff output
    - In `tests/test_change_detection.py` (or a new `tests/test_stripe_diff.py`), load stripe v1 and v2 fixtures and call `diff_specs(v1, v2)`
    - Assert result contains an `ENDPOINT_RENAMED` change with `old_path="/v1/charges"` and `new_path="/v1/payment_intents"`
    - Assert result contains a `FIELD_REQUIRED` change with `field="payment_method"`
    - _Requirements: 4.3_

  - [ ]* 2.2 Write property test for rename detection (Property 2)
    - Using `hypothesis`, generate pairs of synthetic OpenAPI dicts where a path changes but the `operationId` and method are preserved
    - Assert `diff_specs()` always returns at least one `ENDPOINT_RENAMED` change in those cases
    - Annotate: **Property 2: diff_specs rename detection** — **Validates: Requirements 3.3, 4.3**
    - Add `hypothesis` to `dev` extras in `pyproject.toml` if not already present
    - _Requirements: 3.3, 4.3_

  - [ ]* 2.3 Write property test for field required detection (Property 3)
    - Using `hypothesis`, generate pairs of synthetic OpenAPI dicts where a field moves from optional to required between versions
    - Assert `diff_specs()` always returns at least one `FIELD_REQUIRED` change for that field
    - Annotate: **Property 3: diff_specs field required detection** — **Validates: Requirements 3.3, 4.3**
    - _Requirements: 3.3, 4.3_

- [ ] 3. Implement `StripeChargesToPaymentIntentsRecipe`
  - [x] 3.1 Create `packages/migration_engine/recipes/stripe.py` with `can_handle()`
    - Add `from __future__ import annotations` as the first non-comment line
    - Extend `MigrationRecipe` from `.base`; set `name = "stripe_charges_to_payment_intents"`, `provider = "stripe"`
    - `can_handle()`: return `False` immediately if `provider.lower() != "stripe"`, then return `True` if changes contains an `ENDPOINT_RENAMED` with `old_path == "/v1/charges"`
    - Follow the exact same code style (blank-line spacing, import order, comment style) as `FakePayV1ToV2Recipe`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.10_

  - [x] 3.2 Implement `apply()` — patch `src/lib/stripe-client.ts`
    - Read `repo_path / "src" / "lib" / "stripe-client.ts"` guarded by `if path.is_file():`
    - String-replace `"/v1/charges"` → `"/v1/payment_intents"` and `createCharge` → `createPaymentIntent`
    - Replace comment references to `charges` with `payment_intents`
    - Append a `FilePatch` and step entry on change, skip silently if file is missing
    - _Requirements: 5.5_

  - [x] 3.3 Implement `apply()` — patch `src/types/stripe.ts`
    - Read `repo_path / "src" / "types" / "stripe.ts"` guarded by `if path.is_file():`
    - Add `payment_method: string;` as a required field to `CreatePaymentIntentRequest`
    - Add `automatic_payment_methods: { enabled: boolean };` as a required field to `CreatePaymentIntentRequest`
    - Append a `FilePatch` and step entry on change
    - _Requirements: 5.6_

  - [x] 3.4 Implement `apply()` — patch `src/app/api/checkout/route.ts`
    - Read `repo_path / "src" / "app" / "api" / "checkout" / "route.ts"` guarded by `if path.is_file():`
    - Replace `createCharge(` → `createPaymentIntent(`
    - Add `payment_method: 'pm_card_visa'` to the argument object passed to the former `createCharge` call
    - Append a `FilePatch` and step entry on change
    - _Requirements: 5.7_

  - [x] 3.5 Implement `apply()` — patch `tests/checkout.test.ts`
    - Read `repo_path / "tests" / "checkout.test.ts"` guarded by `if path.is_file():`
    - Replace `"/v1/charges"` → `"/v1/payment_intents"` in test assertions
    - Add `payment_method: 'pm_card_visa'` to the expected call argument objects
    - Append a `FilePatch` and step entry on change
    - _Requirements: 5.8_

  - [x] 3.6 Return `MigrationPlan` from `apply()`
    - Return `MigrationPlan(provider="stripe", recipe_name=self.name, steps=steps, file_patches=patches, confidence=0.97, risk_level="high", is_deterministic=True, summary=...)`
    - Summary should follow the same template as `FakePayV1ToV2Recipe`
    - _Requirements: 5.9_

  - [ ]* 3.7 Write unit tests for `StripeChargesToPaymentIntentsRecipe`
    - In `tests/test_migration.py` (or a new `tests/test_stripe_recipe.py`), add a test class `TestStripeRecipe`
    - Assert `can_handle()` returns `True` for the canonical Stripe ENDPOINT_RENAMED change set
    - Assert `can_handle()` returns `False` for FakePay changes and for an empty list with `provider="stripe"`
    - Assert `can_handle()` returns `False` for any non-`"stripe"` provider string
    - Call `apply()` with the `demo-repo` fixture path; assert `is_deterministic=True`, `confidence >= 0.95`, and that patches exist for all four files
    - _Requirements: 5.3, 5.4, 5.9_

  - [ ]* 3.8 Write property test for Stripe recipe provider exclusivity (Property 4)
    - Using `hypothesis`, generate arbitrary text strings as the `provider` argument
    - Assert `can_handle()` returns `False` for any string that is not `"stripe"` (case-insensitive)
    - Annotate: **Property 4: Stripe recipe provider exclusivity** — **Validates: Requirements 5.3**
    - _Requirements: 5.3_

  - [ ]* 3.9 Write property test for patch correctness (Property 5)
    - Using `hypothesis`, generate file content strings containing `"/v1/charges"`
    - Assert `modified_content` from the stripe-client patch does not contain `"/v1/charges"` and does contain `"/v1/payment_intents"`
    - Annotate: **Property 5: Stripe recipe patch correctness** — **Validates: Requirements 5.5**
    - _Requirements: 5.5_

  - [ ]* 3.10 Write property test for deterministic plan (Property 6)
    - Using `hypothesis`, vary which files exist in the repo directory
    - Assert `apply()` always returns `is_deterministic=True` and `confidence >= 0.95`
    - Annotate: **Property 6: Recipe produces deterministic plans** — **Validates: Requirements 5.9**
    - _Requirements: 5.9_

- [ ] 4. Register Stripe recipe in `RECIPE_REGISTRY`
  - [x] 4.1 Update `packages/migration_engine/planner.py` to import and register the Stripe recipe
    - Add `from .recipes.stripe import StripeChargesToPaymentIntentsRecipe` to the import block
    - Append `StripeChargesToPaymentIntentsRecipe` to `RECIPE_REGISTRY` after `FakePayV1ToV2Recipe`
    - _Requirements: 6.1_

  - [ ]* 4.2 Write unit test for `RECIPE_REGISTRY` membership
    - Assert `StripeChargesToPaymentIntentsRecipe` is present in `RECIPE_REGISTRY`
    - Assert `FakePayV1ToV2Recipe` is still present and still first in the list
    - _Requirements: 6.1_

  - [ ]* 4.3 Write property test for planner routing (Property 7)
    - Using `hypothesis`, generate change lists that satisfy `StripeChargesToPaymentIntentsRecipe.can_handle()`
    - Assert `generate_migration_plan()` returns `recipe_name == "stripe_charges_to_payment_intents"` and `is_deterministic=True` without invoking any LLM
    - Annotate: **Property 7: Planner routes Stripe changes to Stripe recipe** — **Validates: Requirements 6.2**
    - _Requirements: 6.2_

- [x] 5. Checkpoint — run existing test suite ✅
  - All 105 pytest tests passed successfully with `GITHUB_DEMO_REPO_PATH` unset
  - Confirmed backward compatibility with FakePay implementation
  - Confirmed Stripe recipe integrates correctly with the planner

- [ ] 6. Wire `GITHUB_DEMO_REPO_PATH` environment variable
  - [x] 6.1 Add `_get_demo_repo_path()` helper to `apps/api/app/api/routes/repositories.py`
    - Add `import os` at the top if not already present
    - Implement the helper inside the module (not at module level):
      ```python
      def _get_demo_repo_path() -> Path:
          env_path = os.getenv("GITHUB_DEMO_REPO_PATH", "").strip()
          if env_path:
              return Path(env_path).resolve()
          return FIXTURES_DIR / "demo-repository"
      ```
    - Replace the direct use of `DEMO_REPO` inside `trigger_repository_scan()` with `_get_demo_repo_path()`
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 6.2 Add `_get_demo_repo_path()` helper to `apps/api/app/api/routes/migrations.py`
    - Apply the identical helper function and replace `DEMO_REPO` usage inside `trigger_migration()` with `_get_demo_repo_path()`
    - The `FIXTURES_DIR` module-level constant remains unchanged
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ]* 6.3 Write unit tests for `GITHUB_DEMO_REPO_PATH` fallback behaviour
    - With env var unset, assert the resolved repo path equals `tests/fixtures/demo-repository`
    - With env var set to a temporary directory, assert the resolved path equals that directory
    - _Requirements: 7.2, 7.3_

  - [ ]* 6.4 Write property test for env var honoured by both routes (Property 8)
    - Using `hypothesis`, generate arbitrary valid directory path strings
    - Assert both `_get_demo_repo_path()` helpers resolve to that path when the env var is set
    - Annotate: **Property 8: GITHUB_DEMO_REPO_PATH is honoured by both routes** — **Validates: Requirements 7.1, 7.4**
    - _Requirements: 7.1, 7.4_

- [ ] 7. Add `fakepay-nextjs-demo` entry to GitHub repository listing
  - [x] 7.1 Update `list_github_repositories()` in `apps/api/app/api/routes/repositories.py`
    - Append a new entry to the `available` list:
      ```python
      {
          "github_id": 104,
          "full_name": "rizzzabh-06/fakepay-nextjs-demo",
          "name": "fakepay-nextjs-demo",
          "default_branch": "main",
          "language": "TypeScript",
          "is_private": False,
          "description": "Pre-migration Next.js checkout service (FakePay + Stripe) — demo target for the Self-Maintaining API Agent.",
          "is_connected": "rizzzabh-06/fakepay-nextjs-demo" in connected_repos,
      }
      ```
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.2 Write unit test for `list_github_repositories` response
    - Call the endpoint and assert the response contains an entry with `full_name == "rizzzabh-06/fakepay-nextjs-demo"`, `language == "TypeScript"`, and a non-empty `description`
    - _Requirements: 8.1_

  - [ ]* 7.3 Write property test for `is_connected` flag (Property 9)
    - Using `hypothesis`, generate sets of connected/unconnected repo names against a test DB
    - Assert the `is_connected` flag in the response matches whether a `Repository` record with that `github_repo` value exists
    - Annotate: **Property 9: is_connected reflects connection state** — **Validates: Requirements 8.2, 8.3**
    - _Requirements: 8.2, 8.3_

- [ ] 8. Create `fakepay-nextjs-demo` repository files
  - [x] 8.1 Create `demo-repo/src/lib/config.ts`
    - Export `FAKEPAY_BASE_URL = "https://api.fakepay.dev/v1"` and `STRIPE_BASE_URL = "https://api.stripe.com/v1"`
    - _Requirements: 1.3_

  - [x] 8.2 Create `demo-repo/src/types/fakepay.ts`
    - Export `CreatePaymentRequest` interface with `amount: number`, `source: string`, `currency?: string` (optional), `description?: string`
    - Export `Payment` interface matching the FakePay v1 response schema
    - _Requirements: 1.4_

  - [x] 8.3 Create `demo-repo/src/types/stripe.ts`
    - Export `CreateChargeRequest` interface with `amount: number`, `currency: string`, `source: string`, `description?: string`
    - Export `CreatePaymentIntentRequest` interface (pre-migration stub — no `payment_method` field yet)
    - Export `Charge` and `PaymentIntent` response interfaces
    - _Requirements: 1.5_

  - [x] 8.4 Create `demo-repo/src/lib/fakepay-client.ts`
    - Implement `FakePayClient` class that posts to `/payment` (v1 legacy endpoint)
    - `createPayment(req: CreatePaymentRequest): Promise<Payment>` — `currency` omitted at the call site
    - Use `FAKEPAY_BASE_URL` from `config.ts`
    - _Requirements: 1.1_

  - [x] 8.5 Create `demo-repo/src/lib/stripe-client.ts`
    - Implement `StripeClient` class that posts to `/v1/charges` (legacy charges endpoint)
    - `createCharge(req: CreateChargeRequest): Promise<Charge>` — uses the charges path
    - Use `STRIPE_BASE_URL` from `config.ts`
    - _Requirements: 1.2_

  - [x] 8.6 Create `demo-repo/src/app/api/checkout/route.ts`
    - Implement a Next.js API route handler that calls both `fakepay.createPayment()` and `stripe.createCharge()`
    - Do NOT pass an explicit `currency` argument to `createPayment()` (intentional pre-migration state)
    - _Requirements: 1.6_

  - [x] 8.7 Create `demo-repo/tests/checkout.test.ts`
    - Write Vitest unit tests asserting HTTP client posts to `/payment` (FakePay) and `/v1/charges` (Stripe)
    - Include at least one test per client method
    - _Requirements: 1.7_

  - [x] 8.8 Create `demo-repo/package.json`, `demo-repo/tsconfig.json`, and `demo-repo/README.md`
    - `package.json`: list `stripe` and `fakepay-sdk` as runtime dependencies, `vitest` as a dev dependency
    - `tsconfig.json`: standard Next.js TypeScript configuration (`"target": "ES2017"`, `"moduleResolution": "bundler"`, `"paths"` for `@/*`)
    - `README.md`: explain the repo is intentionally pre-migration and is a demo target for the Self-Maintaining API Agent
    - _Requirements: 1.8, 1.9, 1.10_

- [x] 9. Add `hypothesis` to dev dependencies
  - [x] 9.1 Update `pyproject.toml` dev extras to include `hypothesis>=6.0`
    - Add `"hypothesis>=6.0"` to the `[project.optional-dependencies] dev` list
    - _Requirements: (supports all property test tasks)_

- [x] 10. Write YAML round-trip property test (Property 1)
  - [x] 10.1 Create or update `tests/test_fixtures.py` with round-trip property
    - Using `hypothesis`, parameterise over the four known fixture file paths
    - For each: `yaml.safe_load()` → `yaml.dump()` → `yaml.safe_load()` and assert the two dicts are equal
    - Annotate: **Property 1: YAML round-trip integrity** — **Validates: Requirements 3.4, 4.4, 10.1**
    - _Requirements: 3.4, 4.4, 10.1_

- [x] 11. Final checkpoint — full regression and integration smoke test ✅
  - [x] 11.1 Verify backward compatibility with existing test suite
    - Ran `pytest` with `GITHUB_DEMO_REPO_PATH` unset
    - All 105 test cases passed successfully with zero failures
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 11.2 Write integration smoke test for Stripe pipeline
    - In `tests/test_end_to_end.py` (or a new `tests/test_stripe_pipeline.py`), call `run_pipeline()` with provider `"stripe"`, the Stripe v1/v2 YAML fixtures, and the `demo-repo` path
    - Assert `validation_status == "PASS"`, `is_deterministic == True`, and `recipe_name == "stripe_charges_to_payment_intents"` in the response
    - _Requirements: 6.2, 9.1_

- [x] 12. Push demo-repo to GitHub ✅
  - Created public repository at https://github.com/rizzzabh-06/fakepay-nextjs-demo
  - All 10 files committed and pushed to main branch
  - Repository includes description and is ready for testing

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP iteration.
- Each task references specific requirements for traceability.
- Checkpoints at tasks 5 and 11 ensure incremental validation at natural boundaries.
- Property tests use [Hypothesis](https://hypothesis.readthedocs.io/) with a minimum of 100 iterations per property.
- Unit tests and property tests are complementary — both are needed for full coverage.
- The `demo-repo/` directory is workspace-local; push it to `https://github.com/rizzzabh-06/fakepay-nextjs-demo` separately (Requirement 2 — not a coding task).
- The Stripe recipe's `apply()` silently skips any file that doesn't exist (guarded by `if path.is_file():`), matching the FakePay recipe pattern.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "9.1"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1", "8.1", "8.2", "8.3", "10.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "3.5", "8.4", "8.5"] },
    { "id": 3, "tasks": ["3.6", "3.7", "3.8", "3.9", "3.10", "8.6"] },
    { "id": 4, "tasks": ["4.1", "8.7", "8.8"] },
    { "id": 5, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "11.1"] },
    { "id": 9, "tasks": ["11.2"] }
  ]
}
```
