"""Data models for sandbox validation execution and PASS/FAIL reporting."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class ValidationStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ERROR = "ERROR"
    SKIPPED = "SKIPPED"


@dataclass
class StepResult:
    """Result of a single validation step (e.g. patch, build, test, lint)."""

    name: str
    status: ValidationStatus
    exit_code: int = 0
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0

    @property
    def passed(self) -> bool:
        return self.status == ValidationStatus.PASS


@dataclass
class ValidationResult:
    """Consolidated result of sandbox validation."""

    overall_status: ValidationStatus
    steps: list[StepResult] = field(default_factory=list)
    build_passed: bool = False
    test_passed: bool = False
    lint_passed: bool = False
    contract_passed: bool = False
    error_summary: str | None = None

    @property
    def can_proceed_to_pr(self) -> bool:
        """PR creation is gated strictly on PASS."""
        return self.overall_status == ValidationStatus.PASS

    def step_by_name(self, name: str) -> StepResult | None:
        for s in self.steps:
            if s.name.lower() == name.lower():
                return s
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall_status": self.overall_status.value,
            "can_proceed_to_pr": self.can_proceed_to_pr,
            "build_passed": self.build_passed,
            "test_passed": self.test_passed,
            "lint_passed": self.lint_passed,
            "contract_passed": self.contract_passed,
            "error_summary": self.error_summary,
            "steps": [
                {
                    "name": s.name,
                    "status": s.status.value,
                    "exit_code": s.exit_code,
                    "stdout": s.stdout,
                    "stderr": s.stderr,
                    "duration_ms": s.duration_ms,
                }
                for s in self.steps
            ],
        }
