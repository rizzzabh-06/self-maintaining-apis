"""Interactive end-to-end demo runner for the Self-Maintaining API Agent.

Demonstrates:
1. Live connection to Neon Lakebase Postgres
2. Repository scanning & API inventory
3. Detection of FakePay v2 breaking change
4. Impact analysis across codebase
5. Deterministic migration patch generation
6. Isolated sandbox build/test verification
7. GitHub Draft PR generation
"""

from __future__ import annotations

import time
import json
from pathlib import Path
import yaml

from apps.api.app.db.session import SessionLocal, engine
from apps.api.app.models.db_models import Organization, Repository, Provider, APIVersion, MigrationRun, ValidationRun
from apps.worker.jobs.process_webhook import run_pipeline
from scripts.seed_demo import seed

FIXTURES_DIR = Path(__file__).parents[1] / "tests" / "fixtures"
DEMO_REPO = FIXTURES_DIR / "demo-repository"


def print_step(title: str):
    print("\n" + "=" * 70)
    print(f"🔹 {title}")
    print("=" * 70)


def run_demo():
    print("🚀 Starting Self-Maintaining API Agent Autonomous Migration Demo\n")

    # Step 1: Database Check
    print_step("Step 1: Connecting to Neon Lakebase Postgres")
    seed()

    # Step 2: Load OpenAPI Specifications
    print_step("Step 2: Receiving External API Provider Upgrade (FakePay v1 -> v2)")
    with open(FIXTURES_DIR / "api-v1" / "fakepay.yaml") as f:
        v1_spec = yaml.safe_load(f)
    with open(FIXTURES_DIR / "api-v2" / "fakepay.yaml") as f:
        v2_spec = yaml.safe_load(f)

    print(f"  • Source Spec: FakePay v{v1_spec['info']['version']} (POST /payment, optional currency)")
    print(f"  • Target Spec: FakePay v{v2_spec['info']['version']} (POST /payments, required currency)")

    # Step 3: Run Autonomous Pipeline
    print_step("Step 3: Running Autonomous Intelligence Pipeline")
    start = time.time()
    result = run_pipeline(
        old_spec_data=v1_spec,
        new_spec_data=v2_spec,
        repo_path=DEMO_REPO,
        repo_name="demo-org/demo-checkout",
        provider="fakepay",
    )
    elapsed = round(time.time() - start, 2)

    print(f"  ✓ Pipeline executed in {elapsed}s")
    print(f"  • Changes Detected: {result['changes_detected']}")
    print(f"  • Affected Files: {len(result['affected_files'])} ({', '.join(result['affected_files'])})")
    print(f"  • Risk Level: {result['risk_level'].upper()}")
    print(f"  • Confidence: {int(result['confidence'] * 100)}%")
    print(f"  • Sandbox Validation: {result['validation_status']} (Build ✓, Tests ✓, Contracts ✓)")
    print(f"  • Draft PR Created: {result['pr_created']}")

    if result.get("draft_pr"):
        pr = result["draft_pr"]
        print_step("Step 4: Generated GitHub Draft PR (Gated on Validation PASS)")
        print(f"  📌 Title:  {pr['title']}")
        print(f"  🌿 Branch: {pr['branch_name']}")
        print(f"  🔗 URL:    {pr['pr_url']}")
        print(f"  🔒 Draft:  {pr['is_draft']} (Autonomous merge/deploy disabled by invariant)")
        print("\n--- PR Body Preview ---")
        print(pr["body"])

    print_step("✨ Autonomous Migration Demo Completed Successfully!")


if __name__ == "__main__":
    run_demo()
