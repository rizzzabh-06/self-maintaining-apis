"""REST API endpoints for Impact Analysis."""

from __future__ import annotations

from pathlib import Path
from typing import Optional
import yaml
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact

router = APIRouter(prefix="/api/impact", tags=["Impact"])

FIXTURES_DIR = Path(__file__).parents[5] / "tests" / "fixtures"
DEMO_REPO = FIXTURES_DIR / "demo-repository"


@router.get("")
def get_impact_analysis(
    provider: str = Query("fakepay"),
    db: Session = Depends(get_db),
):
    """Run and return impact analysis for detected provider changes on repository."""
    v1_path = FIXTURES_DIR / "api-v1" / "fakepay.yaml"
    v2_path = FIXTURES_DIR / "api-v2" / "fakepay.yaml"

    with open(v1_path) as f:
        v1 = yaml.safe_load(f)
    with open(v2_path) as f:
        v2 = yaml.safe_load(f)

    changes = diff_specs(v1, v2)
    scan = scan_repository(DEMO_REPO)
    impact = analyze_impact(changes, scan, provider=provider)

    return impact.to_dict()
