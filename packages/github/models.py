"""Data models for GitHub draft PR generation and branches."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class GitHubDraftPR:
    """A generated GitHub Draft Pull Request payload."""

    repo_name: str
    branch_name: str
    base_branch: str
    title: str
    body: str
    changed_files: list[str]
    is_draft: bool = True  # Strict invariant: MVP only creates DRAFT PRs
    pr_number: int | None = None
    pr_url: str | None = None

    def __post_init__(self):
        # Enforce invariant: PRs created by the agent MUST always be draft PRs
        if not self.is_draft:
            raise ValueError("Safety violation: Agent PRs must always be draft PRs.")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
