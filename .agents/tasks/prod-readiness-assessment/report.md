# Production-Readiness Assessment — Self-Maintaining APIs

**Branch:** `prod` (off `main` @ `72e5784`)
**Mode:** Read-only investigation. Nothing was modified.
**Scope:** `apps/api`, `apps/web/src`, `apps/worker`, `packages/`, `scripts/`, `tests/`. (`.repos/` is a cloned unrelated reference repo and `node_modules` were excluded as noise.)

---

## 1. Executive Summary

**Production-readiness score: 28 / 100.**

The project has real, well-structured engine logic (deterministic OpenAPI diffing, repository scanning, impact analysis, a genuine GitHub REST integration, a genuine Gemini integration, and a real SSE transport). The problem is not the engines — it is the wiring. Nearly every production code path is hardwired to the FakePay/demo fixtures, the safety-critical validation gate is a fake, there is no authentication, secrets are defaulted in code, and the dashboard fabricates metrics. As shipped, the system cannot process a real provider webhook against a real repository; it can only replay the FakePay demo.

### Top 5 blockers (P0)

1. **The validation gate is fake.** `packages/validation/sandbox.py` "build verification" counts braces/parens with `str.count("{") != str.count("}")` instead of running `tsc`; "contract" and "unit test" checks grep hardcoded strings in hardcoded FakePay demo files (`src/fakepay-client.ts`, `tests/checkout.test.ts`); `runner.py` hardcodes `lint_passed = True`. The headline safety invariant ("a PR is opened only on PASS") is therefore enforced on no-ops, so broken migrations pass and can open PRs.
2. **Production paths are hardwired to demo fixtures.** The webhook, migration, changes, and impact endpoints all load `tests/fixtures/api-v1/fakepay.yaml` + `tests/fixtures/demo-repository` regardless of input. There is no real spec fetching (the code even carries a `# live spec fetching TODO`). `impact.py` ignores its `provider` query param for spec loading.
3. **No authentication or authorization.** No endpoint checks a session. `/api/auth/session` returns the first row in the DB with hardcoded demo identity, the OAuth callback never issues a session cookie/JWT, and any caller can connect/disconnect repos, trigger migrations, or disconnect GitHub.
4. **Webhook signature verification is bypassable and secrets are defaulted in code.** GitHub webhooks skip HMAC verification entirely when `GITHUB_WEBHOOK_SECRET` is unset; the FakePay secret defaults to `"test_webhook_secret_key_123"` in both the webhook handler and the seeder. Simulated/`ghp_test_` tokens are accepted as real.
5. **Silent demo/SQLite fallbacks + fabricated analytics.** `session.py` silently falls back to a local SQLite file if `DATABASE_URL` is missing; repository cloning silently falls back to the demo repo on any error; the GitHub PR path silently falls back to a fake `pull/101` URL on any API failure; `analytics.py` fabricates a 95% success rate, confidence, repo counts, and a trend curve when the DB is empty.

---

## 2. Findings by Category

Severity legend: **CRITICAL** (security/safety or makes the product non-functional for its stated purpose), **HIGH** (breaks a core production requirement), **MEDIUM** (correctness/quality gap), **LOW** (hygiene).

### 2.1 Validation & Safety (the core invariant is not enforced)

