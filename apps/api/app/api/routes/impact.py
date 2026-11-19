"""REST API endpoints for Impact Analysis."""

from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException, Query, status

from packages.change_engine.diff import diff_specs
from packages.repository_analyzer.scanner import scan_repository
from packages.impact_engine.analyzer import analyze_impact

router = APIRouter(prefix="/api/impact", tags=["Impact"])

_FIXTURES = Path(__file__).resolve().parents[5] / "tests" / "fixtures"
_DEMO_REPO = _FIXTURES / "demo-repository"


def _load_fixture_specs(provider: str):
    """Load v1 and v2 YAML specs for *provider* from the bundled test fixtures.

    Returns (v1_dict, v2_dict) or raises HTTPException(404) when unavailable.
    """
    v1_path = _FIXTURES / "api-v1" / f"{provider}.yaml"
    v2_path = _FIXTURES / "api-v2" / f"{provider}.yaml"
    if not v1_path.exists() or not v2_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No fixture specs found for provider '{provider}'.",
        )
    with open(v1_path) as f:
        v1 = yaml.safe_load(f)
    with open(v2_path) as f:
        v2 = yaml.safe_load(f)
    return v1, v2


@router.get("")
def get_impact_analysis(
    provider: str = Query(..., description="Provider slug to analyze impact for"),
):
    """Run and return impact analysis for detected provider changes on the demo repository."""
    v1, v2 = _load_fixture_specs(provider)

    changes = diff_specs(v1, v2)
    scan = scan_repository(_DEMO_REPO)
    impact = analyze_impact(changes, scan, provider=provider)

    return {
        "provider": provider,
        "affected_files": [u.file_path for u in impact.affected_usages],
        "overall_confidence": impact.overall_confidence,
        "total_usages": len(impact.affected_usages),
        "changes_detected": len(changes),
        "risk_level": impact.risk_level,
    }
