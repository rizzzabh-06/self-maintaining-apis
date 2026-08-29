"""Data models for API change impact analysis."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any

from packages.change_engine.models import APIChange


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AffectedUsage:
    """A specific symbol, line, or file affected by an API change."""

    file_path: str
    change_reason: str
    confidence: float
    usage_type: str
    line_number: int | None = None
    symbol: str | None = None
    snippet: str | None = None
    related_change: APIChange | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        if self.related_change:
            data["related_change"] = self.related_change.to_dict()
        return {k: v for k, v in data.items() if v is not None}


@dataclass
class ImpactReport:
    """Consolidated impact analysis report."""

    provider: str
    repository_path: str
    changes: list[APIChange]
    affected_files: list[str]
    affected_usages: list[AffectedUsage]
    overall_confidence: float
    risk_level: RiskLevel
    summary: str

    def usages_for_file(self, file_path: str) -> list[AffectedUsage]:
        return [u for u in self.affected_usages if u.file_path == file_path]

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "repository_path": self.repository_path,
            "changes": [c.to_dict() for c in self.changes],
            "affected_files": self.affected_files,
            "affected_usages": [u.to_dict() for u in self.affected_usages],
            "overall_confidence": round(self.overall_confidence, 2),
            "risk_level": self.risk_level.value,
            "summary": self.summary,
        }
