# 🤖 Self-Maintaining API Agent

> **Autonomous API change detection, codebase impact analysis, bounded deterministic & Gemini LLM code migrations, isolated sandbox verification, and gated GitHub Draft PR automation.**

[![Tests](https://img.shields.io/badge/tests-88%20passed-brightgreen.svg)](file:///Users/rishabhrajsingh/Desktop/self-maintaining-apis/tests)
[![Database](https://img.shields.io/badge/database-Neon%20Lakebase%20Postgres-00E599.svg)](https://neon.tech)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%202.5-blue.svg)](https://deepmind.google/technologies/gemini/)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite%20%2B%20TS-61DAFB.svg)](file:///Users/rishabhrajsingh/Desktop/self-maintaining-apis/apps/web)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

---

## 📖 Overview

External third-party APIs (Stripe, Twilio, FakePay, etc.) constantly evolve, deprecate endpoints, rename methods, and introduce breaking schema changes. Engineering teams spend countless hours manually triaging changelogs, auditing repositories, rewriting SDK calls, fixing broken types, and running tests.

The **Self-Maintaining API Agent** transforms this workflow into an autonomous, closed-loop pipeline:
1. **Detects** breaking upstream API changes from OpenAPI specs, changelog feeds, or webhooks.
2. **Scans** your codebases via AST analysis to locate all affected SDK usages, endpoints, and types.
3. **Generates** surgical, bounded code patches using deterministic recipes with Google Gemini LLM fallback.
4. **Validates** all changes in an isolated disposable sandbox (build checks, API contract checks, and unit tests).
5. **Opens** a detailed **GitHub Draft PR** containing evidence and logs — strictly enforcing human review before merging.

---

## 🏗️ System Architecture & High-Level Design (HLD)

### 1. Autonomous Pipeline Flow
```mermaid
flowchart TD
    A["📡 Upstream Provider Release\n(Webhook / OpenAPI Spec / Changelog)"] --> B["🔍 Change Engine\n(AST Spec Diffing & Severity Classifier)"]
    B --> C["📦 Repository Scanner\n(4-Tier AST Discovery & Symbol Indexing)"]
    C --> D["📊 Impact Engine\n(Caller Tracing & Risk/Confidence Scoring)"]
    D --> E{"⚙️ Migration Planner"}
    E -->|"Deterministic Recipe"| F["📝 Code Transformer\n(Unified File Patches)"]
    E -->|"Unseen Provider"| G["🧠 Google Gemini LLM\n(Bounded Context Patching)"]
    F --> H["🧪 Isolated Disposable Sandbox\n(Build, Contract Check & Unit Tests)"]
    G --> H
    H --> I{"Validation Status"}
    I -->|"❌ FAIL"| J["🚫 Pipeline Blocked\n(Error Logs Persisted to Neon DB)"]
    I -->|"✅ PASS"| K["🐙 GitHub Adapter\n(Creates Branch & Opens Draft PR)"]
    K --> L["👤 Human Engineering Review\n(Strict Safety Invariant: No Auto-Merge)"]
```

### 2. Component & Storage Architecture
```mermaid
graph TB
    subgraph Client Layer
        WebUI["💻 React + Vite Web Dashboard\n(9-Step Wizard, Inventory, Diff Viewer)"]
    end

    subgraph Control Plane
        FastAPI["⚡ FastAPI API Server (Port 8000)\n(/api/inventory, /api/changes, /api/migrations)"]
        WebhookHandler["🪝 Webhook Receiver\n(HMAC SHA-256 Verified)"]
    end

    subgraph Intelligence & Execution Engine
        ChangeEngine["Change Engine (OpenAPI Diff)"]
        Scanner["Repo Scanner (TypeScript AST)"]
        ImpactEngine["Impact Engine (Code Graph)"]
        MigrationEngine["Migration Engine (Deterministic + Gemini)"]
        Sandbox["Disposable Sandbox (Isolated Worker)"]
    end

    subgraph Data & AI Primitives
        NeonPooled[("🐘 Neon Lakebase Postgres\n(Runtime Connection Pooling)")]
        NeonDirect[("🐘 Neon Lakebase Postgres\n(Direct DDL / Schema Migrations)")]
        GeminiAPI["✨ Google Gemini API\n(gemini-2.5-flash)"]
    end

    WebUI -->|HTTP / REST| FastAPI
    FastAPI --> WebhookHandler
    WebhookHandler --> ChangeEngine
    ChangeEngine --> Scanner
    Scanner --> ImpactEngine
    ImpactEngine --> MigrationEngine
    MigrationEngine -->|Bounded Context| GeminiAPI
    MigrationEngine --> Sandbox
    FastAPI -->|Query Traffic| NeonPooled
    FastAPI -->|DDL / Schema| NeonDirect
    Sandbox -->|Results & Audit Logs| NeonPooled
```

---

## 🔄 9-Step User Journey & Onboarding Workflow

The platform features an interactive 9-step guided workflow:

```
[ Step 1: Login ] ──────────► [ Step 2: Select Workspace ]
                                            │
                                            ▼
[ Step 4: Select Repositories ] ◄─ [ Step 3: Connect GitHub ]
         │                          (GitHub App / OAuth / Token)
         ▼
[ Step 5: Run Initial Scan ] ──► [ Step 6: Review API Inventory ]
                                            │
                                            ▼
[ Step 8: Automation Settings ] ◄─ [ Step 7: Connect Providers ]
         │                          (FakePay, Stripe, Webhook keys)
         ▼
[ Step 9: Live Dashboard & Migration Console ]
```

1. **Log in**: Authenticate with active session management.
2. **Workspace**: Group repositories and provider configurations under an organization.
3. **Connect GitHub**: Authorize GitHub App with granular repository permissions.
4. **Select Repositories**: Choose specific repositories for ingestion (`demo-checkout`, etc.).
5. **Initial Scan**: Execute deep 4-tier AST discovery on ingested repositories.
6. **API Inventory**: Inspect discovered SDKs, base URL configs, endpoints, and exact file/line locations.
7. **Connect Providers**: Configure webhook HMAC secrets and changelog feeds (FakePay, Stripe).
8. **Configure Automation**: Set auto-scan triggers, confidence threshold sliders, and Draft PR gating.
9. **Dashboard**: Access real-time monitoring, side-by-side spec diffs, sandbox test logs, and PR links.

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Backend & API** | Python 3.12, FastAPI, SQLAlchemy 2.0, Psycopg 3, Uvicorn, Pytest | High-performance REST control plane and webhook receivers |
| **Database** | **Neon Lakebase Postgres** | Serverless PostgreSQL with pooled and unpooled connection support |
| **LLM Provider** | **Google Gemini 2.5 Flash / Pro** | Bounded context code patching, explanation, and recipe fallback |
| **Frontend** | React 19, Vite, TypeScript, Vanilla CSS, Lucide Icons | Dark-mode glassmorphic dashboard with live diff highlighting |
| **AST & Code Analysis** | TypeScript AST Regex Parser, Ripgrep, PyYAML | Deep static analysis detecting endpoints, callers, and types |
| **Sandbox & Validation** | Disposable subprocess worktrees, Node/TypeScript validation | Isolated test execution preventing dirtying host repository |
| **Tunnel & Public URL** | Cloudflare Tunnels (`cloudflared`) | Secure public HTTPS tunneling for live webhook demos |

---

## ✨ What Has Been Built

- ✅ **Milestones 1–9 Core Engine** (88/88 automated tests passing in ~30s).
- ✅ **Deterministic AST Diffing**: Detects endpoint renames (`/payment` → `/payments`) and schema requirement changes (`currency: required`).
- ✅ **4-Tier Repository Scanner**: Maps package manifests, URL constants, client wrapper methods, and call sites.
- ✅ **Impact Engine**: Computes exact file impact sets, caller chains, risk levels, and confidence scores.
- ✅ **Deterministic Recipes & Gemini LLM Fallback**: Generates clean unified diffs across multiple files simultaneously.
- ✅ **Isolated Disposable Sandbox**: Verifies patch application, TypeScript compilation, contract matching, and unit tests.
- ✅ **GitHub Adapter**: Formats evidence-rich Draft PR markdown with validation logs.
- ✅ **Neon Lakebase Postgres Integration**: Schema tables created and seeded (`organizations`, `repositories`, `providers`, `api_versions`, `api_changes`, `api_usages`, `migration_runs`, `validation_runs`, `users`, `github_installations`, `automation_settings`).
- ✅ **FastAPI REST Control Plane**: Complete suite of endpoints under `/api/...` with CORS support.
- ✅ **React Web Dashboard**: Interactive UI with Dashboard, Repositories, API Inventory, Changes, Impact, Migration Console, Settings, and 9-Step Onboarding Stepper.
- ✅ **One-Click Demo Runner**: Complete autonomous simulation in a single command.

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+** and **npm**
- **Git**
- **Cloudflared** *(optional, for public tunneling)*: `brew install cloudflared`

### 2. Clone the Repository
```bash
git clone https://github.com/rizzzabh-06/self-maintaining-apis.git
cd self-maintaining-apis
```

### 3. Python Virtual Environment & Dependencies
```bash
# Create & activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python packages
pip install -e ".[dev]"
pip install "psycopg[binary]" google-generativeai fastapi uvicorn httpx pyyaml
```

### 4. Configure Environment Variables (`.env`)
Create a `.env` file in the root directory:
```bash
# Neon Lakebase Postgres Connection
DATABASE_URL=postgresql://neondb_owner:***@ep-holy-star-ae1nu5dw-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:***@ep-holy-star-ae1nu5dw.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require

# Google Gemini LLM API
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash

# Provider Webhook Secrets
FAKEPAY_API_KEY=fakepay_live_key_demo
FAKEPAY_WEBHOOK_SECRET=test_webhook_secret_key_123

# GitHub App Configuration (Draft PR only)
GITHUB_APP_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=test_github_webhook_secret_123
GITHUB_PRIVATE_KEY_PATH=
```

### 5. Initialize the Neon Database Tables
```bash
python3 -m apps.api.app.db.init_db
python3 -m scripts.seed_demo
```

### 6. Install Frontend Dependencies
```bash
cd apps/web
npm install
cd ../..
```

---

## 💻 Useful Commands & Run Scripts

### A. Run the 1-Click End-to-End Demo
Executes the complete autonomous pipeline live against Neon Postgres:
```bash
python3 -m scripts.run_demo
```

### B. Start the FastAPI Backend Server
```bash
uvicorn apps.api.app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### C. Start the React Frontend Dashboard
```bash
cd apps/web
npm run dev
```
- Web Dashboard: `http://localhost:5173`

### D. Run the Full Test Suite
```bash
python3 -m pytest tests/ -v
```

### E. Expose to Public URL via Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:5173
```

---

## 🔒 Safety Invariants & Guardrails

1. **Strict Draft PR Invariant**: The agent **only** opens `draft: true` pull requests. It has zero permissions to merge code or deploy autonomously.
2. **Isolated Disposable Sandboxes**: Patches are generated and tested inside temporary worktrees. Host repositories are never modified directly.
3. **Deterministic First**: Known migration patterns use AST-verified deterministic recipes; LLMs are bounded strictly to changed file context with zero codebase leakage.
4. **Validation Gate**: A PR is generated **only if and only if** TypeScript build, API contract checks, and unit tests all return `PASS (100%)`.

---

## 📄 License
MIT License. Created by [Rizzabh](https://github.com/rizzzabh-06).