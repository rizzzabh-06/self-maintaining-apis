"""REST API endpoints for workspace automation and continuous monitoring settings."""

from __future__ import annotations

import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import AutomationSettings

router = APIRouter(prefix="/api/automation", tags=["Automation"])


class AutomationUpdateRequest(BaseModel):
    auto_scan_on_push: bool = True
    auto_pr_on_breaking: bool = True
    confidence_threshold: float = 0.90
    draft_pr_only: bool = True  # Hard invariant


@router.get("")
def get_automation_settings(db: Session = Depends(get_db)):
    """Retrieve workspace automation settings."""
    settings = db.query(AutomationSettings).first()
    if not settings:
        settings = AutomationSettings(
            id="auto_setting_01",
            organization_id="org-wispy-boat-92392834",
            auto_scan_on_push=True,
            auto_pr_on_breaking=True,
            confidence_threshold=0.90,
            draft_pr_only=True,
            updated_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(settings)
        db.commit()

    return {
        "auto_scan_on_push": settings.auto_scan_on_push,
        "auto_pr_on_breaking": settings.auto_pr_on_breaking,
        "confidence_threshold": settings.confidence_threshold,
        "draft_pr_only": settings.draft_pr_only,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else None,
    }


@router.post("")
def update_automation_settings(
    req: AutomationUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update workspace automation settings."""
    settings = db.query(AutomationSettings).first()
    if not settings:
        settings = AutomationSettings(
            id="auto_setting_01",
            organization_id="org-wispy-boat-92392834",
        )
        db.add(settings)

    settings.auto_scan_on_push = req.auto_scan_on_push
    settings.auto_pr_on_breaking = req.auto_pr_on_breaking
    settings.confidence_threshold = req.confidence_threshold
    settings.draft_pr_only = True  # Enforce safety invariant
    settings.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    return {
        "status": "updated",
        "settings": {
            "auto_scan_on_push": settings.auto_scan_on_push,
            "auto_pr_on_breaking": settings.auto_pr_on_breaking,
            "confidence_threshold": settings.confidence_threshold,
            "draft_pr_only": settings.draft_pr_only,
        },
    }