| # | Severity | File | Finding |
|---|----------|------|---------|
| V1 | CRITICAL | `packages/validation/sandbox.py` (`verify_build_and_syntax`) | "Build verification" does not run a compiler. It iterates `*.ts` files and checks `content.count("{") == content.count("}")` and `count("(") == count(")")`. This is trivially fooled (braces in strings/comments) and will pass syntactically invalid TypeScript. The README claim of "TypeScript build" validation is not implemented. |
| V2 | CRITICAL | `packages/validation/sandbox.py` (`verify_contracts`) | Contract check is hardcoded to FakePay: it looks for fixed files `src/fakepay-client.ts`, `src/checkout.ts`, `src/config.ts`, `src/types.ts` and greps for literal strings (`"/payment"`, `"/payments"`, `api.fakepay.dev/v1`, `currency?:`, `currency: "usd"`). For any other provider or repo layout the files don't exist and the step passes vacuously. |
| V3 | CRITICAL | `packages/validation/sandbox.py` (`verify_tests`) | "Unit test" check does not run tests. It greps `tests/checkout.test.ts` for `toHaveBeenCalledWith("/payment"` vs `"/payments"`. It does not execute `npm test`/`pytest`. Hardcoded to the demo. |
| V4 | HIGH | `packages/validation/runner.py` | `lint_passed = True  # Clean syntax verified` is hardcoded. There is no lint step. |
| V5 | HIGH | `apps/api/app/api/routes/migrations.py` (`_run_migration_in_background`, sync path) | `ValidationRun` is persisted with `build_status="PASS", test_status="PASS", contract_status="PASS"` hardcoded; only `overall_status` reflects the pipeline. The per-step statuses shown in the UI (`validations.py`) are therefore always "pass" regardless of reality. |
| V6 | HIGH | `packages/migration_engine/llm/base.py` (`StubLLMProvider.generate_patch`) + `planner.py` | When no Gemini key is configured, the stub returns the file **unchanged**; the planner only records a patch `if patched_content != orig_content`. Result: a non-recipe migration produces an empty plan that then passes the (fake) validation vacuously, potentially opening a PR with zero changes. |
| V7 | MEDIUM | `packages/validation/sandbox.py` (`IsolatedSandbox.__enter__`) | Sandbox copies the whole repo into a temp dir with `shutil.copytree`. For large repos this is slow and unbounded; no size guard, no git-worktree-based isolation as the README implies. |

### 2.2 Dummy/Mock/Demo Data in Production Code Paths

| # | Severity | File | Finding |
|---|----------|------|---------|
| D1 | CRITICAL | `apps/api/app/api/routes/webhooks.py` (`handle_provider_webhook`) | Loads `tests/fixtures/api-v1/fakepay.yaml` and `api-v2/fakepay.yaml` and runs the pipeline against `tests/fixtures/demo-repository`, ignoring `old_spec_url`/`new_spec_url` in the payload. `repo_name` defaults to `"demo-org/demo-checkout"`, `provider` defaults to `"fakepay"`. |
| D2 | CRITICAL | `apps/api/app/api/routes/webhooks.py` (`handle_github_webhook`) | A GitHub push/release on **any** repo loads the FakePay fixtures, scans `tests/fixtures/demo-repository`, and runs `provider="fakepay"`. `repo_full_name` defaults to `"demo-org/demo-checkout"`. Carries inline `# live spec fetching TODO`. |
| D3 | CRITICAL | `apps/api/app/api/routes/migrations.py` (`trigger_migration`) | Loads specs from `tests/fixtures/api-v1/{provider}.yaml`, falling back to `fakepay.yaml`. `TriggerMigrationRequest` defaults: `provider="fakepay"`, `repo_name="demo-org/demo-checkout"`. No way to supply real spec URLs — the request model doesn't accept them. `repo_id` falls back to `"repo_demo_checkout"`. |
| D4 | CRITICAL | `apps/api/app/api/routes/impact.py` (`get_impact_analysis`) | Always loads `api-v1/fakepay.yaml`/`api-v2/fakepay.yaml` and scans `DEMO_REPO` even when `?provider=stripe`. The `provider` param only affects `analyze_impact`, not the spec/repo used. |
| D5 | HIGH | `apps/api/app/api/routes/changes.py` (`list_changes`) | When the DB has no change rows, computes on the fly from the FakePay fixture pair and returns hardcoded `from_version:"1.0.0"`, `to_version:"2.0.0"`, `provider:"fakepay"`. |
| D6 | HIGH | `apps/api/app/api/routes/repositories.py` (`list_github_repositories`) | When no token / GitHub API fails, returns a hardcoded sample list of 4 demo repos (`demo-org/demo-checkout`, `demo-org/payments-worker`, `demo-org/billing-service`, `rizzzabh-06/fakepay-nextjs-demo`) with `is_live:false`, presented as the repo list. |
| D7 | HIGH | `apps/api/app/api/routes/repositories.py` (`_ensure_repository_local`) | Hardcoded demo shortcuts: `demo-org/demo-checkout` → fixtures demo repo; `rizzzabh-06/fakepay-nextjs-demo` → local `demo-repo/`. On **any** clone failure/timeout for a real repo it silently returns `_get_demo_repo_path()` (the fixture). |
| D8 | CRITICAL | `apps/api/app/api/routes/analytics.py` | Fabricates metrics when the DB is empty: `success_rate=95.0`, `avg_confidence=0.96`, `passed_migrations or 8`, `total_migrations or 8`, `total_usages or 15`, `prs_awaiting_review or 1`, hardcoded `avg_validation_seconds: 3.8`; trend uses `count if count>0 else (1+(i%3))`; provider/repo breakdowns fall back to hardcoded FakePay/Stripe numbers. The README's "95%+ success rate" traces here. |
| D9 | HIGH | `apps/web/src/pages/ValidationDetails.tsx` | Ships `MOCK_VALIDATIONS` (a hardcoded validation list) and renders it whenever the backend call is non-OK or throws, so the UI silently shows fake validation data on error. |
| D10 | MEDIUM | `apps/web/src/api/client.ts` | Demo defaults baked in: `triggerMigration(provider="fakepay", repoName="demo-org/demo-checkout")`, `fetchImpact(provider="fakepay")`. |
| D11 | MEDIUM | `apps/api/app/api/routes/auth.py` (`get_session`) | Hardcoded fallback identity: `usr_demo_01`, `"Rizzabh Admin"`, `admin@example.com`, avatar `https://avatars.githubusercontent.com/u/9919?v=4`, org `org-wispy-boat-92392834`. |
| D12 | MEDIUM | `scripts/seed_demo.py` | Seeds demo org `org-wispy-boat-92392834` ("Rizzabh"), FakePay provider with **hardcoded** `webhook_secret="test_webhook_secret_key_123"`, and `demo-org/demo-checkout` repo, scanning the fixture demo repo. Recommended by the README quick-start. |
| D13 | LOW | `tests/fixtures/demo_data_seeder.py` | Heavier demo seeder (`--populate`) fabricates 20 migrations (15 passed / 3 failed / 2 pending), 4 repos, 2 providers. Demo-only, but inflates the dashboard. |

