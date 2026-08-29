"""REST API endpoints for sandbox validation results."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import ValidationRun

router = APIRouter(prefix="/api/validations", tags=["Validations"])


@router.get("/{migration_id}")
def get_validation_run(migration_id: str, db: Session = Depends(get_db)):
    """Retrieve isolated sandbox validation results and verification logs for a migration."""
    val = db.query(ValidationRun).filter(ValidationRun.migration_id == migration_id).first()
    if not val:
        raise HTTPException(status_code=404, detail="Validation run not found.")
    return {
        "id": val.id,
        "migration_id": val.migration_id,
        "overall_status": val.overall_status,
        "build_status": val.build_status,
        "test_status": val.test_status,
        "contract_status": val.contract_status,
        "logs": val.logs,
        "executed_at": val.executed_at.isoformat() if val.executed_at else None,
    }
