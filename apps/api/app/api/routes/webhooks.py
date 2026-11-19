"""Webhook receivers for external API provider change events and GitHub App events."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel

from apps.api.app.core.security import verify_webhook_signature
from apps.api.app.core.events import event_broadcaster
from apps.worker.jobs.process_webhook import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

DEFAULT_SECRET = os.getenv("FAKEPAY_WEBHOOK_SECRET", "")
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")


class ProviderWebhookPayload(BaseModel):
    provider: str
    event: str
    from_version: str
    to_version: str
    old_spec_url: str | None = None
    new_spec_url: str | None = None
    repo_path: str | None = None
    repo_name: str | None = None
    old_spec: dict | None = None
    new_spec: dict | None = None


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
        payload_dict = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    provider = payload_dict.get("provider")
    repo_name = payload_dict.get("repo_name")
    old_spec = payload_dict.get("old_spec")
    new_spec = payload_dict.get("new_spec")
    repo_path = payload_dict.get("repo_path")

    event_broadcaster.broadcast_sync("webhook_received", {
        "source": "provider",
        "provider": provider,
        "event": payload_dict.get("event", "api_change"),
        "repo": repo_name or "",
    })

    # Spec retrieval from a provider URL/changelog is not implemented; require inline specs.
    if not old_spec or not new_spec:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provider webhook requires inline `old_spec` and `new_spec` (spec fetching not implemented).",
        )

    if not repo_path:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="target repository path required",
        )

    # Run the pipeline with the real inline specs and target repository.
    result = run_pipeline(
        old_spec_data=old_spec,
        new_spec_data=new_spec,
        repo_path=Path(repo_path),
        repo_name=repo_name or "",
        provider=provider or "",
    )

    return {
        "status": "accepted",
        "message": f"Successfully processed change event for {provider}.",
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GITHUB_WEBHOOK_SECRET not configured; webhook rejected.",
        )

    if not verify_webhook_signature(body_bytes, x_hub_signature_256, GITHUB_WEBHOOK_SECRET):
        logger.warning(
            "GitHub webhook HMAC verification failed. delivery=%s event=%s",
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

    # --- Spec retrieval from GitHub is not implemented; fail loudly. ---------
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="GitHub webhook spec retrieval not implemented; cannot run pipeline.",
    )
