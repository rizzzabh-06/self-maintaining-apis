"""REST API endpoints for API change detection and spec diffs."""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import APIChangeModel

router = APIRouter(prefix="/api/changes", tags=["Changes"])


@router.get("")
def list_changes(
    provider: Optional[str] = Query(None),
    breaking_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """List detected API changes recorded in the database.

    Returns real database rows (or an empty list when none exist) instead of
    computing on the fly from bundled fixture specs.
    """
    query = db.query(APIChangeModel)
    if provider:
        query = query.filter(APIChangeModel.provider == provider)

    db_changes = query.all()
    return [
        {
            "id": c.id,
            "change_type": c.change_type,
            "breaking": c.breaking,
            "endpoint": c.endpoint,
            "old_value": c.old_value,
            "new_value": c.new_value,
            "severity": c.severity,
            "description": c.description,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in db_changes
        if not breaking_only or c.breaking
    ]
