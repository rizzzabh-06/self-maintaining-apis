"""Milestone 8 — Webhook Receiver tests.

Verifies HMAC signature verification, rejection of invalid requests,
and end-to-end trigger via POST /webhooks/provider.
"""

import hashlib
import hmac
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.api.routes.webhooks import DEFAULT_SECRET

client = TestClient(app)


def compute_signature(payload: dict, secret: str = DEFAULT_SECRET) -> str:
    payload_bytes = json.dumps(payload).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


class TestWebhookAuthentication:
    def test_missing_signature_returns_401(self):
        payload = {"provider": "fakepay", "event": "api_version_released"}
        response = client.post("/webhooks/provider", json=payload)
        assert response.status_code == 401
        assert "Invalid or missing webhook HMAC signature" in response.json()["detail"]

    def test_invalid_signature_returns_401(self):
        payload = {"provider": "fakepay", "event": "api_version_released"}
        response = client.post(
            "/webhooks/provider",
            json=payload,
            headers={"X-Provider-Signature": "sha256=invalid_signature_hex_123"},
        )
        assert response.status_code == 401

    def test_valid_signature_returns_202_and_runs_pipeline(self):
        payload = {
            "provider": "fakepay",
            "event": "api_version_released",
            "from_version": "1.0.0",
            "to_version": "2.0.0",
            "repo_name": "demo-org/demo-checkout",
        }
        raw_bytes = json.dumps(payload).encode("utf-8")
        sig = hmac.new(DEFAULT_SECRET.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()
        response = client.post(
            "/webhooks/provider",
            content=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Provider-Signature": f"sha256={sig}",
            },
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "accepted"
        pipeline = data["pipeline_result"]
        assert pipeline["changes_detected"] == 3
        assert pipeline["validation_status"] == "PASS"
        assert pipeline["pr_created"] is True
        assert pipeline["draft_pr"]["is_draft"] is True
