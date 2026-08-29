"""Data models for structured API change records."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class ChangeType(str, Enum):
    ENDPOINT_ADDED = "endpoint_added"
    ENDPOINT_REMOVED = "endpoint_removed"
    ENDPOINT_RENAMED = "endpoint_renamed"
    FIELD_ADDED = "field_added"
    FIELD_REMOVED = "field_removed"
    FIELD_REQUIRED = "field_required"
    FIELD_OPTIONAL = "field_optional"
    TYPE_CHANGED = "type_changed"


@dataclass
class APIChange:
    """A single detected change between two API versions."""

    type: ChangeType
    breaking: bool
    description: str

    # Common fields
    method: str | None = None
    operation_id: str | None = None

    # Endpoint rename
    old_path: str | None = None
    new_path: str | None = None

    # Field change
    path: str | None = None
    location: str | None = None
    schema: str | None = None
    field: str | None = None
    old_required: bool | None = None
    new_required: bool | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize, dropping None values."""
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class ChangeReport:
    """Full diff report between two API versions."""

    provider: str
    from_version: str
    to_version: str
    date: str
    changes: list[APIChange] = field(default_factory=list)

    @property
    def breaking_changes(self) -> list[APIChange]:
        return [c for c in self.changes if c.breaking]

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "date": self.date,
            "changes": [c.to_dict() for c in self.changes],
        }
