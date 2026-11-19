"""REST API endpoints for Impact Analysis."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import APIChangeModel

router = APIRouter(prefix="/api/impact", tags=["Impact"])


@router.get("")
def get_impact_analysis(
    provider: str = Query(..., description="Provider slug to analyze impact for"),
    db: Session = Depends(get_db),
):
    """Run and return impact analysis for detected provider changes on repository.

    Spec retrieval from a provider URL/changelog is not implemented, and impact
    computation requires real specs plus a scanned repository. Fail loudly instead
    of falling back to bundled fixture specs.
    """
    has_changes = (
        db.query(APIChangeModel).filter(APIChangeModel.provider == provider).first() is not None
    )
    if has_changes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Impact analysis for provider '{provider}' requires real inline specs (spec fetching not implemented).",
        )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No spec/impact data for provider '{provider}' (spec retrieval not implemented).",
    )
