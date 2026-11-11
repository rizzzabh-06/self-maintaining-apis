"""REST API endpoints for sandbox validation results."""

from __future__ import annotations

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import ValidationRun, MigrationRun, Repository

router = APIRouter(prefix="/api/validations", tags=["Validations"])


def _serialize_validation(val: ValidationRun, migration: Optional[MigrationRun]) -> dict:
    """Serialize a ValidationRun with its parent migration context."""
    # logs may be stored as a JSON list of strings or a single string
    raw_logs = val.logs or []
    if isinstance(raw_logs, str):
        try:
            raw_logs = json.loads(raw_logs)
        except (json.JSONDecodeError, TypeError):
            raw_logs = [raw_logs]

    # Derive repo name and provider from the linked migration
    repo_name = ""
    provider = ""
    pr_url = None
    if migration:
        repo_name = migration.repository.github_repo if migration.repository else ""
        provider = migration.provider
        pr_url = migration.pr_url

    # Map overall_status → frontend-compatible "status"
    status_map = {"PASS": "passed", "FAIL": "failed", "ERROR": "failed", "RUNNING": "running"}
    frontend_status = status_map.get(val.overall_status, "pending")

    # Synthesize diff_summary from migration plan if present
    diff_summary = {"added": 0, "removed": 0, "changed": 0}
    if migration and migration.plan:
        plan = migration.plan if isinstance(migration.plan, dict) else {}
        changes = plan.get("changes", [])
        for c in changes:
            ctype = c.get("type", "")
            if ctype == "add":
                diff_summary["added"] += 1
            elif ctype == "remove":
                diff_summary["removed"] += 1
            else:
                diff_summary["changed"] += 1

    # Build a lightweight test-result list from build/test/contract statuses
    tests = []
    if val.build_status:
        tests.append({
            "name": "Build (tsc / compile)",
            "status": "pass" if val.build_status == "PASS" else "fail",
            "duration_ms": 0,
        })
    if val.test_status:
        tests.append({
            "name": "Unit tests (jest / pytest)",
            "status": "pass" if val.test_status == "PASS" else "fail",
            "duration_ms": 0,
        })
    if val.contract_status:
        tests.append({
            "name": "Contract validation (OpenAPI diff)",
            "status": "pass" if val.contract_status == "PASS" else "fail",
            "duration_ms": 0,
        })

    return {
        "id": val.id,
        "migration_id": val.migration_id,
        "repo": repo_name,
        "provider": provider,
        "status": frontend_status,
        "overall_status": val.overall_status,
        "build_status": val.build_status,
        "test_status": val.test_status,
        "contract_status": val.contract_status,
        "created_at": val.executed_at.isoformat() if val.executed_at else None,
        "duration_s": 0,
        "pr_url": pr_url,
        "build_log": raw_logs if isinstance(raw_logs, list) else [str(raw_logs)],
        "tests": tests,
        "diff_summary": diff_summary,
    }


@router.get("")
def list_validations(
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: passed, failed, running, pending"),
    db: Session = Depends(get_db),
):
    """List recent sandbox validation runs across all migrations."""
    query = db.query(ValidationRun).order_by(ValidationRun.executed_at.desc())

    if status:
        # Map frontend status names back to DB values
        reverse_map = {"passed": "PASS", "failed": "FAIL", "running": "RUNNING", "pending": None}
        db_status = reverse_map.get(status.lower())
        if db_status:
            query = query.filter(ValidationRun.overall_status == db_status)

    validations = query.limit(limit).all()
    items = []
    for val in validations:
        migration = db.query(MigrationRun).filter(MigrationRun.id == val.migration_id).first()
        # Eagerly load repository relationship so repo name is available
        if migration and not hasattr(migration, "_repository_loaded"):
            migration.repository  # trigger lazy load inside the session
        items.append(_serialize_validation(val, migration))

    return {"items": items, "total": len(items)}


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