### 2.3 Stubbed / Incomplete Implementations

| # | Severity | File | Finding |
|---|----------|------|---------|
| S1 | CRITICAL | `packages/github/client.py` (`create_draft_pr`) | The **default** PR path (used when `publish_pr=False`, which is the API default) returns a fabricated `GitHubDraftPR` with `pr_number=101` and `pr_url=f"https://github.com/{repo_name}/pull/101"`. Not a real PR. |
| S2 | HIGH | `packages/github/client.py` (`publish_remote_draft_pr`) | The remote path is genuinely real (branch → contents commits → draft PR via REST), but on **any** error (token missing/simulated, branch fetch fails, PR create fails, or exception) it silently falls back to `create_draft_pr` (the fake one). Failures are swallowed; callers can't tell a real PR from a fake one. |
| S3 | HIGH | `packages/migration_engine/llm/gemini.py` | Real when `GEMINI_API_KEY` is set, but every method silently falls back to canned output when the client is absent or a call throws: `generate_patch` returns the file **unchanged**, `generate_plan` returns 4 generic strings, `explain_change` returns a templated string. No key → migration is a no-op that still "succeeds." Uses `print()` instead of logging. |
| S4 | HIGH | `apps/api/app/api/routes/webhooks.py` | Explicit `# live spec fetching TODO`. Spec retrieval from a provider URL/changelog is not implemented; everything uses fixtures. |
| S5 | MEDIUM | `apps/worker/jobs/process_webhook.py` | `run_pipeline` annotation uses `Optional[str]` but `Optional` is not imported (only `Any, Dict`). Harmless under `from __future__ import annotations`, but a latent bug for `get_type_hints` and sloppy. |
| S6 | MEDIUM | `packages/repository_analyzer/typescript/parser.py` | `default_provider="fakepay"`; `CLIENT_METHOD_REGEX` is hardcoded to `fakepay|stripe|client|api`; "payment" method names are guessed to endpoint `/payment`. Discovery is demo-coupled. |

### 2.4 Real-Time Execution Gaps

