"""Migration planner orchestrating deterministic recipes with bounded LLM fallback."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Type

from packages.change_engine.models import APIChange
from packages.impact_engine.models import ImpactReport
from .models import MigrationPlan, FilePatch
from .recipes.base import MigrationRecipe
from .recipes.fakepay import FakePayV1ToV2Recipe
from .llm.base import LLMProvider, StubLLMProvider
from .llm.gemini import GeminiLLMProvider

# Active recipe registry
RECIPE_REGISTRY: list[Type[MigrationRecipe]] = [
    FakePayV1ToV2Recipe,
]


def generate_migration_plan(
    repo_path: str | Path,
    changes: list[APIChange],
    impact_report: ImpactReport,
    llm_provider: LLMProvider | None = None,
) -> MigrationPlan:
    """Generate a migration plan with file patches.

    Execution Flow:
    1. Deterministic-first: Check if a registered recipe can handle all changes.
    2. Fallback: If no recipe matches, invoke LLMProvider with strictly bounded context.
    """
    root = Path(repo_path).resolve()
    provider = impact_report.provider

    # 1. Deterministic-first: Search recipes
    for recipe_cls in RECIPE_REGISTRY:
        recipe = recipe_cls()
        if recipe.can_handle(changes, provider):
            return recipe.apply(root, changes, impact_report)

    # 2. LLM Fallback (bounded context)
    if llm_provider:
        provider_inst = llm_provider
    elif os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        provider_inst = GeminiLLMProvider()
    else:
        provider_inst = StubLLMProvider()
    steps: list[str] = []
    patches: list[FilePatch] = []

    for change in changes:
        bounded_context = {
            "provider": provider,
            "affected_files": impact_report.affected_files,
            "change_type": change.type.value,
        }
        plan_steps = provider_inst.generate_plan(change, bounded_context)
        steps.extend(plan_steps)

        # Generate patches for affected files
        for rel_file in impact_report.affected_files:
            file_abs = root / rel_file
            if file_abs.is_file():
                orig_content = file_abs.read_text(encoding="utf-8")
                patched_content = provider_inst.generate_patch(
                    rel_file, orig_content, change, bounded_context
                )
                if patched_content != orig_content:
                    patches.append(
                        FilePatch(
                            file_path=rel_file,
                            original_content=orig_content,
                            modified_content=patched_content,
                            description=f"LLM-generated patch for {change.description}",
                        )
                    )

    return MigrationPlan(
        provider=provider,
        recipe_name=None,
        steps=steps,
        file_patches=patches,
        confidence=0.75,
        risk_level=impact_report.risk_level.value,
        is_deterministic=False,
        summary=f"LLM-assisted migration plan generated {len(patches)} patch(es).",
    )
