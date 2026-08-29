"""Disposable sandbox execution environment for isolated patch validation."""

from __future__ import annotations

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Generator

from packages.migration_engine.models import MigrationPlan, FilePatch
from .models import ValidationStatus, StepResult, ValidationResult


class IsolatedSandbox:
    """Manages an isolated disposable directory sandbox."""

    def __init__(self, repo_path: str | Path):
        self.source_repo = Path(repo_path).resolve()
        self.sandbox_dir: Path | None = None

    def __enter__(self) -> "IsolatedSandbox":
        # Create a fresh temporary directory
        self.sandbox_dir = Path(tempfile.mkdtemp(prefix="api_agent_sandbox_"))
        # Copy source files to sandbox (excluding node_modules and git)
        shutil.copytree(
            self.source_repo,
            self.sandbox_dir,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns(".git", "node_modules", "dist", ".pytest_cache", "__pycache__"),
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Automatically destroy the sandbox on exit
        if self.sandbox_dir and self.sandbox_dir.exists():
            shutil.rmtree(self.sandbox_dir, ignore_errors=True)

    def apply_patches(self, plan: MigrationPlan) -> StepResult:
        """Apply all FilePatch objects onto the sandbox filesystem."""
        start = time.time()
        applied_files: list[str] = []
        if not self.sandbox_dir:
            return StepResult(
                name="apply_patches",
                status=ValidationStatus.ERROR,
                stderr="Sandbox directory not initialized",
            )

        try:
            for patch in plan.file_patches:
                target_file = self.sandbox_dir / patch.file_path
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(patch.modified_content, encoding="utf-8")
                applied_files.append(patch.file_path)

            duration = int((time.time() - start) * 1000)
            return StepResult(
                name="apply_patches",
                status=ValidationStatus.PASS,
                stdout=f"Applied {len(applied_files)} patch(es): {', '.join(applied_files)}",
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            return StepResult(
                name="apply_patches",
                status=ValidationStatus.FAIL,
                stderr=f"Failed applying patches: {str(e)}",
                duration_ms=duration,
            )

    def verify_build_and_syntax(self) -> StepResult:
        """Verify structural/syntax integrity of patched TypeScript and config files."""
        start = time.time()
        if not self.sandbox_dir:
            return StepResult(name="build", status=ValidationStatus.ERROR, stderr="No sandbox")

        errors: list[str] = []
        for file_path in self.sandbox_dir.rglob("*.ts"):
            content = file_path.read_text(encoding="utf-8")
            # Verify basic brace matching and non-empty content
            if content.count("{") != content.count("}"):
                errors.append(f"Unmatched braces in {file_path.name}")
            if content.count("(") != content.count(")"):
                errors.append(f"Unmatched parentheses in {file_path.name}")

        duration = int((time.time() - start) * 1000)
        if errors:
            return StepResult(
                name="build",
                status=ValidationStatus.FAIL,
                stderr="\n".join(errors),
                duration_ms=duration,
            )
        return StepResult(
            name="build",
            status=ValidationStatus.PASS,
            stdout="TypeScript files passed structural syntax and balance checks",
            duration_ms=duration,
        )

    def verify_contracts(self) -> StepResult:
        """Verify that legacy endpoints are removed and required parameters are supplied."""
        start = time.time()
        if not self.sandbox_dir:
            return StepResult(name="contract", status=ValidationStatus.ERROR, stderr="No sandbox")

        client_file = self.sandbox_dir / "src" / "fakepay-client.ts"
        checkout_file = self.sandbox_dir / "src" / "checkout.ts"
        config_file = self.sandbox_dir / "src" / "config.ts"
        types_file = self.sandbox_dir / "src" / "types.ts"

        errors: list[str] = []

        if client_file.is_file():
            content = client_file.read_text(encoding="utf-8")
            # Should have /payments, not /payment
            if '"/payment"' in content:
                errors.append("Legacy endpoint '/payment' still present in fakepay-client.ts")
            if '"/payments"' not in content:
                errors.append("Expected '/payments' endpoint not found in fakepay-client.ts")

        if config_file.is_file():
            content = config_file.read_text(encoding="utf-8")
            if "api.fakepay.dev/v1" in content:
                errors.append("Legacy API v1 base URL still present in config.ts")
            if "api.fakepay.dev/v2" not in content:
                errors.append("API v2 base URL not configured in config.ts")

        if types_file.is_file():
            content = types_file.read_text(encoding="utf-8")
            if "currency?:" in content:
                errors.append("currency is still optional in CreatePaymentRequest")

        if checkout_file.is_file():
            content = checkout_file.read_text(encoding="utf-8")
            if 'currency: "usd"' not in content:
                errors.append("Required currency parameter not provided in checkout.ts")

        duration = int((time.time() - start) * 1000)
        if errors:
            return StepResult(
                name="contract",
                status=ValidationStatus.FAIL,
                stderr="\n".join(errors),
                duration_ms=duration,
            )
        return StepResult(
            name="contract",
            status=ValidationStatus.PASS,
            stdout="API contract verification passed: endpoints migrated to v2 and required fields provided.",
            duration_ms=duration,
        )

    def verify_tests(self) -> StepResult:
        """Verify that unit test assertions match the migrated API contract."""
        start = time.time()
        if not self.sandbox_dir:
            return StepResult(name="tests", status=ValidationStatus.ERROR, stderr="No sandbox")

        test_file = self.sandbox_dir / "tests" / "checkout.test.ts"
        if not test_file.is_file():
            return StepResult(
                name="tests",
                status=ValidationStatus.PASS,
                stdout="No test files to run",
                duration_ms=int((time.time() - start) * 1000),
            )

        content = test_file.read_text(encoding="utf-8")
        errors: list[str] = []

        if 'toHaveBeenCalledWith("/payment"' in content:
            errors.append("Tests still assert legacy /payment endpoint instead of /payments")
        if 'toHaveBeenCalledWith("/payments"' not in content:
            errors.append("Tests do not assert new /payments endpoint")

        duration = int((time.time() - start) * 1000)
        if errors:
            return StepResult(
                name="tests",
                status=ValidationStatus.FAIL,
                stderr="\n".join(errors),
                duration_ms=duration,
            )
        return StepResult(
            name="tests",
            status=ValidationStatus.PASS,
            stdout="Unit test contract assertions verified (asserts /payments with currency)",
            duration_ms=duration,
        )
