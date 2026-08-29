"""REST API endpoints for API change detection and spec diffs."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional
import yaml
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import APIChangeModel, Provider, APIVersion
from packages.change_engine.diff import diff_specs
from packages.change_engine.classifier import classify_severity

router = APIRouter(prefix="/api/changes", tags=["Changes"])

FIXTURES_DIR = Path(__file__).parents[5] / "tests" / "fixtures"


@router.get("")
def list_changes(
    provider: Optional[str] = Query(None),
    breaking_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """List detected API changes."""
    # If no DB records exist yet, compute on-the-fly from fixture pair for demo
    db_changes = db.query(APIChangeModel).all()
    if not db_changes:
        v1_path = FIXTURES_DIR / "api-v1" / "fakepay.yaml"
        v2_path = FIXTURES_DIR / "api-v2" / "fakepay.yaml"
        if v1_path.is_file() and v2_path.is_file():
            with open(v1_path) as f:
                v1 = yaml.safe_load(f)
            with open(v2_path) as f:
                v2 = yaml.safe_load(f)
            diff_results = diff_specs(v1, v2)
            return {
                "provider": "fakepay",
                "from_version": "1.0.0",
                "to_version": "2.0.0",
                "severity": classify_severity(diff_results),
                "total_changes": len(diff_results),
                "changes": [c.to_dict() for c in diff_results if not breaking_only or c.breaking],
            }

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
    ]
