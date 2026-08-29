# Self-Maintaining API Agent

Detects external API changes, finds affected code, generates bounded migrations, validates in an isolated sandbox, and opens a GitHub draft PR for human review. Never deploys or merges autonomously.

## Status

| Milestone | Status |
|---|---|
| 1. Fixtures (FakePay v1/v2 + demo-checkout) | ✅ Complete |
| 2. Change Engine (structural diff → api_changes) | ✅ Complete |
| 3. Repository Scanner | ✅ Complete |
| 4. Impact Engine | ✅ Complete |
| 5. Migration Engine | ✅ Complete |
| 6. Sandbox + Validation | ✅ Complete |
| 7. GitHub Adapter | ✅ Complete |
| 8. Webhook Receiver | 🔲 Next |

## Architecture

```
API Provider → Change Engine → Repository Scanner → Impact Engine
→ Migration Engine → Docker Sandbox → Validation → GitHub Draft PR
→ Human Review → Merge
```

## Tech Stack

- **Backend**: Python + FastAPI
- **Frontend**: React + Vite + TypeScript
- **DB**: PostgreSQL
- **Queue**: Redis + worker
- **Sandbox**: Docker (disposable containers)
- **LLM**: Behind `LLMProvider` interface (bounded context only)
- **SCM**: GitHub App (read repo + create branch/commit/PR)

## Quick Start

```bash
# Install
pip install -e ".[dev]"

# Run tests
python3 -m pytest tests/ -v
```

## Constraints

- Evidence-first: every change backed by a diff artifact, not an LLM guess
- Deterministic-first: known patterns use recipes; LLM is fallback only
- Isolated execution: patches applied/tested only inside disposable Docker containers
- PR, not push: the only production-facing side effect is a **draft** PR