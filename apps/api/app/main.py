"""FastAPI application entrypoint for the Self-Maintaining API Agent."""

from __future__ import annotations

from fastapi import FastAPI
from apps.api.app.api.routes.webhooks import router as webhooks_router

app = FastAPI(
    title="Self-Maintaining API Agent",
    description="Detects external API changes, analyzes impact, generates bounded migrations, validates in sandboxes, and opens GitHub draft PRs.",
    version="0.1.0",
)

app.include_router(webhooks_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "self-maintaining-api-agent"}
