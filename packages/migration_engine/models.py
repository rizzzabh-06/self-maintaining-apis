"""Data models for migration planning and patch generation."""

from __future__ import annotations

import difflib
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class FilePatch:
    """A generated patch for a single file."""

    file_path: str
    original_content: str
    modified_content: str
    description: str
    diff: str = ""

    def __post_init__(self):
        if not self.diff and self.original_content and self.modified_content:
            diff_lines = difflib.unified_diff(
                self.original_content.splitlines(keepends=True),
                self.modified_content.splitlines(keepends=True),
                fromfile=f"a/{self.file_path}",
                tofile=f"b/{self.file_path}",
            )
            self.diff = "".join(diff_lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_path": self.file_path,
            "description": self.description,
            "diff": self.diff,
        }


@dataclass
class MigrationPlan:
    """A complete migration plan with step-by-step actions and generated patches."""

    provider: str
    recipe_name: str | None
    steps: list[str]
    file_patches: list[FilePatch]
    confidence: float
    risk_level: str
    is_deterministic: bool
    summary: str = ""

    @property
    def changed_files(self) -> list[str]:
        return [p.file_path for p in self.file_patches]

    def patch_for_file(self, file_path: str) -> FilePatch | None:
        for p in self.file_patches:
            if p.file_path == file_path:
                return p
        return None

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "recipe_name": self.recipe_name,
            "steps": self.steps,
            "changed_files": self.changed_files,
            "file_patches": [p.to_dict() for p in self.file_patches],
            "confidence": round(self.confidence, 2),
            "risk_level": self.risk_level,
            "is_deterministic": self.is_deterministic,
            "summary": self.summary,
        }