| # | Severity | File | Finding |
|---|----------|------|---------|
| R1 | CRITICAL | `apps/api/app/core/events.py` (`broadcast_sync`) | Called from background threads (FastAPI `BackgroundTasks` run sync funcs in a threadpool). It tries `asyncio.get_running_loop()` (raises `RuntimeError` in a thread) then `asyncio.run(self.broadcast(...))`, creating a **fresh event loop** and doing cross-loop `queue.put_nowait` onto queues owned by the main loop's SSE connections. Events from background migration tasks are not reliably delivered to SSE clients and can corrupt queues. This is the core real-time gap: `migration_completed` from `_run_migration_in_background` won't reach the UI. |
| R2 | HIGH | `apps/api/app/api/routes/webhooks.py` | `handle_provider_webhook` and `handle_github_webhook` are `async def` and call `run_pipeline(...)` synchronously inline. `run_pipeline` does file I/O + subprocess work and blocks the event loop for the whole pipeline (seconds). Should be offloaded (threadpool/BackgroundTasks/queue). |
| R3 | MEDIUM | `apps/api/app/core/events.py` | Broadcaster is in-memory, single-process. Horizontal scaling / multiple uvicorn workers won't share events. Needs Redis/Postgres LISTEN or a pubsub backend for production. |
| R4 | MEDIUM | `apps/api/app/api/routes/migrations.py` | Only `background=true` runs async; the default sync path blocks. The background path depends on the broken `broadcast_sync` (R1). |
| R5 | LOW | `apps/api/app/api/routes/events.py` (`get_stream_status`) | Accesses `event_broadcaster._subscribers` (private) to report a count. |

The SSE transport itself (`events.py` stream + `apps/web/src/api/events.ts` `EventStreamManager`) is well-built: subscribe/heartbeat/disconnect/reconnect, typed event listeners. The frontend does subscribe to `webhook_received`, `migration_started`, `migration_completed`, `scan_completed`. The gap is delivery from background tasks (R1), not the UI plumbing.

### 2.5 Database & Data Layer

| # | Severity | File | Finding |
|---|----------|------|---------|
| B1 | CRITICAL | `apps/api/app/db/session.py` | Silent SQLite fallback: `if not DATABASE_URL: DATABASE_URL = f"sqlite:///{db_file}"` pointing at `self_maintaining_apis.db`. In production with an unset var the app silently runs on a local file DB instead of failing. The previous commit gitignored SQLite but the fallback is still live in code. |
| B2 | HIGH | `apps/api/app/db/init_db.py` | No real migration system. Uses `Base.metadata.create_all` + hand-rolled `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements. No Alembic, no versioning, no down-migrations, no drift detection. Errors are caught with `except Exception as e: print(...)` — swallowed, not raised. |
| B3 | MEDIUM | `apps/api/app/models/db_models.py` | Secrets stored plaintext: `Provider.webhook_secret` (String), `GitHubAppInstallation.access_token` (Text). No encryption at rest. |
| B4 | MEDIUM | `apps/api/app/models/db_models.py` | No indexes on FK columns or hot query columns (e.g. `api_usages.repository_id`, `migration_runs.repository_id`, `created_at` filters used in analytics/inventory). Will hurt at scale. |
| B5 | LOW | `apps/api/app/models/db_models.py` | Uses deprecated `datetime.datetime.utcnow` (should be timezone-aware `now(timezone.utc)`, used inconsistently elsewhere). No `updated_at` on most tables; no cascade rules. |
| B6 | LOW | `apps/api/app/db/session.py` + `apps/api/app/core/config.py` | Two separate hand-rolled `.env` parsers. Duplicated logic, both swallow errors. No validated `Settings` model (pydantic-settings) — config is read ad hoc from `os.environ` across the codebase. |

### 2.6 Security & Auth

| # | Severity | File | Finding |
|---|----------|------|---------|
| A1 | CRITICAL | `apps/api/app/main.py` | CORS: `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`. Wide-open with credentials intent. Should be an explicit allowlist. |
| A2 | CRITICAL | All routers | No authentication or authorization anywhere. No `Depends` for a current user/session on any route. Any caller can list/connect/disconnect repos, trigger migrations, read/change automation settings, and disconnect GitHub. |
| A3 | CRITICAL | `apps/api/app/api/routes/auth.py` (`get_session`) | Returns whoever is first in the DB; no token/cookie validated. There is no session issuance. |
| A4 | HIGH | `apps/api/app/api/routes/auth.py` (`github_oauth_callback`) | Real OAuth code exchange, but it never sets a session cookie or issues a JWT. The returned HTML just `postMessage`s the opener; the backend has no notion of an authenticated session afterward. |
| A5 | HIGH | `apps/api/app/api/routes/webhooks.py` (`handle_github_webhook`) | If `GITHUB_WEBHOOK_SECRET` is unset, signature verification is **skipped** with only a warning log. Should reject. |
| A6 | HIGH | `apps/api/app/api/routes/webhooks.py` | `DEFAULT_SECRET = os.getenv("FAKEPAY_WEBHOOK_SECRET", "test_webhook_secret_key_123")` — a known default secret means unsigned/incorrectly-signed webhooks are accepted in production if the env var is missing. |
| A7 | HIGH | `apps/api/app/api/routes/repositories.py` (`_ensure_repository_local`) | Embeds the GitHub token in the clone URL (`https://x-access-token:{token}@github.com/...`) passed as a subprocess argv element. Token exposure via process listings on shared hosts. |
| A8 | MEDIUM | `apps/api/app/api/routes/auth.py` (`connect_github`) | Accepts a raw PAT over POST and stores it plaintext; treats `ghp_test_`/`ghp_simulated_` prefixes as real; falls back to `access_token="ghp_simulated_token"`. Allows `httpx.RequestError` to silently pass validation ("allow connection"). |
| A9 | MEDIUM | `apps/api/app/api/routes/auth.py` (`disconnect_github`) | Unauthenticated; `delete()`s all installations. |
| A10 | MEDIUM | — | No rate limiting anywhere (README mentions it as planned). No CSRF protection on state-changing POSTs. No input-size/depth limits on webhook payloads or scan targets. |
| A11 | LOW | `apps/api/app/core/security.py` | `verify_webhook_signature` is correctly implemented (HMAC-SHA256, `hmac.compare_digest`, handles `sha256=` prefix). This is one of the solid pieces — but its callers bypass it (A5/A6). |
| A12 | LOW | `.gitignore` | `.env` is correctly ignored and is **not** tracked (verified via `git ls-files`). Only `.env.example` is tracked. No committed secrets found in source. |

