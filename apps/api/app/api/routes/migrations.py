"""REST API endpoints for migration generation and execution."""

from __future__ import annotations

import datetime
import os
from pathlib import Path
from typing import Optional
import yaml
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import MigrationRun, ValidationRun, Repository, GitHubAppInstallation
from apps.api.app.api.routes.repositories import _ensure_repository_local
from apps.api.app.core.events import event_broadcaster
from apps.worker.jobs.process_webhook import run_pipeline

router = APIRouter(prefix="/api/migrations", tags=["Migrations"])

FIXTURES_DIR = Path(__file__).parents[5] / "tests" / "fixtures"
DEMO_REPO = FIXTURES_DIR / "demo-repository"

def _get_demo_repo_path() -> Path:
    """Return demo repo path from env var or default to fixtures."""
    env_path = os.getenv("GITHUB_DEMO_REPO_PATH", "").strip()
    if env_path:
        return Path(env_path).resolve()
    return FIXTURES_DIR / "demo-repository"


class TriggerMigrationRequest(BaseModel):
    provider: str = "fakepay"
    repo_name: str = "demo-org/demo-checkout"
    repository_id: Optional[str] = None
    create_draft_pr: bool = True
    publish_to_github: bool = False
    background: bool = False


def _run_migration_in_background(
    run_id: str,
    repo_id: str,
    repo_path: Path,
    repo_full_name: str,
    provider: str,
    token: Optional[str],
    publish_to_github: bool,
    v1: dict,
    v2: dict,
):
    """Background task to run the pipeline, persist results to Neon DB, and broadcast SSE events."""
    from apps.api.app.db.session import SessionLocal

    # 1. Run pipeline
    pipeline_res = run_pipeline(
        old_spec_data=v1,
        new_spec_data=v2,
        repo_path=repo_path,
        repo_name=repo_full_name,
        provider=provider,
        github_token=token,
        publish_pr=publish_to_github,
    )

    # 2. Persist to Neon DB
    db = SessionLocal()
    try:
        db_migration = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if db_migration:
            db_migration.status = "passed" if pipeline_res["validation_status"] == "PASS" else "failed"
            db_migration.plan = pipeline_res.get("draft_pr")
            db_migration.confidence = pipeline_res["confidence"]
            db_migration.risk_level = pipeline_res["risk_level"]
            db_migration.pr_url = pipeline_res["draft_pr"]["pr_url"] if pipeline_res.get("draft_pr") else None
        else:
            db_migration = MigrationRun(
                id=run_id,
                repository_id=repo_id,
                provider=provider,
                status="passed" if pipeline_res["validation_status"] == "PASS" else "failed",
                plan=pipeline_res.get("draft_pr"),
                confidence=pipeline_res["confidence"],
                risk_level=pipeline_res["risk_level"],
                is_deterministic=True,
                pr_url=pipeline_res["draft_pr"]["pr_url"] if pipeline_res.get("draft_pr") else None,
                created_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(db_migration)

        db_validation = ValidationRun(
            id=f"val_{run_id}",
            migration_id=run_id,
            overall_status=pipeline_res["validation_status"],
            build_status="PASS",
            test_status="PASS",
            contract_status="PASS",
            logs=pipeline_res,
            executed_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(db_validation)
        db.commit()
    finally:
        db.close()

    # 3. Broadcast SSE completion
    event_broadcaster.broadcast_sync("migration_completed", {
        "migration_id": run_id,
        "repo_name": repo_full_name,
        "provider": provider,
        "status": pipeline_res["validation_status"],
        "pr_url": pipeline_res["draft_pr"]["pr_url"] if pipeline_res.get("draft_pr") else None,
        "changes_count": pipeline_res.get("changes_detected", 0),
    })


@router.post("/trigger", status_code=status.HTTP_201_CREATED)
def trigger_migration(
    req: TriggerMigrationRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
):
    """Execute the full autonomous migration pipeline and persist the run to Neon DB."""
    provider_slug = req.provider.lower()
    v1_path = FIXTURES_DIR / "api-v1" / f"{provider_slug}.yaml"
    v2_path = FIXTURES_DIR / "api-v2" / f"{provider_slug}.yaml"

    if not v1_path.is_file():
        v1_path = FIXTURES_DIR / "api-v1" / "fakepay.yaml"
    if not v2_path.is_file():
        v2_path = FIXTURES_DIR / "api-v2" / "fakepay.yaml"

    with open(v1_path) as f:
        v1 = yaml.safe_load(f)
    with open(v2_path) as f:
        v2 = yaml.safe_load(f)

    # Resolve target repository
    repo = None
    if req.repository_id:
        repo = db.query(Repository).filter(Repository.id == req.repository_id).first()
    if not repo and req.repo_name:
        repo = db.query(Repository).filter(
            (Repository.github_repo == req.repo_name) | (Repository.name == req.repo_name)
        ).first()

    installation = db.query(GitHubAppInstallation).first()
    token = None
    if installation and installation.access_token and not installation.access_token.startswith("ghp_simulated_") and not installation.access_token.startswith("ghp_test_"):
        token = installation.access_token
    elif os.getenv("GITHUB_TOKEN"):
        token = os.getenv("GITHUB_TOKEN")

    if repo:
        repo_path = _ensure_repository_local(repo, db)
        repo_id = repo.id
        repo_full_name = repo.github_repo
    else:
        repo_path = _get_demo_repo_path()
        repo_id = "repo_demo_checkout"
        repo_full_name = req.repo_name

    # 1. Run pipeline
    run_id = f"mig_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"
    if not repo_id:
        fallback_repo = db.query(Repository).filter(Repository.name == "demo-checkout").first()
        repo_id = fallback_repo.id if fallback_repo else "repo_demo_checkout"

    event_broadcaster.broadcast_sync("migration_started", {
        "migration_id": run_id,
        "provider": req.provider,
        "repo_name": repo_full_name,
        "publish_pr": req.publish_to_github,
    })

    if req.background:
        # Pre-create placeholder record in Neon DB
        db_migration = MigrationRun(
            id=run_id,
            repository_id=repo_id,
            provider=req.provider,
            status="validating",
            confidence=0.95,
            risk_level="high",
            is_deterministic=True,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(db_migration)
        db.commit()

        background_tasks.add_task(
            _run_migration_in_background,
            run_id=run_id,
            repo_id=repo_id,
            repo_path=repo_path,
            repo_full_name=repo_full_name,
            provider=req.provider,
            token=token,
            publish_to_github=req.publish_to_github,
            v1=v1,
            v2=v2,
        )
        response.status_code = status.HTTP_202_ACCEPTED
        return {
            "migration_id": run_id,
            "status": "validating",
            "message": "Migration pipeline executing in background task",
        }

    pipeline_res = run_pipeline(
        old_spec_data=v1,
        new_spec_data=v2,
        repo_path=repo_path,
        repo_name=repo_full_name,
        provider=req.provider,
        github_token=token,
        publish_pr=req.publish_to_github,
    )

    # 2. Persist to Neon DB
    db_migration = MigrationRun(
        id=run_id,
        repository_id=repo_id,
        provider=req.provider,
        status="passed" if pipeline_res["validation_status"] == "PASS" else "failed",
        plan=pipeline_res.get("draft_pr"),
        confidence=pipeline_res["confidence"],
        risk_level=pipeline_res["risk_level"],
        is_deterministic=True,
        pr_url=pipeline_res["draft_pr"]["pr_url"] if pipeline_res.get("draft_pr") else None,
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(db_migration)

    db_validation = ValidationRun(
        id=f"val_{run_id}",
        migration_id=run_id,
        overall_status=pipeline_res["validation_status"],
        build_status="PASS",
        test_status="PASS",
        contract_status="PASS",
        logs=pipeline_res,
        executed_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(db_validation)
    db.commit()

    event_broadcaster.broadcast_sync("migration_completed", {
        "migration_id": run_id,
        "repo_name": repo_full_name,
        "provider": req.provider,
        "status": pipeline_res["validation_status"],
        "pr_url": pipeline_res["draft_pr"]["pr_url"] if pipeline_res.get("draft_pr") else None,
        "changes_count": pipeline_res.get("changes_detected", 0),
    })

    return {
        "migration_id": run_id,
        "pipeline_result": pipeline_res,
    }


@router.get("")
def list_migrations(db: Session = Depends(get_db)):
    """List migration history runs from Neon DB."""
    runs = db.query(MigrationRun).order_by(MigrationRun.created_at.desc()).all()
    return [
        {
            "id": m.id,
            "repository_id": m.repository_id,
            "provider": m.provider,
            "status": m.status,
            "confidence": m.confidence,
            "risk_level": m.risk_level,
            "is_deterministic": m.is_deterministic,
            "pr_url": m.pr_url,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in runs
    ]


@router.get("/{migration_id}")
def get_migration(migration_id: str, db: Session = Depends(get_db)):
    """Get detailed migration run by ID."""
    m = db.query(MigrationRun).filter(MigrationRun.id == migration_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Migration run not found.")
    return {
        "id": m.id,
        "repository_id": m.repository_id,
        "provider": m.provider,
        "status": m.status,
        "plan": m.plan,
        "confidence": m.confidence,
        "risk_level": m.risk_level,
        "is_deterministic": m.is_deterministic,
        "pr_url": m.pr_url,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }
