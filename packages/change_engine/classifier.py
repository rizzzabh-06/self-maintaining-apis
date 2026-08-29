"""Classifies a list of APIChanges into severity/risk categories.

For MVP this is straightforward — breaking changes are high severity.
Kept as a separate module so the classifier can grow independently of the diff logic.
"""

from __future__ import annotations

from .models import APIChange, ChangeType

# Change types that are always breaking
_BREAKING_TYPES = frozenset({
    ChangeType.ENDPOINT_REMOVED,
    ChangeType.ENDPOINT_RENAMED,
    ChangeType.FIELD_REQUIRED,
    ChangeType.FIELD_REMOVED,
})


def is_breaking(change: APIChange) -> bool:
    """Determine if a change is breaking. Uses the structural type as ground truth."""
    return change.type in _BREAKING_TYPES


def classify_severity(changes: list[APIChange]) -> str:
    """Return an overall severity for a set of changes.

    Returns: 'critical', 'warning', or 'info'
    """
    if any(c.type in (ChangeType.ENDPOINT_REMOVED, ChangeType.ENDPOINT_RENAMED) for c in changes):
        return "critical"
    if any(c.type == ChangeType.FIELD_REQUIRED for c in changes):
        return "warning"
    return "info"
