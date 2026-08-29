"""Base class and registry for deterministic migration recipes."""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List

from packages.change_engine.models import APIChange
from packages.impact_engine.models import ImpactReport
from ..models import MigrationPlan


class MigrationRecipe(ABC):
    """Abstract base class for deterministic migration recipes."""

    name: str = "base_recipe"
    provider: str = "generic"

    @abstractmethod
    def can_handle(self, changes: list[APIChange], provider: str) -> bool:
        """Check if this recipe can deterministically handle the given API changes."""
        pass

    @abstractmethod
    def apply(
        self,
        repo_path: Path,
        changes: list[APIChange],
        impact_report: ImpactReport,
    ) -> MigrationPlan:
        """Apply deterministic transformations and return the MigrationPlan."""
        pass