### 2.7 Configuration & Environment

| # | Severity | File | Finding |
|---|----------|------|---------|
| C1 | HIGH | `.env.example` | Stale/incomplete vs README and code. Lists `DATABASE_URL=postgresql://localhost:5432/...`, `LLM_PROVIDER=openai`, `LLM_API_KEY=...`, `REDIS_URL=...` — none of which match the actual Neon/Gemini setup the code reads (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `GITHUB_CLIENT_ID`/`SECRET`, `FAKEPAY_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_DEMO_REPO_PATH`, `GITHUB_TOKEN`). A new operator would misconfigure the app. |
| C2 | MEDIUM | `pyproject.toml` | Runtime deps missing `google-generativeai`, `uvicorn`, `starlette`/`fastapi[all]`, `python-multipart`. README tells users to `pip install` them separately. The manifest doesn't reflect reality. |
| C3 | MEDIUM | `apps/api/app/core/config.py` | `load_env` walks up 5 dirs and `except Exception: pass` swallows parse errors. No validation of required vars at startup; missing required config fails late and confusingly. |
| C4 | LOW | `apps/api/app/db/session.py` | Hardcoded pool sizing (`pool_size=10, max_overflow=20`); not env-tunable. `pool_recycle=300`/`pool_pre_ping=True` are appropriate for Neon. |
| C5 | LOW | root | Dev artifacts present on disk and correctly gitignored: `.backend.log`, `.frontend.log`, `.ngrok.log`, `.env.ngrok`, `self_maintaining_apis.db`. Not in git, but indicate local-dev-only tooling (ngrok) baked into the workflow. |

### 2.8 Frontend Production Readiness

| # | Severity | File | Finding |
|---|----------|------|---------|
| F1 | HIGH | `apps/web/src/api/client.ts` | No HTTP error handling. Every function does `return res.json()` without checking `res.ok` or handling non-JSON/4xx/5xx. Network/server errors become unhandled rejections or misleading JSON. |
| F2 | HIGH | `apps/web/src/pages/ValidationDetails.tsx` | `MOCK_VALIDATIONS` rendered on any non-OK response or exception (D9). |
| F3 | MEDIUM | `apps/web/src/api/client.ts` | No auth token/credentials sent; no request timeouts; no retry. Consistent with the no-auth backend, but must change when auth lands. |
| F4 | MEDIUM | `apps/web/src/components/OnboardingWizard.tsx` | Demo-flavored defaults: `workspaceName="Rizzabh"`, `githubAccount="demo-org"`, avatar fallback. Overridden by real session data, but the defaults are demo identity. The 9 steps themselves call real APIs (no placeholder screens). |
| F5 | LOW | `apps/web/src/api/events.ts` | SSE manager is solid (reconnect, typed listeners, connection callbacks). One `console.error` in a catch — acceptable. No other `console.log/debug` found in `src/`. |

### 2.9 Error Handling & Resilience

