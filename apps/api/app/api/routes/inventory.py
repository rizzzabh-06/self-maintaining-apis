"""REST API endpoints for API inventory and discovered usages."""

from __future__ import annotations

import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import (
    Provider,
    Repository,
    APIUsageModel,
    APIVersion,
    APIChangeModel,
    MigrationRun,
    ValidationRun,
)

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def _provider_health(p: Provider, db: Session) -> str:
    """Derive health from is_active flag and whether a ValidationRun recently failed.

    Rules:
      - is_active=False → 'down'
      - Any migration for this provider ended in 'failed' in the last 7 days → 'degraded'
      - Otherwise → 'healthy'
    """
    if not p.is_active:
        return "down"
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    recent_failure = (
        db.query(MigrationRun)
        .filter(MigrationRun.provider == p.slug, MigrationRun.status == "failed",
                MigrationRun.created_at >= cutoff)
        .first()
    )
    return "degraded" if recent_failure else "healthy"


def _webhook_active(p: Provider) -> bool:
    """A provider is considered to have an active webhook when it has a secret configured."""
    return bool(p.webhook_secret)


def _build_version_history(p: Provider, db: Session) -> list:
    """Return a sorted list of version objects with breaking-change counts."""
    versions = (
        db.query(APIVersion)
        .filter(APIVersion.provider_id == p.id)
        .order_by(APIVersion.retrieved_at.desc())
        .all()
    )
    history = []
    for v in versions:
        breaking = (
            db.query(APIChangeModel)
            .filter(APIChangeModel.api_version_id == v.id, APIChangeModel.breaking == True)
            .count()
        )
        history.append({
            "version": v.version,
            "released_at": v.retrieved_at.isoformat() if v.retrieved_at else None,
            "breaking_changes": breaking,
        })
    return history


@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    """List all detected API providers with enriched health, version and usage signals."""
    providers = db.query(Provider).all()
    result = []
    for p in providers:
        # Versions sorted newest-first
        versions_sorted = sorted(p.versions, key=lambda v: v.retrieved_at or datetime.datetime.min, reverse=True)
        latest_version = versions_sorted[0].version if versions_sorted else "unknown"
        # Pinned = oldest ingested version that isn't the latest (simulate "currently in use")
        current_version = versions_sorted[-1].version if len(versions_sorted) > 1 else latest_version

        usages_count = db.query(APIUsageModel).filter(APIUsageModel.provider == p.slug).count()
        repos_affected = (
            db.query(APIUsageModel.repository_id)
            .filter(APIUsageModel.provider == p.slug)
            .distinct()
            .count()
        )
        last_checked_dt = versions_sorted[0].retrieved_at if versions_sorted else p.created_at
        version_history = _build_version_history(p, db)

        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "health": _provider_health(p, db),
            "current_version": current_version,
            "latest_version": latest_version,
            "webhook_active": _webhook_active(p),
            "last_checked": last_checked_dt.isoformat() if last_checked_dt else None,
            "usages_count": usages_count,
            "repos_affected": repos_affected,
            "is_active": p.is_active,
            "version_history": version_history,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


@router.get("/providers/{slug}")
def get_provider(slug: str, db: Session = Depends(get_db)):
    """Fetch a single provider's full detail including version history and breaking-change breakdown."""
    p = db.query(Provider).filter(Provider.slug == slug).first()
    if not p:
        raise HTTPException(status_code=404, detail=f"Provider '{slug}' not found.")

    versions_sorted = sorted(p.versions, key=lambda v: v.retrieved_at or datetime.datetime.min, reverse=True)
    latest_version = versions_sorted[0].version if versions_sorted else "unknown"
    current_version = versions_sorted[-1].version if len(versions_sorted) > 1 else latest_version
    usages_count = db.query(APIUsageModel).filter(APIUsageModel.provider == p.slug).count()
    repos_affected = (
        db.query(APIUsageModel.repository_id)
        .filter(APIUsageModel.provider == p.slug)
        .distinct()
        .count()
    )
    last_checked_dt = versions_sorted[0].retrieved_at if versions_sorted else p.created_at
    version_history = _build_version_history(p, db)

    # Full breaking-change history
    breaking_changes = []
    for v in versions_sorted:
        changes = (
            db.query(APIChangeModel)
            .filter(APIChangeModel.api_version_id == v.id, APIChangeModel.breaking == True)
            .all()
        )
        for c in changes:
            breaking_changes.append({
                "date": c.created_at.isoformat() if c.created_at else None,
                "version": v.version,
                "change_type": c.change_type,
                "severity": c.severity,
                "endpoint": c.endpoint,
                "description": c.description,
            })

    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "health": _provider_health(p, db),
        "current_version": current_version,
        "latest_version": latest_version,
        "webhook_active": _webhook_active(p),
        "last_checked": last_checked_dt.isoformat() if last_checked_dt else None,
        "usages_count": usages_count,
        "repos_affected": repos_affected,
        "is_active": p.is_active,
        "version_history": version_history,
        "breaking_change_history": breaking_changes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


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
