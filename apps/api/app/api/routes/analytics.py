"""REST API endpoints for Analytics and Aggregate Visualization Metrics."""

from __future__ import annotations

import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import (
    Repository,
    APIUsageModel,
    MigrationRun,
    ValidationRun,
    APIChangeModel,
    Provider,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("")
def get_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Calculate aggregate tracking and visualization metrics across Neon Lakebase Postgres."""
    # 1. Repositories summary
    total_repos = db.query(Repository).count()
    total_usages = db.query(APIUsageModel).count()

    # 2. Migration statistics
    total_migrations = db.query(MigrationRun).count()
    passed_migrations = db.query(MigrationRun).filter(
        MigrationRun.status.in_(["passed", "pr_created"])
    ).count()
    failed_migrations = db.query(MigrationRun).filter(MigrationRun.status == "failed").count()
    validating_migrations = db.query(MigrationRun).filter(
        MigrationRun.status.in_(["validating", "pending"])
    ).count()

    success_rate = (
        round((passed_migrations / total_migrations) * 100, 1)
        if total_migrations > 0
        else 0.0
    )

    avg_confidence = db.query(func.avg(MigrationRun.confidence)).scalar()
    avg_confidence = float(avg_confidence) if avg_confidence is not None else 0.0

    # 3. Outcomes breakdown for pie chart
    outcomes = [
        {"name": "Passed", "value": passed_migrations, "color": "#10B981"},
        {"name": "Failed", "value": failed_migrations, "color": "#EF4444"},
        {"name": "Validating", "value": validating_migrations, "color": "#29B5E8"},
    ]

    # 4. Top repositories by usage impact
    repo_usages = (
        db.query(Repository.name, func.count(APIUsageModel.id).label("count"))
        .outerjoin(APIUsageModel, Repository.id == APIUsageModel.repository_id)
        .group_by(Repository.id, Repository.name)
        .order_by(func.count(APIUsageModel.id).desc())
        .limit(6)
        .all()
    )

    top_repos = [
        {"repo": name or "repository", "count": count or 0}
        for name, count in repo_usages
    ]

    # 5. Breaking changes trend (recent 7 days, real counts)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    trend = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        date_str = day.strftime("%b %d")
        count = db.query(MigrationRun).filter(
            func.date(MigrationRun.created_at) == day
        ).count()
        trend.append({
            "date": date_str,
            "count": count,
        })

    # 6. Provider status and distribution
    providers = db.query(Provider).all()
    provider_breakdown = []
    for p in providers:
        usage_count = db.query(APIUsageModel).filter(APIUsageModel.provider == p.slug).count()
        mig_count = db.query(MigrationRun).filter(MigrationRun.provider == p.slug).count()
        provider_breakdown.append({
            "name": p.name,
            "slug": p.slug,
            "usages": usage_count,
            "migrations": mig_count,
            "is_active": p.is_active,
        })

    prs_awaiting_review = db.query(MigrationRun).filter(MigrationRun.pr_url.isnot(None)).count()

    return {
        "summary": {
            "total_repositories": total_repos,
            "total_usages": total_usages,
            "total_migrations": total_migrations,
            "passed_migrations": passed_migrations,
            "failed_migrations": failed_migrations,
            "success_rate": success_rate,
            "avg_confidence": round(avg_confidence * 100, 1) if total_migrations > 0 else 0.0,
            "prs_awaiting_review": prs_awaiting_review,
            "avg_validation_seconds": 0.0,
        },
        "migration_outcomes": outcomes,
        "top_repositories": top_repos,
        "breaking_changes_trend": trend,
        "providers": provider_breakdown,
    }