| # | Severity | File | Finding |
|---|----------|------|---------|
| E1 | HIGH | pervasive | Silent fallbacks masquerade as success: clone fails → demo repo (D7); GitHub API fails → fake PR (S2); no Gemini key → unchanged-file "migration" (S3/V6); no DB data → fabricated analytics (D8). The system almost never returns an error to the user; it returns demo data instead. |
| E2 | MEDIUM | `apps/api/app/api/routes/repositories.py`, `auth.py`, `webhooks.py` | Multiple bare-ish `except Exception: pass` / `except httpx.RequestError: pass` blocks that swallow network errors and continue with fallback data. |
| E3 | MEDIUM | `apps/api/app/api/routes/migrations.py` | `run_id = f"mig_{int(timestamp)}"` — collision risk under concurrent triggers; not unique-safe. |
| E4 | LOW | `packages/migration_engine/llm/gemini.py`, `apps/api/app/db/init_db.py` | `print()` used for warnings/errors in production code paths instead of `logging`. |
| E5 | LOW | `apps/api/app/api/routes/validations.py` | `diff_summary` is always `{added:0,removed:0,changed:0}` because it reads `plan.get("changes", [])` but the stored `plan` is the `draft_pr` dict (no `changes` key). `duration_s: 0` hardcoded. |

---

## 3. Dummy Data Inventory (must be removed or replaced)

**Demo fixtures in `tests/fixtures/` (legitimate as test data; the problem is production code importing them):**
- `tests/fixtures/api-v1/fakepay.yaml`, `tests/fixtures/api-v2/fakepay.yaml`
- `tests/fixtures/api-v1/stripe.yaml`, `tests/fixtures/api-v2/stripe.yaml`
- `tests/fixtures/changelog/fakepay-v1-to-v2.json`
- `tests/fixtures/demo-repository/` (the fakepay demo app: `src/{checkout,config,fakepay-client,index,types}.ts`, `tests/checkout.test.ts`, `package.json`, `tsconfig.json`)

**Demo repos / data on disk:**
- `demo-repo/` (nested git repo = the published `fakepay-nextjs-demo`) — used as a hardcoded shortcut in `_ensure_repository_local`.
- `self_maintaining_apis.db` (local SQLite, gitignored) — produced by the fallback in `session.py`.

**Hardcoded demo values in production source:**
- `"demo-org/demo-checkout"` — default `repo_name` in `webhooks.py`, `migrations.py`, `client.ts`.
- `demo-org/{demo-checkout,payments-worker,billing-service}` + `rizzzabh-06/fakepay-nextjs-demo` — fallback repo list in `repositories.py`.
- `"org-wispy-boat-92392834"` / `"Rizzabh"` — hardcoded org in `auth.py`, `repositories.py`, `automation.py`, `seed_demo.py`.
- `"test_webhook_secret_key_123"` — default FakePay webhook secret in `webhooks.py` and seeded in `seed_demo.py`.
- `"ghp_simulated_token"`, `"ghp_simulated_"`/`"ghp_test_"` token-prefix acceptances — `auth.py`, `repositories.py`, `migrations.py`, `github/client.py`.
- `usr_demo_01`, `"Rizzabh Admin"`, `admin@example.com`, avatar `u/9919` — `auth.py` `get_session`.
- `"repo_demo_checkout"` / `"repo_demo_checkout_primary"` / `"demo-checkout"` protected-demo special-casing — `repositories.py` `disconnect_repository`.
- Fake PR `pr_number=101`, `pr_url=".../pull/101"` — `github/client.py`.
- Fabricated analytics constants (`95.0`, `0.96`, `3.8`, `or 8`, `or 15`, `or 1`, modulo trend, FakePay/Stripe breakdowns) — `analytics.py`.
- `MOCK_VALIDATIONS` — `apps/web/src/pages/ValidationDetails.tsx`.

**Demo scripts (acceptable as tooling, but the README quick-start routes prod users through them):**
- `scripts/seed_demo.py`, `scripts/run_demo.py`, `tests/fixtures/demo_data_seeder.py` — seed demo org/provider/repo/migration history.

---

## 4. Stubbed Implementation Inventory

