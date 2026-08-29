"""LLM Provider abstraction layer.

Business logic MUST use this interface and never invoke vendor SDKs directly.
Context is strictly bounded to the change, relevant docs, and affected files/symbols.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from packages.change_engine.models import APIChange


class LLMProvider(ABC):
    """Abstract interface for LLM-assisted migration planning and code generation."""

    @abstractmethod
    def generate_plan(
        self,
        change: APIChange,
        context: dict[str, Any],
    ) -> list[str]:
        """Generate high-level step-by-step migration plan."""
        pass

    @abstractmethod
    def generate_patch(
        self,
        file_path: str,
        original_content: str,
        change: APIChange,
        context: dict[str, Any],
    ) -> str:
        """Generate patched file contents for a specific affected file."""
        pass

    @abstractmethod
    def explain_change(
        self,
        change: APIChange,
    ) -> str:
        """Provide a human-readable explanation of why this migration is necessary."""
        pass


class StubLLMProvider(LLMProvider):
    """Fallback stub provider for testing and offline execution."""

    def generate_plan(
        self,
        change: APIChange,
        context: dict[str, Any],
    ) -> list[str]:
        return [
            f"Review API change: {change.description}",
            "Update affected endpoints and type signatures",
            "Adjust callers to provide required parameters",
            "Update unit tests to reflect new API contracts",
        ]

    def generate_patch(
        self,
        file_path: str,
        original_content: str,
        change: APIChange,
        context: dict[str, Any],
    ) -> str:
        # Returns unmodified content by default if no LLM key configured
        return original_content

    def explain_change(
        self,
        change: APIChange,
    ) -> str:
        return f"API Migration needed: {change.description} (breaking={change.breaking})"
