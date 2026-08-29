"""Webhook receivers for external API provider change events."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import yaml
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel

from apps.api.app.core.security import verify_webhook_signature
from apps.worker.jobs.process_webhook import run_pipeline

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

DEFAULT_SECRET = os.getenv("FAKEPAY_WEBHOOK_SECRET", "test_webhook_secret_key_123")


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