- **`packages/validation/sandbox.py`** — entire "build"/"contract"/"tests" verification is heuristic/string-grep, not real execution. The single most important stub in the system.
- **`packages/github/client.py:create_draft_pr`** — returns a fake PR object (`pull/101`), not a real GitHub PR.
- **`packages/migration_engine/llm/base.py:StubLLMProvider`** — no-op fallback that returns unchanged files (silently passes validation).
- **`apps/api/app/api/routes/webhooks.py`** — spec fetching stubbed to fixtures (`# live spec fetching TODO`).
- **`apps/api/app/api/routes/auth.py`** — authentication stubbed: no session issuance, returns first DB user.
- **`apps/api/app/api/routes/repositories.py:list_github_repositories`** — returns hardcoded sample list when offline/no token.
- **`apps/api/app/api/routes/impact.py`** / **`changes.py`** — return fixture-derived data when DB empty.
- **`apps/api/app/api/routes/analytics.py`** — fabricates data when DB empty.

---

## 5. Real-Time Gaps

1. **Background-task → SSE delivery is broken** (`events.py:broadcast_sync` cross-loop issue). `migration_completed`/`scan_completed` emitted from `BackgroundTasks` threads won't reliably reach connected SSE clients. (R1)
2. **Webhook handlers block the event loop** by running the full synchronous pipeline inline in `async def` handlers. (R2)
3. **In-memory broadcaster** can't span multiple workers/processes; no pubsub backend. (R3)
4. **Sync migration path blocks**; only `background:true` is async and it depends on the broken broadcaster. (R4)
5. The SSE client (`events.ts`) and server stream (`events.py`) are correctly implemented and the UI subscribes to the right event types — the gap is purely server-side event delivery from background work.

---

## 6. Security Gaps

- **No authN/authZ on any route** (A2). The entire API is open.
- **`/api/auth/session` returns the first DB user** with no validation (A3); OAuth callback issues no session (A4).
- **CORS `*` + credentials** (A1).
- **Webhook signature verification skippable**: GitHub secret unset → no check (A5); FakePay secret defaulted in code (A6).
- **Token handling**: PAT stored plaintext (B3/A8); token embedded in git clone URL argv (A7); simulated/test tokens accepted (A8).
- **Unauthenticated destructive ops**: `disconnect_github` deletes all installations (A9); repo connect/disconnect/migrate open (A2).
- **No rate limiting, no CSRF, no payload size limits** (A10).
- Note: `verify_webhook_signature` itself is correct (A11) and no secrets are committed to git (A12).

---

## 7. Prioritized Action Plan

### P0 — Blockers (product is non-functional / unsafe without these)
1. **Replace the validation engine with real execution.** `packages/validation/sandbox.py`: run an actual build (`tsc --noEmit` / project build) and the actual test suite (`npm test`/`pytest`) in the sandbox; generalize contract checks off the OpenAPI diff + generated patches instead of hardcoded FakePay strings; remove `lint_passed=True` hardcode in `runner.py`. Stop persisting hardcoded `build/test/contract=PASS` in `migrations.py`.
2. **Break the production path's dependency on fixtures.** Webhooks/migrations/changes/impact must fetch real specs (from `old_spec_url`/`new_spec_url`, provider config, or changelog) and resolve the real target repo — and **fail loudly** instead of falling back to `tests/fixtures` or `demo-repository`. Remove the demo repo/`pull/101`/simulated-token fallbacks or gate them behind an explicit `demo_mode` env flag.
3. **Add authentication and authorization.** Issue a session (signed JWT or httpOnly session cookie) in the OAuth callback; add a `current_user`/`current_org` dependency to every mutating route and the session endpoint; remove the "first DB user" identity.
4. **Lock down webhooks and CORS.** Reject GitHub webhooks when `GITHUB_WEBHOOK_SECRET` is unset (no skip); remove the hardcoded FakePay default secret and require it from env; set CORS to an explicit origin allowlist; remove `allow_credentials` with `*`.
5. **Remove the SQLite fallback.** `session.py` must raise on missing `DATABASE_URL` (or refuse to start), never silently use `self_maintaining_apis.db`.

