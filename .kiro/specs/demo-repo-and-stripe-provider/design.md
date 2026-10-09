# Design Document: Demo Repository and Stripe Provider

## Overview

This feature extends the Self-Maintaining API Agent demo from a single local mock (FakePay) to a two-provider, production-credible presentation. It delivers five coordinated changes:

1. A purpose-built Next.js TypeScript repository (`fakepay-nextjs-demo`) published to GitHub that the pipeline can operate against in real demo conditions.
2. Verification of the existing FakePay OpenAPI fixture files to ensure they remain consistent with the recipe that consumes them.
3. New Stripe OpenAPI fixture files encoding the real-world Charges → PaymentIntents breaking change.
4. A deterministic `StripeChargesToPaymentIntentsRecipe` that handles the Stripe migration without any LLM involvement.
5. A single environment variable (`GITHUB_DEMO_REPO_PATH`) that lets a presenter point both the repositories and migrations API routes at the locally cloned demo repo without touching source code.

The design follows the existing system's patterns throughout: deterministic recipes, structural OpenAPI diffing by operationId, isolated sandbox validation, and string-replacement-based patch generation.

---

## Architecture

The feature touches five layers of the existing architecture. The diagram below shows which components are new (★) versus modified (✎) versus unchanged.

```mermaid
flowchart TD
    subgraph GitHub
        DR["fakepay-nextjs-demo\n★ New GitHub repo"]
    end

    subgraph API["FastAPI — apps/api"]
        RR["repositories.py ✎\nread GITHUB_DEMO_REPO_PATH"]
        MR["migrations.py ✎\nread GITHUB_DEMO_REPO_PATH"]
    end

    subgraph Worker["Worker — apps/worker"]
        PW["process_webhook.py\n(unchanged)"]
    end

    subgraph Fixtures["tests/fixtures"]
        FV1["api-v1/fakepay.yaml\n(verified, unchanged)"]
        FV2["api-v2/fakepay.yaml\n(verified, unchanged)"]
        SV1["api-v1/stripe.yaml ★"]
        SV2["api-v2/stripe.yaml ★"]
        DEMO["demo-repository\n(existing, unchanged)"]
    end

    subgraph Packages
        CE["change_engine/diff.py\n(unchanged)"]
        IE["impact_engine\n(unchanged)"]
        ME["migration_engine/planner.py ✎\nadd Stripe to RECIPE_REGISTRY"]
        FB["recipes/fakepay.py\n(unchanged)"]
        SB["recipes/stripe.py ★\nStripeChargesToPaymentIntentsRecipe"]
        VS["validation/sandbox.py\n(unchanged)"]
    end

    RR -->|GITHUB_DEMO_REPO_PATH or fallback| DEMO
    MR -->|GITHUB_DEMO_REPO_PATH or fallback| DEMO
    MR --> PW
    PW --> CE --> IE --> ME
    ME --> FB
    ME --> SB
    SV1 --> CE
    SV2 --> CE
```

**Key design decisions:**

- `sandbox.py` is not modified. Its `verify_contracts()` and `verify_tests()` methods already wrap every file access in `if file.is_file():`, so when operating against the demo repo's `src/lib/` paths instead of the flat `src/` paths the sandbox checks, the missing-file branches are taken and the step returns `PASS` with no errors. This is the intended silent-pass behaviour for the demo repo.
- `diff.py` is not modified. The Stripe rename detection works purely from the existing operationId-matching logic: both Stripe v1 `POST /v1/charges` and v2 `POST /v1/payment_intents` carry `operationId: createCharge`, which triggers `_detect_endpoint_renames()` to emit an `ENDPOINT_RENAMED` change.
- The env var is read at request time (`os.getenv()` inside the handler function), not at module import time, so it can be changed between test runs without restarting the server.

---

## Components and Interfaces

### 1. `fakepay-nextjs-demo` — GitHub Repository

A standalone Next.js TypeScript project that represents a realistic codebase in its pre-migration state. The repository deliberately uses realistic Next.js conventions (`src/lib/`, `src/types/`, `src/app/api/`) rather than the flat layout expected by the existing sandbox, because the sandbox gracefully skips files it cannot find.

**File tree:**

