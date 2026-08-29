"""Milestone 9 — Full End-to-End Pipeline Integration Test.

Tests the complete autonomous loop:
External API changes (FakePay v1 -> v2)
  -> Detect changes (Change Engine)
  -> Scan repository (Repository Scanner)
  -> Analyze impact (Impact Engine)
  -> Generate migration (Migration Engine)
  -> Validate in isolated sandbox (Validation Engine)
  -> Open GitHub Draft PR (GitHub Adapter)
"""

from pathlib import Path
import pytest
import yaml

from apps.worker.jobs.process_webhook import run_pipeline

FIXTURES = Path(__file__).parent / "fixtures"
DEMO_REPO = FIXTURES / "demo-repository"


class TestEndToEndPipeline:
    def test_full_pipeline_run(self):
        # 1. Load OpenAPI specifications
        with open(FIXTURES / "api-v1" / "fakepay.yaml") as f:
            v1_spec = yaml.safe_load(f)
        with open(FIXTURES / "api-v2" / "fakepay.yaml") as f:
            v2_spec = yaml.safe_load(f)

        # 2. Execute full pipeline
        result = run_pipeline(
            old_spec_data=v1_spec,
            new_spec_data=v2_spec,
            repo_path=DEMO_REPO,
            repo_name="demo-org/demo-checkout",
            provider="fakepay",
        )

        # 3. Assert pipeline outputs
        assert result["provider"] == "fakepay"
        assert result["changes_detected"] == 3
        assert len(result["affected_files"]) >= 4
        assert result["risk_level"] in ("critical", "high")
        assert result["confidence"] >= 0.85
        assert result["validation_status"] == "PASS"
        assert result["pr_created"] is True

        draft_pr = result["draft_pr"]
        assert draft_pr is not None
        assert draft_pr["is_draft"] is True
        assert "fakepay" in draft_pr["branch_name"]
        assert "Human review required" in draft_pr["body"]
        assert "POST /payment renamed to POST /payments" in draft_pr["body"]