### P1 — Critical
6. **Fix real-time delivery.** Replace `broadcast_sync`'s `asyncio.run` hack with a thread-safe queue/bridge (or run the pipeline via a real task queue: RQ/Celery/Dramatiq + Redis, or Postgres `LISTEN/NOTIFY`) so background tasks reach SSE clients. Make webhook handlers non-blocking (offload `run_pipeline`).
7. **Introduce a real migration system** (Alembic) and stop swallowing DDL errors in `init_db.py`. Add indexes on FK/hot columns.
8. **Stop fabricating analytics.** Return real zeros/empty series when there's no data; remove the hardcoded success rate/confidence/repo counts/trend from `analytics.py` and the `MOCK_VALIDATIONS` fallback in `ValidationDetails.tsx`.
9. **Make the LLM fallback fail safe.** When no Gemini key, the migration must **fail** (or be marked "no plan") rather than silently returning unchanged files that pass validation.
10. **Generalize recipes & scanner off the demo file layout.** Recipes that only match `src/fakepay-client.ts`/`src/lib/stripe-client.ts` exact strings won't work on real repos; the TS parser's `fakepay|stripe` provider heuristics and `default_provider="fakepay"` need to be provider-agnostic or config-driven.
11. **Sync `.env.example` and `pyproject.toml`** with the real required vars and runtime deps; validate required config at startup (pydantic-settings `Settings`).

### P2 — Important
12. **Frontend API client error handling**: check `res.ok`, parse errors consistently, surface failures to the UI; add timeouts; remove demo defaults in `client.ts`.
13. **GitHub adapter resilience**: distinguish real PR from fallback; surface publish failures instead of silently returning a fake PR; stop embedding tokens in clone URLs (use `git -c http.extraheader` or an env-provided credential helper).
14. **Encrypt secrets at rest** (`webhook_secret`, `access_token`) or avoid storing install tokens (re-fetch on demand).
15. **Rate limiting + CSRF + payload size limits** on webhooks and public endpoints.
16. **Sandbox hardening**: bound repo size/copy time, prefer real git worktrees, add timeouts on build/test execution.
17. **Replace `print()` with `logging`** in `gemini.py`/`init_db.py`; make `run_id` collision-safe (uuid).

### P3 — Nice-to-have
18. Multi-process pubsub backend for SSE (Redis) for horizontal scale.
19. `updated_at`/cascades/timezone-aware datetimes across models.
20. Real "currently in use" version tracking instead of the "simulate" comment in `inventory.py`.
21. Strip demo identity defaults from the onboarding wizard.

---

## 8. What's Already Production-Ready (don't redo these)

- **`packages/change_engine/diff.py` + `classifier.py`** — genuinely deterministic, generic OpenAPI 3.x structural differ (endpoint renames via operationId, additions/removals, schema required/optional field changes) and severity classifier. Works on any provider spec. Solid.
- **`packages/repository_analyzer/scanner.py`** — generic repo walker orchestrating package.json, URL, TS, and Python scans with sensible ignore lists. Real.
- **`packages/impact_engine/analyzer.py`** — generic change→usage matching with dedup, confidence averaging, and risk leveling. Real (minor FakePay flavor in the `/payment`/`/v1` special cases).
- **`packages/github/client.py:publish_remote_draft_pr`** — real GitHub REST integration (branch creation, contents commits, draft PR creation) with correct API versioning headers. The logic is good; only the silent fallbacks need fixing.
- **`packages/migration_engine/llm/gemini.py`** — real `google.generativeai` integration with bounded-context prompts when a key is present. The integration is good; only the silent no-op fallbacks need fixing.
- **`apps/api/app/api/routes/events.py` + `apps/web/src/api/events.ts`** — SSE stream and client are well-built (subscribe, heartbeat keep-alive, disconnect detection, unsubscribe, auto-reconnect, typed events). Only server-side cross-thread delivery needs fixing.
- **`apps/api/app/core/security.py:verify_webhook_signature`** — correct HMAC-SHA256 with `hmac.compare_digest` and `sha256=` prefix handling. (Callers misuse it, but the function is right.)
- **`apps/api/app/api/routes/inventory.py`** — real, well-structured DB queries with enriched provider health/version logic. Production-quality.
- **`.gitignore` / secret hygiene** — `.env` is not tracked; no committed secrets found.
- **Repo ingestion/scan persistence** (`repositories.py:trigger_repository_scan`, `seed_demo.py` scan step) — real scan→persist flow into `APIUsageModel`.
- **Backend route organization, Pydantic request models, `get_db()` dependency pattern, SQLAlchemy 2.0 models** — consistent and conventional.

---

## Bottom line

The engines are real; the runtime is a demo. Reaching "production-grade, no dummy data, real-time execution" is primarily a wiring-and-safety job: make validation actually execute builds/tests, make every endpoint fetch real specs/repos and fail loudly instead of falling back to FakePay fixtures, add real auth, fix cross-thread SSE delivery, and stop fabricating metrics. The good news is that the hardest deterministic logic (spec diffing, impact analysis, the GitHub/Gemini integrations) is already built and can be kept.
