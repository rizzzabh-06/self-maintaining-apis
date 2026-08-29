"""Security utilities including HMAC webhook signature verification."""

from __future__ import annotations

import hmac
import hashlib


def verify_webhook_signature(
    payload_bytes: bytes,
    signature_header: str | None,
    secret: str,
) -> bool:
    """Verify HMAC SHA-256 signature on incoming provider webhooks."""
    if not signature_header or not secret:
        return False

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    # Support header prefixed with "sha256=" or plain hex
    actual_signature = signature_header
    if signature_header.startswith("sha256="):
        actual_signature = signature_header.split("sha256=")[1]

    return hmac.compare_digest(actual_signature.strip(), expected_signature.strip())
