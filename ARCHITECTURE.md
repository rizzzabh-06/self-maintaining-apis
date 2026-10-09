# Architecture Documentation

## Self-Maintaining APIs System

**Version**: 1.0.0  
**Last Updated**: 2026-10-09

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Security Model](#security-model)
9. [Scalability](#scalability)
10. [Testing Strategy](#testing-strategy)
11. [Deployment](#deployment)

---

## System Overview

The Self-Maintaining APIs system is an autonomous code maintenance platform that detects breaking changes in external APIs and automatically generates validated migration pull requests.

### Key Capabilities

- **Automatic Detection**: Monitors API providers for breaking changes via webhooks and OpenAPI spec diffs
- **AST-based Discovery**: Uses Tree-sitter to find exact API usage locations in code (line numbers, symbols)
- **Impact Analysis**: Maps breaking changes to affected files across repositories
- **Deterministic Migration**: Applies battle-tested transformation recipes for known providers
- **Sandbox Validation**: Tests all patches in isolated environments before PR creation
- **Human-in-the-Loop**: Creates draft PRs only, never auto-merges

### Design Principles

1. **Deterministic-First**: Prioritize predictable, tested transformations over AI guessing
2. **Safety-First**: Validate everything in sandbox, block PRs on test failures
3. **Human Oversight**: Draft PRs require manual review and approval
4. **Multi-Language**: Support TypeScript, Python, Go (extensible to more)
5. **Provider-Agnostic**: Extensible recipe system for any API provider
6. **Zero Auto-Deploy**: Strict invariant - never merge automatically

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "External Systems"
        GH[GitHub API<br/>Webhooks & PRs]
        APIS[API Providers<br/>FakePay, Stripe, etc.]
        GEMINI[Gemini LLM<br/>Fallback Assistant]
    end

    subgraph "Frontend - React/TypeScript"
        UI[Web Dashboard<br/>Vite + React]
        CHARTS[Visualization<br/>Charts & Metrics]
    end

    subgraph "Backend API - FastAPI"
        API[REST API<br/>FastAPI Python]
        AUTH[Authentication<br/>GitHub OAuth]
        WEBHOOK[Webhook Handler<br/>Provider Events]
    end

    subgraph "Core Engine"
        DIFF[Change Detection<br/>OpenAPI Diff]
        SCAN[AST Scanner<br/>Tree-sitter]
        IMPACT[Impact Analysis<br/>File Mapping]
        PLANNER[Migration Planner<br/>Recipe Matcher]
    end

    subgraph "Migration System"
        RECIPES[Recipe Engine<br/>Deterministic Transforms]
        SANDBOX[Sandbox Validator<br/>Isolated Testing]
        PRGEN[PR Generator<br/>Draft PRs Only]
    end

    subgraph "Data Layer"
        NEON[(Neon Postgres<br/>Lakebase DB)]
    end
```

[View Full Diagram](./diagrams/system-architecture.mmd)

---

## Component Breakdown

### 1. Change Detection Engine

**Location**: `packages/change_detection/`

**Purpose**: Detect breaking changes in API specifications

**Components**:
- `diff_specs()`: OpenAPI 3.x spec diffing algorithm
- `classify_change()`: Categorizes changes (ENDPOINT_RENAMED, FIELD_REQUIRED, etc.)
- `calculate_severity()`: Risk scoring (critical, warning, info)

**Key Algorithm**:
```python
1. Load old_spec and new_spec (YAML/JSON)
2. Compare paths, operations, schemas
3. Match operations by operationId (enables rename detection)
4. Detect field additions, removals, type changes
5. Calculate breaking vs non-breaking
6. Return structured ChangeList
```

**Supported Change Types**:
- `ENDPOINT_RENAMED`: Path changed, operationId preserved
- `FIELD_REQUIRED`: Optional field became required
- `FIELD_REMOVED`: Field deleted from schema
- `TYPE_CHANGED`: Field type modified (string → number)
- `RESPONSE_SCHEMA_CHANGED`: Response format altered

### 2. AST Scanner (Tree-sitter)

**Location**: `packages/ast_discovery/`

**Purpose**: Find exact API usage locations in source code

**Supported Languages**:
- TypeScript/JavaScript (via `tree-sitter-typescript`)
- Python (via `tree-sitter-python`)
- Go (via `tree-sitter-go`)

**Discovery Tiers** (4-tier approach):
1. **Provider Detection**: Find SDK imports (`import { FakePayClient }`)
2. **URL/Config Discovery**: Base URLs in config files
3. **Endpoint Usage**: Actual API calls with line numbers
4. **Type References**: Type usage across the codebase

**Key Algorithm**:
```python
1. Parse file with Tree-sitter (language-specific grammar)
2. Extract import statements → find SDKs
3. Traverse AST nodes for function calls
4. Match against known API patterns (URL strings, SDK methods)
5. Extract context: line number, symbol name, surrounding code
6. Store in APIUsage table with confidence score
```

**Example Output**:
```json
{
  "file_path": "src/lib/fakepay-client.ts",
  "line_number": 23,
  "symbol": "createPayment",
  "endpoint": "/payment",
  "usage_type": "function_call",
  "confidence": 0.98,
  "snippet": "await client.createPayment({ amount: 1000 })"
}
```

### 3. Impact Analysis Engine

**Location**: `packages/impact_analysis/`

**Purpose**: Map breaking changes to affected files and calculate risk

**Analysis Steps**:
1. **Cross-reference**: Match detected changes to discovered usages
2. **File Aggregation**: Group usages by file path
3. **Risk Calculation**: Score based on change severity + usage count
4. **Confidence Scoring**: Measure certainty of analysis

**Risk Levels**:
- **CRITICAL**: Multiple breaking changes, >5 affected files
- **HIGH**: Breaking changes in 2-5 files
- **MEDIUM**: Breaking changes in 1 file
- **LOW**: Non-breaking changes only

**Output**:
```json
{
  "affected_files": [
    {
      "path": "src/lib/fakepay-client.ts",
      "usages": 3,
      "changes": ["ENDPOINT_RENAMED"]
    }
  ],
  "risk_level": "high",
  "confidence": 0.95,
  "summary": "4 files affected by 3 breaking changes"
}
```

### 4. Migration Planner & Recipe System

**Location**: `packages/migration_engine/`

**Purpose**: Generate migration patches using deterministic recipes or LLM fallback

**Recipe Interface**:
```python
class MigrationRecipe:
    name: str
    provider: str
    
    def can_handle(self, changes: List[APIChange], provider: str) -> bool:
        """Return True if this recipe can handle the changes"""
    
    def apply(self, repo_path: Path, changes: List[APIChange], 
              usages: List[APIUsage]) -> MigrationPlan:
        """Generate patches for affected files"""
```

**Built-in Recipes**:
1. **FakePayV1ToV2Recipe**: `/payment` → `/payments`, currency required
2. **StripeChargesToPaymentIntentsRecipe**: Charges → Payment Intents API

**Recipe Matching Flow**:
```mermaid
flowchart LR
    Changes --> Registry[Recipe Registry]
    Registry --> Match{Match Found?}
    Match -->|Yes| Recipe[Deterministic Recipe<br/>95-99% confidence]
    Match -->|No| LLM[Gemini Fallback<br/>70-85% confidence]
    Recipe --> Patches[File Patches]
    LLM --> Patches
```

[View Full Recipe System Diagram](./diagrams/recipe-system.mmd)

**Patch Structure**:
```python
class FilePatch:
    file_path: str          # Relative path in repo
    original_content: str    # Before
    modified_content: str    # After
    diff: str               # Unified diff format
    description: str        # Human-readable explanation
```

### 5. Sandbox Validator

**Location**: `packages/validation/`

**Purpose**: Test patches in isolated environment before PR creation

**Validation Steps**:
1. **Setup**: Clone repository to temp directory
2. **Apply**: Apply all file patches
3. **Install**: Run package manager (`npm install`, `pip install`, etc.)
4. **Build**: Compile/transpile if needed (`tsc`, `webpack`, etc.)
5. **Test**: Run unit tests (`npm test`, `pytest`, etc.)
6. **Contract**: Optional contract testing against new API
7. **Cleanup**: Destroy sandbox environment

**Sandbox Isolation**:
- Temporary filesystem (auto-deleted)
- No network access (except package registries)
- Resource limits (CPU, memory, time)
- No credentials or secrets

**Validation Results**:
```python
class ValidationRun:
    overall_status: str  # PASS, FAIL, ERROR
    build_status: str
    test_status: str
    contract_status: str
    logs: dict          # stdout/stderr from each step
```

**Safety Gate**:
- If `overall_status != "PASS"`: PR is blocked
- If `test_status == "FAIL"`: Migration plan marked as failed
- Human intervention required to fix issues

### 6. GitHub Integration

**Location**: `packages/github_integration/`

**Purpose**: Create draft PRs with migration patches

**PR Creation Flow**:
1. Authenticate via GitHub App or OAuth token
2. Create new branch: `migrate-{provider}-{timestamp}`
3. Commit patches: Separate commit per file
4. Create pull request:
   - Title: "Migrate {provider} from v{old} to v{new}"
   - Body: Detailed changelog, validation results, rollback instructions
   - **Draft mode**: Always `draft: true` (strict invariant)
5. Add labels: `migration`, `automated`, `draft`

**PR Description Template**:
```markdown
## Migration: {Provider} v{old} → v{new}

### Breaking Changes Detected
- Endpoint renamed: `/payment` → `/payments`
- Field required: `currency` now mandatory

### Files Changed (4)
- ✅ src/lib/fakepay-client.ts
- ✅ src/types/fakepay.ts
- ✅ src/app/api/checkout/route.ts
- ✅ tests/checkout.test.ts

### Validation Results
- Build: ✅ PASS
- Tests: ✅ 25/25 passed
- Confidence: 97%

### Next Steps
1. Review changes carefully
2. Test locally if needed
3. Merge when ready
4. Monitor production for issues

### Rollback Instructions
```bash
git revert {commit-hash}
```
```

**Safety Invariant**:
```python
assert pr.draft == True  # ALWAYS
```

This prevents accidental auto-merges even if GitHub settings change.

---

## Data Flow

### End-to-End Migration Flow

```mermaid
sequenceDiagram
    participant Provider
    participant Webhook
    participant ChangeEngine
    participant Scanner
    participant Impact
    participant Planner
    participant Recipe
    participant Sandbox
    participant GitHub
    participant DB

    Provider->>Webhook: Breaking Change (v2 released)
    Webhook->>ChangeEngine: Trigger Analysis
    ChangeEngine->>ChangeEngine: Diff OpenAPI Specs
    ChangeEngine->>DB: Store Changes
    ChangeEngine->>Scanner: Scan Repository
    Scanner->>Scanner: Parse with Tree-sitter
    Scanner->>DB: Store Usages
    Scanner->>Impact: Analyze Impact
    Impact->>DB: Store Impact Report
    Impact->>Planner: Generate Migration
    Planner->>Recipe: Select Recipe
    Recipe->>Recipe: Generate Patches
    Recipe->>Sandbox: Validate
    Sandbox->>Sandbox: Build + Test
    alt Validation Passes
        Sandbox->>GitHub: Create Draft PR
        Sandbox->>DB: Update Status (pr_created)
    else Validation Fails
        Sandbox->>DB: Update Status (failed)
    end
```

[View Full Pipeline Flow](./diagrams/pipeline-flow.mmd)

### Request Lifecycle

**1. Webhook Event** (0s):
```
POST /api/webhooks/provider
→ Validate signature
→ Parse payload
→ Store event in DB
→ Return 202 Accepted
```

**2. Change Detection** (2-5s):
```
Fetch OpenAPI specs from provider
Diff specs (v1 vs v2)
Classify changes (breaking vs non-breaking)
Calculate severity
Store in api_changes table
```

**3. Repository Scanning** (5-15s):
```
For each monitored repository:
  Clone repository (or use cached)
  Parse files with Tree-sitter
  Extract API usages
  Store in api_usages table
```

**4. Impact Analysis** (2-3s):
```
Cross-reference changes with usages
Group by file path
Calculate risk level
Store in impact analysis (JSON blob)
```

**5. Migration Planning** (3-5s):
```
Match changes to recipe
If match: Use deterministic recipe
Else: Fallback to Gemini LLM
Generate file patches
Calculate confidence score
Store migration_run record
```

**6. Sandbox Validation** (30-60s):
```
Create temp directory
Apply patches
npm install (or equivalent)
npm run build
npm test
Parse results
Store validation_run record
```

**7. PR Creation** (2-5s):
```
IF validation passed:
  Create GitHub branch
  Commit patches
  Create draft PR
  Store PR URL
ELSE:
  Block PR creation
  Notify failure
```

**Total Time**: ~45-90 seconds (varies by repo size)

---

## Technology Stack

### Backend

**Language**: Python 3.11+

**Framework**: FastAPI
- Async request handling
- Automatic OpenAPI docs
- Type-safe with Pydantic

**Database**: Neon Postgres (Serverless)
- Lakebase storage for analytics
- SQLAlchemy ORM
- Alembic migrations

**AST Parsing**: Tree-sitter
- Language-agnostic parsing
- Supports TypeScript, Python, Go
- Used by GitHub, Atom, Neovim

**LLM**: Google Gemini
- Fallback for unknown providers
- Context-aware code generation
- Cost-effective vs GPT-4

**GitHub**: PyGitHub + REST API
- OAuth authentication
- PR creation and management
- Webhook signature validation

### Frontend

**Framework**: React 18 + TypeScript
- Type-safe component development
- Hooks-based state management
- Fast refresh for development

**Build Tool**: Vite
- Lightning-fast HMR
- Optimized production builds
- ES modules native

**UI Components**: Custom (Glass morphism design)
- Dark theme optimized
- Gradient accents
- Responsive grid layouts

**Charts**: Recharts
- Lightweight charting library
- SVG-based rendering
- Responsive and accessible

**State**: React Query (planned)
- Server state synchronization
- Automatic refetching
- Optimistic updates

### Infrastructure

**Hosting**: (To be determined)
- Backend: Railway, Render, or Fly.io
- Frontend: Vercel or Netlify
- Database: Neon (built-in)

**CI/CD**: GitHub Actions
- Automated testing on PRs
- Deployment on merge to main
- Coverage reporting

**Monitoring**: (Planned)
- Sentry for error tracking
- Posthog for analytics
- Uptime monitoring

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ REPOSITORY : has
    ORGANIZATION ||--o| AUTOMATION_SETTINGS : configures
    PROVIDER ||--o{ API_VERSION : releases
    API_VERSION ||--o{ API_CHANGE : contains
    REPOSITORY ||--o{ API_USAGE : contains
    REPOSITORY ||--o{ MIGRATION_RUN : triggers
    MIGRATION_RUN ||--o| VALIDATION_RUN : validates
```

[View Full Schema](./diagrams/data-model.mmd)

### Key Tables

**organizations**
- Primary entity for multi-tenancy
- Links to repositories and settings

**repositories**
- Tracked codebases
- github_repo: full name (org/repo)
- last_scanned_at: last AST scan timestamp

**providers**
- API providers (FakePay, Stripe, etc.)
- webhook_secret: for validating webhooks

**api_versions**
- Versions of provider APIs (1.0.0, 2.0.0)
- spec_location: Path to OpenAPI YAML

**api_changes**
- Breaking changes detected
- change_type: ENDPOINT_RENAMED, etc.
- severity: critical, warning, info

**api_usages**
- Exact locations of API usage in code
- file_path, line_number, symbol
- confidence: 0.0-1.0

**migration_runs**
- Migration attempts
- status: pending, validating, passed, failed, pr_created
- plan: JSON blob with patches
- confidence: 0.0-1.0
- is_deterministic: boolean

**validation_runs**
- Sandbox test results
- overall_status: PASS/FAIL/ERROR
- logs: JSON with stdout/stderr

---

## API Endpoints

### Authentication

```
GET  /api/auth/session
GET  /api/auth/github/authorize-url
POST /api/auth/github/connect
POST /api/auth/github/disconnect
```

### Repositories

```
GET  /api/repositories
GET  /api/repositories/github
POST /api/repositories/connect
POST /api/repositories/{id}/scan
```

### Inventory

```
GET  /api/inventory/providers
GET  /api/inventory/usages?provider={name}
```

### Changes

```
GET  /api/changes
GET  /api/changes/{provider}
```

### Impact

```
GET  /api/impact?provider={name}
```

### Migrations

```
GET  /api/migrations
POST /api/migrations/trigger
GET  /api/migrations/{id}
```

### Validation

```
GET  /api/validations/{migration_id}
```

### Webhooks

```
POST /api/webhooks/provider/{provider_slug}
```

### Health

```
GET  /health
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed request/response formats.

---

## Security Model

### Authentication

**GitHub OAuth**:
- Users authenticate via GitHub
- OAuth token stored encrypted in DB
- Tokens refreshed automatically

**Webhook Signatures**:
- HMAC-SHA256 signature verification
- Provider-specific secrets
- Replay attack protection

### Sandbox Security

**Isolation**:
- Temporary filesystem (tmpfs)
- No network access (except package registries via whitelist)
- Resource limits: 2 CPU cores, 4GB RAM, 5min timeout
- Process sandboxing with chroot/containers

**No Secrets in Sandbox**:
- No environment variables passed
- No credential files mounted
- No access to production databases

**Cleanup**:
- Automatic destruction after validation
- No data persisted outside DB

### Data Protection

**Encryption**:
- GitHub tokens encrypted at rest (Fernet)
- Database connections over TLS
- API responses over HTTPS only

**Access Control**:
- Organization-scoped data access
- Repository-level permissions check
- No cross-org data leakage

### GitHub Permissions

**Minimal Scope**:
- `repo` - Access to code (required for scanning)
- `write:repo_hook` - Create webhooks (optional)
- `read:user` - Basic user info

**Draft PR Invariant**:
- All PRs created as draft
- Prevents accidental merges
- Enforced at code level + tests

---

## Scalability

### Concurrent Migrations

**Queue System** (Planned):
- Celery with Redis backend
- One migration per repository at a time
- Multiple providers can run in parallel

**Current Implementation**:
- Synchronous processing
- Webhook returns 202 (accepted) immediately
- Background processing via asyncio

### Large Codebases

**Streaming AST Parsing**:
- Parse files incrementally
- Don't load entire tree into memory
- Process files in parallel

**Caching**:
- Cache parsed AST between scans
- Invalidate on file change (git diff)
- Store in Redis or filesystem

**Benchmark** (1000 TypeScript files, ~50k LOC):
- Scan time: ~15 seconds
- Memory usage: ~500MB
- Can scale to 10k+ files

### Rate Limiting

**GitHub API**:
- 5000 requests/hour authenticated
- We use ~10 requests per migration
- Can handle 500 migrations/hour

**Provider Webhooks**:
- Rate limit per provider
- Configurable throttling
- Exponential backoff on errors

### Horizontal Scaling

**Stateless Backend**:
- No in-memory state
- All state in Postgres
- Can run multiple API instances behind load balancer

**Database**:
- Neon Postgres autoscales
- Connection pooling (PgBouncer)
- Read replicas for analytics queries

---

## Testing Strategy

### Test Pyramid

**Unit Tests** (73 tests):
- Change detection algorithms
- AST parsing logic
- Recipe transformations
- Validation logic

**Integration Tests** (27 tests):
- API endpoint testing (FastAPI TestClient)
- Database operations (SQLite in-memory)
- GitHub API mocking (responses library)
- Full pipeline runs (fixtures-based)

**Property Tests** (5 tests):
- YAML round-trip integrity
- AST parse/unparse equivalence
- Recipe determinism

**End-to-End Tests** (Manual):
- Full flow with real GitHub repo
- Actual webhook from provider
- PR creation validation

### Test Coverage

**Current**: 105 tests passing

**Coverage by Module**:
- Change detection: 95%
- AST discovery: 88%
- Impact analysis: 92%
- Migration engine: 90%
- Validation: 85%
- API routes: 78%

**Run Tests**:
```bash
# All tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=packages --cov=apps/api

# Specific module
pytest tests/test_change_detection.py -v
```

### Test Data

**Fixtures**:
- OpenAPI specs: `tests/fixtures/api-v{1,2}/*.yaml`
- Demo repository: `tests/fixtures/demo-repository/`
- Sample migrations: Seeded via `demo_data_seeder.py`

**Factories**:
- Use SQLAlchemy models directly
- No need for factory_boy (simple enough)

### Continuous Integration

**GitHub Actions** (`.github/workflows/test.yml`):
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -e ".[dev]"
      - run: pytest tests/ -v --cov
      - run: codecov # Upload coverage
```

---

## Deployment

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname
# Or use Neon-specific
NEON_API_KEY=...
NEON_PROJECT_ID=...

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...

# Gemini (optional, for LLM fallback)
GEMINI_API_KEY=...
```

**Optional**:
```bash
# Environment
ENVIRONMENT=production  # or development
DEBUG=false

# Demo mode
GITHUB_DEMO_REPO_PATH=/path/to/demo-repo
```

### Database Setup

```bash
# Run migrations
alembic upgrade head

# Seed demo data (optional)
python tests/fixtures/demo_data_seeder.py --populate
```

### Running in Production

**Backend**:
```bash
# Install dependencies
pip install -e .

# Run with Gunicorn (production)
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

**Frontend**:
```bash
# Build
npm run build

# Serve static files
# (or deploy dist/ to CDN)
```

### Docker (Planned)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -e .
CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

---

## Monitoring & Observability

### Logging

**Structured Logging**:
```python
import structlog

logger = structlog.get_logger()
logger.info("migration_started", 
  migration_id=mig.id, 
  provider=mig.provider,
  repository=repo.github_repo
)
```

**Log Levels**:
- DEBUG: AST parsing details, recipe matching
- INFO: Migration start/end, PR created
- WARNING: Validation failures, retries
- ERROR: System errors, GitHub API failures

### Metrics (Planned)

**Key Metrics**:
- Migrations per hour
- Success rate (%)
- Average validation time
- API response times (p50, p95, p99)

**Tools**:
- Prometheus + Grafana (self-hosted)
- Or: Datadog, New Relic (SaaS)

### Alerting

**Critical Alerts**:
- Migration success rate < 80%
- Validation time > 5 minutes
- Database connection failures
- GitHub API rate limit approaching

---

## Future Enhancements

### Short-term (3 months)
- Add more provider recipes (Twilio, SendGrid, Auth0)
- Python SDK support (in addition to JS/TS)
- Webhook UI for provider configuration
- Real-time frontend updates (WebSockets)

### Medium-term (6 months)
- AST-based transformations (not just string replace)
- Machine learning for recipe generation
- Multi-repository migrations (bulk)
- Self-service recipe builder UI

### Long-term (12 months)
- Marketplace for community recipes
- Enterprise features (SSO, audit logs)
- On-premise deployment option
- IDE plugins (VS Code extension)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Quick Links**:
- [Demo Guide](./DEMO_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Testing Guide](./TESTING.md)
- [Recipe Development Guide](./docs/RECIPE_GUIDE.md)

---

**Questions?** Open an issue on GitHub or contact the maintainers.