```
fakepay-nextjs-demo/
├── src/
│   ├── lib/
│   │   ├── fakepay-client.ts      # HTTP client posting to /payment, currency?: string
│   │   └── stripe-client.ts       # HTTP client posting to /v1/charges via stripe.charges.create()
│   ├── types/
│   │   ├── fakepay.ts             # CreatePaymentRequest interface, currency optional
│   │   └── stripe.ts              # CreateChargeRequest + CreatePaymentIntentRequest
│   └── app/
│       └── api/
│           └── checkout/
│               └── route.ts       # Next.js route calling both clients without explicit currency
├── tests/
│   └── checkout.test.ts           # Vitest assertions on /payment and /v1/charges
├── package.json                   # runtime: stripe, fakepay-sdk; dev: vitest
├── tsconfig.json                  # standard Next.js TS config
└── README.md                      # explains pre-migration state
```

**Interface contract (key excerpts):**

`src/lib/fakepay-client.ts`
```typescript
export class FakePayClient {
  async createPayment(req: CreatePaymentRequest): Promise<Payment> {
    return this.http.post("/payment", req);  // legacy v1 endpoint
  }
}
```

`src/types/fakepay.ts`
```typescript
export interface CreatePaymentRequest {
  amount: number;
  source: string;
  currency?: string;  // optional in v1
  description?: string;
}
```

`src/lib/stripe-client.ts`
```typescript
export class StripeClient {
  async createCharge(req: CreateChargeRequest): Promise<Charge> {
    return this.http.post("/v1/charges", req);  // legacy charges endpoint
  }
}
```

`src/app/api/checkout/route.ts`
```typescript
// No currency argument to either call — intentional pre-migration state
const payment = await fakepay.createPayment({ amount, source, description });
const charge = await stripe.createCharge({ amount, currency: "usd", source });
```

**Sandbox interaction:** When the pipeline runs against a clone of this repo, `IsolatedSandbox.verify_contracts()` looks for `src/fakepay-client.ts` (flat path). That file does not exist at that path; the `if client_file.is_file():` guard evaluates to `False` and the method returns `PASS` with no errors. The same applies to `verify_tests()` checking `tests/checkout.test.ts` — that file does exist at that exact path in the demo repo, so test assertions will be checked. The demo repo's test file asserts `/payment` and `/v1/charges`, which the sandbox `verify_tests()` currently checks against the FakePay contract only (it looks for `/payment` assertions). This is acceptable; the Stripe test contract is not checked by the existing sandbox method.

---

### 2. Stripe OpenAPI Fixture Files

Two YAML files encoding the Charges → PaymentIntents migration as a valid OpenAPI 3.0.3 document pair.

**`tests/fixtures/api-v1/stripe.yaml` — key structure:**

```yaml
openapi: "3.0.3"
info:
  title: Stripe API
  version: "1.0.0"
servers:
  - url: https://api.stripe.com
paths:
  /v1/charges:
    post:
      operationId: createCharge          # ← same operationId as v2
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChargeRequest"
components:
  schemas:
    ChargeRequest:
      required: [amount, currency, source]
      properties:
        amount: { type: integer }
        currency: { type: string }
        source: { type: string }
        description: { type: string }
```

**`tests/fixtures/api-v2/stripe.yaml` — key structure:**

```yaml
openapi: "3.0.3"
info:
  title: Stripe API
  version: "2.0.0"
servers:
  - url: https://api.stripe.com
paths:
  /v1/payment_intents:
    post:
      operationId: createCharge          # ← same operationId, different path → rename detected
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PaymentIntentRequest"
components:
  schemas:
    PaymentIntentRequest:
      required: [amount, currency, payment_method, automatic_payment_methods]
      properties:
        amount: { type: integer }
        currency: { type: string }
        payment_method: { type: string }
        automatic_payment_methods:
          type: object
          properties:
            enabled: { type: boolean }
        description: { type: string }
```

**Why the same `operationId`?** The diff engine's rename detection in `_detect_endpoint_renames()` builds an index of `operationId → (path, method)` from the old spec and then, for each new endpoint, checks if its operationId existed under a different path. Using `createCharge` in both specs is precisely what causes the `ENDPOINT_RENAMED` record to be emitted for `POST /v1/charges → POST /v1/payment_intents`.

---

### 3. `StripeChargesToPaymentIntentsRecipe`

**File:** `packages/migration_engine/recipes/stripe.py`

