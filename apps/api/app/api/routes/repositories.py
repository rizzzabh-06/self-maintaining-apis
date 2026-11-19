"""REST API endpoints for GitHub repository listing, connecting, and deep AST scanning."""

from __future__ import annotations

import datetime
import os
import subprocess
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.core.events import event_broadcaster
from apps.api.app.models.db_models import Repository, APIUsageModel, Organization, GitHubAppInstallation, MigrationRun, ValidationRun
from packages.repository_analyzer.scanner import scan_repository

router = APIRouter(prefix="/api/repositories", tags=["Repositories"])

REPOS_CACHE_DIR = Path(__file__).parents[5] / ".repos"


def _ensure_repository_local(repo: Repository, db: Session) -> Path:
    """Ensure repository files are present locally for static AST analysis.

    Clones (or pulls) the repository into ``.repos/{sanitized_name}``. Fails
    loudly on clone failure instead of falling back to a demo repository.
    """
    sanitized = repo.github_repo.replace("/", "_").replace(" ", "_")
    target_dir = REPOS_CACHE_DIR / sanitized

    installation = db.query(GitHubAppInstallation).first()
    token = installation.access_token if (installation and installation.access_token) else os.getenv("GITHUB_TOKEN")

    if target_dir.is_dir() and (target_dir / ".git").is_dir():
        try:
            subprocess.run(
                ["git", "pull", "--quiet"],
                cwd=target_dir,
                capture_output=True,
                text=True,
                timeout=25,
            )
            return target_dir
        except Exception:
            return target_dir

    # Clone fresh shallow copy
    target_dir.parent.mkdir(parents=True, exist_ok=True)
    if token:
        clone_url = f"https://x-access-token:{token}@github.com/{repo.github_repo}.git"
    else:
        clone_url = f"https://github.com/{repo.github_repo}.git"

    try:
        proc = subprocess.run(
            ["git", "clone", "--depth", "1", clone_url, str(target_dir)],
            capture_output=True,
            text=True,
            timeout=45,
        )
        if proc.returncode == 0 and target_dir.is_dir():
            return target_dir
        stderr = proc.stderr.strip() or "unknown error"
    except Exception as exc:
        stderr = str(exc)

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Failed to clone repository {repo.github_repo}: {stderr}",
    )


class ConnectRepoRequest(BaseModel):
    github_repo: str
    name: Optional[str] = None
    default_branch: str = "main"
    language: str = "TypeScript"


@router.get("/github")
def list_github_repositories(
    search: Optional[str] = Query(None, description="Search GitHub repositories"),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Fetch list of accessible repositories from GitHub account or search API."""
    installation = db.query(GitHubAppInstallation).first()
    connected_repos = {r.github_repo for r in db.query(Repository).all()}

    token = installation.access_token if (installation and installation.access_token) else os.getenv("GITHUB_TOKEN")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub not configured: no token and repository search failed",
        )

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Authorization": f"Bearer {token}",
    }
    repos_list = []

    def _enrich(item: dict) -> dict:
        return {
            "github_id": item["id"],
            "full_name": item["full_name"],
            "name": item["name"],
            "default_branch": item.get("default_branch", "main"),
            "language": item.get("language") or "TypeScript",
            "is_private": item.get("private", False),
            "description": item.get("description") or "",
            "html_url": item.get("html_url"),
            "stargazers_count": item.get("stargazers_count", 0),
            "is_connected": item["full_name"] in connected_repos,
        }

    # 1. If search query is provided, query GitHub Search API
    if search and search.strip():
        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                resp = client.get(
                    "https://api.github.com/search/repositories",
                    params={"q": search.strip(), "per_page": per_page, "page": page, "sort": "stars"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("items", []):
                        repos_list.append(_enrich(item))
                    return {
                        "account_login": installation.account_login if installation else "github-user",
                        "total_count": data.get("total_count", len(repos_list)),
                        "is_live": True,
                        "repositories": repos_list,
                    }
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"GitHub search failed: {resp.status_code}",
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Cannot reach GitHub: {exc}",
            )

    # 2. Query real user repositories
    try:
        with httpx.Client(timeout=10.0, headers=headers) as client:
            resp = client.get(
                "https://api.github.com/user/repos",
                params={"per_page": per_page, "page": page, "sort": "updated", "affiliation": "owner,collaborator,organization_member"},
            )
            if resp.status_code == 200:
                data = resp.json()
                for item in data:
                    repos_list.append(_enrich(item))
                return {
                    "account_login": installation.account_login if installation else "github-user",
                    "total_count": len(repos_list),
                    "is_live": True,
                    "repositories": repos_list,
                }
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"GitHub repository list failed: {resp.status_code}",
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cannot reach GitHub: {exc}",
        )


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
        org = db.query(Organization).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No organization configured; create a workspace first",
            )
        repo_id = f"repo_{name.replace('-', '_').replace('.', '_')}"
        repo = Repository(
            id=repo_id,
            organization_id=org.id,
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
    """Trigger deep AST repository scan on local or retrieved GitHub codebase."""
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    repo.status = "scanning"
    db.commit()

    # Retrieve or resolve repository path
    local_path = _ensure_repository_local(repo, db)

    # Perform AST scanning
    scan_res = scan_repository(local_path)

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

    event_broadcaster.broadcast_sync("scan_completed", {
        "repository_id": repo.id,
        "name": repo.name,
        "github_repo": repo.github_repo,
        "usages_count": len(scan_res.usages),
        "providers_found": scan_res.providers,
    })

    return {
        "repository_id": repo.id,
        "status": "ready",
        "usages_discovered": len(scan_res.usages),
        "providers_found": scan_res.providers,
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
    migration_ids = [m.id for m in repo.migrations]
    if migration_ids:
        db.query(ValidationRun).filter(ValidationRun.migration_id.in_(migration_ids)).delete(synchronize_session=False)
        db.query(MigrationRun).filter(MigrationRun.repository_id == repo.id).delete(synchronize_session=False)
    db.delete(repo)
    db.commit()

    return {"status": "disconnected", "id": repository_id}


