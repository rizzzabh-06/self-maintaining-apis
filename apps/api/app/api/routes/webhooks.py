"""Webhook receivers for external API provider change events and GitHub App events."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

import yaml
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel

from apps.api.app.core.security import verify_webhook_signature
from apps.api.app.core.events import event_broadcaster
from apps.worker.jobs.process_webhook import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

DEFAULT_SECRET = os.getenv("FAKEPAY_WEBHOOK_SECRET", "test_webhook_secret_key_123")
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")


class ProviderWebhookPayload(BaseModel):
    provider: str
    event: str
    from_version: str
    to_version: str
    old_spec_url: str | None = None
    new_spec_url: str | None = None
    repo_path: str | None = None
    repo_name: str | None = "demo-org/demo-checkout"


@router.post("/provider", status_code=status.HTTP_202_ACCEPTED)
async def handle_provider_webhook(
    request: Request,
    x_provider_signature: str | None = Header(None, alias="X-Provider-Signature"),
    x_fakepay_signature: str | None = Header(None, alias="X-FakePay-Signature"),
) -> dict[str, Any]:
    """Receive provider API change webhook, verify HMAC signature, and trigger migration pipeline."""
    body_bytes = await request.body()
    sig = x_provider_signature or x_fakepay_signature

    # Verify HMAC signature
    if not verify_webhook_signature(body_bytes, sig, DEFAULT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing webhook HMAC signature.",
        )

    try:
        import json
        payload_dict = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # Locate specs
    event_broadcaster.broadcast_sync("webhook_received", {
        "source": "provider",
        "provider": payload_dict.get("provider", "fakepay"),
        "event": payload_dict.get("event", "api_change"),
        "repo": payload_dict.get("repo_name", "demo-org/demo-checkout"),
    })
    fixtures_dir = Path(__file__).parents[5] / "tests" / "fixtures"
    v1_path = fixtures_dir / "api-v1" / "fakepay.yaml"
    v2_path = fixtures_dir / "api-v2" / "fakepay.yaml"
    repo_path = Path(payload_dict.get("repo_path") or (fixtures_dir / "demo-repository"))

    with open(v1_path) as f:
        old_spec = yaml.safe_load(f)
    with open(v2_path) as f:
        new_spec = yaml.safe_load(f)

    # Run the pipeline
    result = run_pipeline(
        old_spec_data=old_spec,
        new_spec_data=new_spec,
        repo_path=repo_path,
        repo_name=payload_dict.get("repo_name", "demo-org/demo-checkout"),
        provider=payload_dict.get("provider", "fakepay"),
    )

    return {
        "status": "accepted",
        "message": f"Successfully processed change event for {payload_dict.get('provider', 'fakepay')}.",
        "pipeline_result": result,
    }


# ---------------------------------------------------------------------------
# GitHub App Webhook receiver
# ---------------------------------------------------------------------------

# Map of GitHub webhook event types that trigger the pipeline.
# Extend this dict as the app supports more events.
_HANDLED_GH_EVENTS: dict[str, str] = {
    "push": "code_push",
    "pull_request": "pull_request",
    "release": "release",
    "workflow_run": "workflow_run",
}


@router.post("/github", status_code=status.HTTP_202_ACCEPTED)
async def handle_github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str | None = Header(None, alias="X-GitHub-Event"),
    x_github_delivery: str | None = Header(None, alias="X-GitHub-Delivery"),
) -> dict[str, Any]:
    """Receive GitHub App webhook events, verify HMAC-SHA256 signature, and dispatch pipeline.

    GitHub signs every delivery with HMAC-SHA256 of the raw body using your
    *Webhook secret*.  The header format is ``sha256=<hex-digest>``.

    Supported events (configured in GitHub App > Permissions & events):
    - ``push``          — new commits pushed to a branch
    - ``pull_request``  — PR opened / synchronised
    - ``release``       — a release published
    - ``workflow_run``  — CI workflow completed
    - ``ping``          — fired once when the webhook is first saved; always 200
    """
    body_bytes = await request.body()

    # --- Signature verification -------------------------------------------
    if not GITHUB_WEBHOOK_SECRET:
        # Secret not configured — log a warning and proceed in dev mode only.
        logger.warning(
            "GITHUB_WEBHOOK_SECRET is not set. "
            "Skipping signature check (dev/test mode only)."
        )
    else:
        if not verify_webhook_signature(body_bytes, x_hub_signature_256, GITHUB_WEBHOOK_SECRET):
            logger.warning(
                "GitHub webhook HMAC verification failed. "
                "delivery=%s event=%s",
                x_github_delivery,
                x_github_event,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-Hub-Signature-256 header.",
            )

    # --- Parse payload -------------------------------------------------------
    try:
        payload: dict[str, Any] = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event = (x_github_event or "unknown").lower()
    delivery_id = x_github_delivery or "unknown"
    logger.info("GitHub webhook received: event=%s delivery=%s", event, delivery_id)
    event_broadcaster.broadcast_sync("webhook_received", {
        "source": "github",
        "event": event,
        "delivery_id": delivery_id,
        "repo": payload.get("repository", {}).get("full_name", ""),
    })

    # --- Ping handshake ------------------------------------------------------
    if event == "ping":
        return {
            "status": "ok",
            "message": "Ping received — webhook is active.",
            "zen": payload.get("zen", ""),
        }

    # --- Only act on events we care about ------------------------------------
    if event not in _HANDLED_GH_EVENTS:
        logger.debug("Ignoring unhandled GitHub event: %s", event)
        return {
            "status": "ignored",
            "message": f"Event '{event}' is not handled by this agent.",
        }

    # --- Extract repository context from GitHub payload ----------------------
    repo_info = payload.get("repository", {})
    repo_full_name: str = repo_info.get("full_name", "demo-org/demo-checkout")
    default_branch: str = repo_info.get("default_branch", "main")

    # For push events, only run if the push is to the default branch.
    if event == "push":
        pushed_ref: str = payload.get("ref", "")
        expected_ref = f"refs/heads/{default_branch}"
        if pushed_ref and pushed_ref != expected_ref:
            return {
                "status": "ignored",
                "message": f"Push to '{pushed_ref}' ignored (not default branch '{default_branch}').",
            }

    # --- Trigger pipeline with fixture specs (live spec fetching TODO) -------
    fixtures_dir = Path(__file__).parents[5] / "tests" / "fixtures"
    v1_path = fixtures_dir / "api-v1" / "fakepay.yaml"
    v2_path = fixtures_dir / "api-v2" / "fakepay.yaml"

    try:
        with open(v1_path) as f:
            old_spec = yaml.safe_load(f)
        with open(v2_path) as f:
            new_spec = yaml.safe_load(f)
    except FileNotFoundError as exc:
        logger.error("Fixture spec file missing: %s", exc)
        raise HTTPException(status_code=500, detail=f"Spec fixture not found: {exc}")

    result = run_pipeline(
        old_spec_data=old_spec,
        new_spec_data=new_spec,
        repo_path=fixtures_dir / "demo-repository",
        repo_name=repo_full_name,
        provider="fakepay",
    )

    return {
        "status": "accepted",
        "message": f"GitHub '{event}' event processed for {repo_full_name}.",
        "delivery_id": delivery_id,
        "pipeline_result": result,
    }