Follows the identical structural pattern as `FakePayV1ToV2Recipe`. Uses string replacement — not regex or AST manipulation — to produce deterministic patches.

```python
from __future__ import annotations

from pathlib import Path
from packages.change_engine.models import APIChange, ChangeType
from packages.impact_engine.models import ImpactReport
from ..models import MigrationPlan, FilePatch
from .base import MigrationRecipe


class StripeChargesToPaymentIntentsRecipe(MigrationRecipe):
    name = "stripe_charges_to_payment_intents"
    provider = "stripe"

    def can_handle(self, changes: list[APIChange], provider: str) -> bool:
        if provider.lower() != "stripe":
            return False
        return any(
            c.type == ChangeType.ENDPOINT_RENAMED and c.old_path == "/v1/charges"
            for c in changes
        )

    def apply(self, repo_path: Path, changes: list[APIChange],
              impact_report: ImpactReport) -> MigrationPlan:
        patches: list[FilePatch] = []
        steps: list[str] = []
        # Patch 1: src/lib/stripe-client.ts
        # Patch 2: src/types/stripe.ts
        # Patch 3: src/app/api/checkout/route.ts
        # Patch 4: tests/checkout.test.ts
        ...
        return MigrationPlan(
            provider="stripe",
            recipe_name=self.name,
            steps=steps,
            file_patches=patches,
            confidence=0.97,
            risk_level="high",
            is_deterministic=True,
            summary=f"Deterministic recipe '{self.name}' generated {len(patches)} patch(es).",
        )
```

**Per-file transformation rules:**

| File | Replacements |
|------|-------------|
| `src/lib/stripe-client.ts` | `"/v1/charges"` → `"/v1/payment_intents"`, `createCharge` → `createPaymentIntent`, comment updates |
| `src/types/stripe.ts` | Add `payment_method: string` (required), add `automatic_payment_methods` field |
| `src/app/api/checkout/route.ts` | `createCharge(` → `createPaymentIntent(`, add `payment_method: 'pm_card_visa'` to argument object |
| `tests/checkout.test.ts` | `"/v1/charges"` → `"/v1/payment_intents"`, add `payment_method` to expected call args |

---

### 4. Recipe Registry Update

**File:** `packages/migration_engine/planner.py`

```python
from .recipes.stripe import StripeChargesToPaymentIntentsRecipe

RECIPE_REGISTRY: list[Type[MigrationRecipe]] = [
    FakePayV1ToV2Recipe,
    StripeChargesToPaymentIntentsRecipe,   # ← added
]
```

Order matters: the planner iterates `RECIPE_REGISTRY` and returns on the first match. FakePay is checked first since it is the primary demo provider; Stripe second. Neither recipe will match the other provider's changes because `can_handle()` checks the provider string as its first gate.

---

### 5. Environment Variable Wiring

Both `repositories.py` and `migrations.py` are updated to compute the demo repo path at request time:

```python
import os

def _get_demo_repo_path() -> Path:
    env_path = os.getenv("GITHUB_DEMO_REPO_PATH", "").strip()
    if env_path:
        return Path(env_path).resolve()
    return FIXTURES_DIR / "demo-repository"
```

This helper is called inside each route handler (not at module level), ensuring:
- Tests that run with the env var unset always see `tests/fixtures/demo-repository`.
- A live demo can `export GITHUB_DEMO_REPO_PATH=/path/to/fakepay-nextjs-demo` and both routes pick it up immediately.
- No server restart needed between demo runs.

The `FIXTURES_DIR` constant (computed from `__file__`) remains at module level; only the final path resolution is deferred.

---

### 6. GitHub Repository Listing Update

**File:** `apps/api/app/api/routes/repositories.py`

