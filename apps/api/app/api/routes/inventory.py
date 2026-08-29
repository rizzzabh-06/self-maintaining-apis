"""REST API endpoints for API inventory and discovered usages."""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import Provider, Repository, APIUsageModel, APIVersion

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    """List all detected and registered API providers."""
    providers = db.query(Provider).all()
    result = []
    for p in providers:
        versions = [v.version for v in p.versions]
        usages_count = db.query(APIUsageModel).filter(APIUsageModel.provider == p.slug).count()
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "versions": versions,
            "usages_count": usages_count,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.get("/repositories")
def list_repositories(db: Session = Depends(get_db)):
    """List monitored repositories and their scan status."""
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
            "usages_count": usages_count,
            "last_scanned_at": r.last_scanned_at.isoformat() if r.last_scanned_at else None,
        })
    return result


@router.get("/usages")
def list_usages(
    provider: Optional[str] = Query(None),
    repository_id: Optional[str] = Query(None),
    usage_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List detected API usage locations across the codebase."""
    query = db.query(APIUsageModel)
    if provider:
        query = query.filter(APIUsageModel.provider == provider.lower())
    if repository_id:
        query = query.filter(APIUsageModel.repository_id == repository_id)
    if usage_type:
        query = query.filter(APIUsageModel.usage_type == usage_type)

    usages = query.all()
    return [
        {
            "id": u.id,
            "repository_id": u.repository_id,
            "provider": u.provider,
            "endpoint": u.endpoint,
            "file_path": u.file_path,
            "line_number": u.line_number,
            "symbol": u.symbol,
            "usage_type": u.usage_type,
            "confidence": u.confidence,
            "snippet": u.snippet,
        }
        for u in usages
    ]
