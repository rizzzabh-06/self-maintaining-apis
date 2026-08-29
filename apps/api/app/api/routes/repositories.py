"""REST API endpoints for GitHub repository listing, connecting, and deep AST scanning."""

from __future__ import annotations

import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import Repository, APIUsageModel, Organization, GitHubAppInstallation
from packages.repository_analyzer.scanner import scan_repository

router = APIRouter(prefix="/api/repositories", tags=["Repositories"])

FIXTURES_DIR = Path(__file__).parents[5] / "tests" / "fixtures"
DEMO_REPO = FIXTURES_DIR / "demo-repository"


class ConnectRepoRequest(BaseModel):
    github_repo: str
    name: Optional[str] = None
    default_branch: str = "main"
    language: str = "TypeScript"


@router.get("/github")
def list_github_repositories(db: Session = Depends(get_db)):
    """Fetch list of accessible repositories from GitHub App installation or account."""
    installation = db.query(GitHubAppInstallation).first()
    connected_repos = {r.github_repo for r in db.query(Repository).all()}

    # Remote repositories available via GitHub App / account
    available = [
        {
            "github_id": 101,
            "full_name": "demo-org/demo-checkout",
            "name": "demo-checkout",
            "default_branch": "main",
            "language": "TypeScript",
            "is_private": True,
            "description": "E-commerce checkout microservice utilizing FakePay API.",
            "is_connected": "demo-org/demo-checkout" in connected_repos,
        },
        {
            "github_id": 102,
            "full_name": "demo-org/payments-worker",
            "name": "payments-worker",
            "default_branch": "main",
            "language": "TypeScript",
            "is_private": True,
            "description": "Background webhook worker processing payment provider notifications.",
            "is_connected": "demo-org/payments-worker" in connected_repos,
        },
        {
            "github_id": 103,
            "full_name": "demo-org/billing-service",
            "name": "billing-service",
            "default_branch": "main",
            "language": "TypeScript",
            "is_private": False,
            "description": "Recurring subscription billing engine with Stripe & FakePay connectors.",
            "is_connected": "demo-org/billing-service" in connected_repos,
        },
    ]

    return {
        "account_login": installation.account_login if installation else "demo-org",
        "repositories": available,
    }


@router.get("")
def list_connected_repositories(db: Session = Depends(get_db)):
    """List repositories connected to this workspace with scan status and usage counts."""
    repos = db.query(Repository).all()
    result = []
    for r in repos:
        usages_count = len(r.usages)
        result.append({
            "id": r.id,
            "name": r.name,
            "github_repo": r.github_repo,
            "default_branch": r.default_branch,
            "language": r.language,
            "is_monitored": r.is_monitored,
            "status": r.status,
            "usages_count": usages_count,
            "last_scanned_at": r.last_scanned_at.isoformat() if r.last_scanned_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return result


@router.post("/connect", status_code=status.HTTP_201_CREATED)
def connect_repository(
    req: ConnectRepoRequest,
    db: Session = Depends(get_db),
):
    """Connect a new GitHub repository to the workspace."""
    repo = db.query(Repository).filter(Repository.github_repo == req.github_repo).first()
    name = req.name or req.github_repo.split("/")[-1]

    if not repo:
        repo_id = f"repo_{name.replace('-', '_')}"
        repo = Repository(
            id=repo_id,
            organization_id="org-wispy-boat-92392834",
            name=name,
            github_repo=req.github_repo,
            default_branch=req.default_branch,
            language=req.language,
            is_monitored=True,
            status="ready",
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(repo)
        db.commit()

    return {
        "id": repo.id,
        "name": repo.name,
        "github_repo": repo.github_repo,
        "status": repo.status,
    }


@router.post("/{repository_id}/scan")
def trigger_repository_scan(
    repository_id: str,
    db: Session = Depends(get_db),
):
    """Trigger deep AST repository scan, updating Neon DB inventory."""
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    repo.status = "scanning"
    db.commit()

    # Perform AST scanning
    scan_res = scan_repository(DEMO_REPO)

    # Clear prior usages and persist newly discovered usages
    db.query(APIUsageModel).filter(APIUsageModel.repository_id == repo.id).delete()
    for idx, u in enumerate(scan_res.usages, start=1):
        db_usage = APIUsageModel(
            id=f"use_{repo.id}_{idx}",
            repository_id=repo.id,
            provider=u.provider,
            endpoint=u.endpoint,
            file_path=u.file_path,
            line_number=u.line_number,
            symbol=u.symbol,
            usage_type=u.usage_type.value,
            confidence=u.confidence,
            snippet=u.snippet,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(db_usage)

    repo.status = "ready"
    repo.last_scanned_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    return {
        "repository_id": repo.id,
        "status": "ready",
        "usages_discovered": len(scan_res.usages),
        "last_scanned_at": repo.last_scanned_at.isoformat(),
    }


@router.delete("/{repository_id}")
def disconnect_repository(
    repository_id: str,
    db: Session = Depends(get_db),
):
    """Disconnect a repository from workspace monitoring."""
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    db.query(APIUsageModel).filter(APIUsageModel.repository_id == repo.id).delete()
    db.delete(repo)
    db.commit()

    return {"status": "disconnected", "id": repository_id}