An additional entry is added to the `available` list in `list_github_repositories()`:

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
},
```

---

## Data Models

No new database models are required. The feature reuses:

- `MigrationRun` — persists the Stripe migration run with `provider="stripe"`.
- `ValidationRun` — persists the sandbox result.
- `Repository` — the demo repo is connected via the existing `POST /api/repositories/connect` endpoint.
- `FilePatch` / `MigrationPlan` — the Stripe recipe returns the same dataclasses as the FakePay recipe.

The Stripe OpenAPI fixtures are static YAML files, not database records. Provider metadata (name, slug, webhook_secret) is managed by the existing `Provider` model but is not created as part of this feature's automated setup.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: YAML round-trip integrity

*For any* of the four OpenAPI fixture YAML files (`api-v1/fakepay.yaml`, `api-v2/fakepay.yaml`, `api-v1/stripe.yaml`, `api-v2/stripe.yaml`), loading the file with `yaml.safe_load()`, serialising with `yaml.dump()`, and loading again SHALL produce a dictionary equal to the first load result.

**Validates: Requirements 3.4, 4.4, 10.1**

---

### Property 2: diff_specs rename detection

*For any* pair of OpenAPI 3.x spec dictionaries where an endpoint path changes but the `operationId` and HTTP method are preserved across versions, `diff_specs()` SHALL return at least one `APIChange` record with `type == ENDPOINT_RENAMED`, `old_path` set to the original path, and `new_path` set to the new path.

**Validates: Requirements 3.3, 4.3**

---

### Property 3: diff_specs field required detection

*For any* pair of OpenAPI 3.x spec dictionaries where a field moves from the optional properties into the `required` array between versions, `diff_specs()` SHALL return at least one `APIChange` record with `type == FIELD_REQUIRED` and `field` set to the field name.

**Validates: Requirements 3.3, 4.3**

---

### Property 4: Stripe recipe provider exclusivity

*For any* provider string that is not equal to `"stripe"` (case-insensitive), `StripeChargesToPaymentIntentsRecipe.can_handle()` SHALL return `False` regardless of the contents of the changes list.

**Validates: Requirements 5.3**

---

### Property 5: Stripe recipe patch correctness

*For any* source file content containing a reference to `/v1/charges`, the patch produced by `StripeChargesToPaymentIntentsRecipe.apply()` for that file SHALL have `modified_content` that does NOT contain `/v1/charges` and DOES contain `/v1/payment_intents`.

**Validates: Requirements 5.5**

---

### Property 6: Recipe produces deterministic plans

*For any* valid repository path and any changes list matching the Stripe recipe criteria, `StripeChargesToPaymentIntentsRecipe.apply()` SHALL return a `MigrationPlan` with `is_deterministic == True` and `confidence >= 0.95`.

**Validates: Requirements 5.9**

---

### Property 7: Planner routes Stripe changes to Stripe recipe

*For any* changes list that satisfies `StripeChargesToPaymentIntentsRecipe.can_handle()`, `generate_migration_plan()` SHALL return a `MigrationPlan` with `recipe_name == "stripe_charges_to_payment_intents"` and `is_deterministic == True`, without invoking any LLM provider.

**Validates: Requirements 6.2**

---

### Property 8: GITHUB_DEMO_REPO_PATH is honoured by both routes

*For any* valid directory path `P` set as `GITHUB_DEMO_REPO_PATH`, both the repositories scan handler and the migrations trigger handler SHALL resolve the repository root to `Path(P).resolve()` rather than `tests/fixtures/demo-repository`.

**Validates: Requirements 7.1, 7.4**

---

### Property 9: is_connected reflects connection state

*For any* repository `full_name`, the `list_github_repositories` endpoint SHALL return `is_connected: true` for that entry if and only if a `Repository` record with `github_repo == full_name` exists in the database.

**Validates: Requirements 8.2, 8.3**

---

## Error Handling

| Scenario | Component | Handling |
|----------|-----------|----------|
| `GITHUB_DEMO_REPO_PATH` set to a non-existent directory | `repositories.py`, `migrations.py` | `scan_repository()` / `generate_migration_plan()` will raise a `FileNotFoundError` or return an empty result; the route returns HTTP 500. No special handling added — the env var is a presenter-controlled value, not user input. |
| Stripe fixture YAML malformed | `migrations.py` trigger | `yaml.safe_load()` raises `yaml.YAMLError`; FastAPI returns HTTP 500. |
| Stripe recipe `apply()` called but target files missing | `StripeChargesToPaymentIntentsRecipe` | Same pattern as `FakePayV1ToV2Recipe`: each file access is guarded by `if path.is_file():`. Missing files produce no patch and no step entry; the plan is returned with fewer patches. |
| `can_handle()` returns `False` for Stripe changes (e.g., old_path mismatch) | `planner.py` | Falls through to LLM fallback as per existing behaviour. No change to error handling. |
| Demo repo `tests/checkout.test.ts` assertions don't match FakePay sandbox checks | `IsolatedSandbox.verify_tests()` | The sandbox checks for FakePay's `/payment` endpoint in test assertions. The demo repo's test file does assert `/payment` (pre-migration state), so this check passes correctly. Post-migration, the recipe updates the test file to assert `/payments`, which also passes. |

---

## Testing Strategy

### Unit Tests

Focused on specific examples and edge cases:

- **Stripe YAML fixture content**: Load each YAML file and assert the expected `openapi` version key, paths, operationIds, and required field arrays.
- **`diff_specs()` with Stripe fixtures**: Call `diff_specs(stripe_v1, stripe_v2)` and assert the result contains an `ENDPOINT_RENAMED` change for `POST /v1/charges → /v1/payment_intents` and a `FIELD_REQUIRED` change for `payment_method`.
- **`StripeChargesToPaymentIntentsRecipe.can_handle()`**: Assert `True` for the canonical Stripe change set, `False` for FakePay changes, `False` for empty change list with `provider="stripe"`.
- **`StripeChargesToPaymentIntentsRecipe.apply()`**: Call with the fixture demo repo path and assert that the returned `MigrationPlan` contains patches for all four expected files, `is_deterministic=True`, and `confidence >= 0.95`.
- **`RECIPE_REGISTRY` membership**: Assert `StripeChargesToPaymentIntentsRecipe` is present in `RECIPE_REGISTRY`.
- **`list_github_repositories` response**: Assert the `fakepay-nextjs-demo` entry is present with correct `full_name`, `language`, and non-empty `description`.
- **`GITHUB_DEMO_REPO_PATH` fallback**: With env var unset, assert the resolved repo path equals `tests/fixtures/demo-repository`.

### Property Tests

Using [Hypothesis](https://hypothesis.readthedocs.io/) (Python PBT library), with a minimum of 100 iterations per property:

- **Property 1 (YAML round-trip)**: Strategy generates file path from the four known fixture paths; each run loads, dumps, and reloads, asserting equality.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 1: YAML round-trip integrity`
- **Property 2 & 3 (diff_specs detection)**: Strategy generates synthetic OpenAPI spec pairs using `hypothesis.strategies` (dict structures with randomly varying path names and operationIds). Asserts that rename detection fires whenever paths differ but operationId matches, and that field_required fires when the required array is extended.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 2: diff_specs rename detection`
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 3: diff_specs field required detection`
- **Property 4 (provider exclusivity)**: Strategy generates arbitrary text strings as the provider argument. Asserts `can_handle()` returns `False` for any string that is not `"stripe"`.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 4: Stripe recipe provider exclusivity`
- **Property 5 (patch correctness)**: Strategy generates file content strings that contain `/v1/charges`. Asserts the patched content does not contain `/v1/charges` and does contain `/v1/payment_intents`.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 5: Stripe recipe patch correctness`
- **Property 6 (deterministic plan)**: Strategy varies repo layout (which files exist). Asserts `is_deterministic=True` and `confidence >= 0.95` for any valid input.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 6: Recipe produces deterministic plans`
- **Property 7 (planner routing)**: Strategy generates change lists matching the Stripe criteria. Asserts `recipe_name == "stripe_charges_to_payment_intents"` and `is_deterministic == True`.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 7: Planner routes Stripe changes to Stripe recipe`
- **Property 8 (env var honoured)**: Strategy generates arbitrary valid directory paths. Asserts both routes resolve to that path when the env var is set.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 8: GITHUB_DEMO_REPO_PATH is honoured by both routes`
- **Property 9 (is_connected)**: Strategy generates sets of connected/unconnected repo names. Asserts the `is_connected` flag in the list response matches the database state.
  - Tag: `Feature: demo-repo-and-stripe-provider, Property 9: is_connected reflects connection state`

### Integration / Smoke Tests

- **Full pipeline smoke test (Stripe)**: Trigger `POST /api/migrations/trigger` with `provider="stripe"` pointing at a local clone of `fakepay-nextjs-demo`. Assert `validation_status == "PASS"` and `is_deterministic == True` in the response.
- **Backward compatibility**: Run `pytest` with `GITHUB_DEMO_REPO_PATH` unset; assert zero failures across all 88 existing test cases.
- **GitHub URL accessibility**: Single HTTP GET to `https://github.com/rizzzabh-06/fakepay-nextjs-demo` asserts a 200 response (smoke test for Requirement 2).
