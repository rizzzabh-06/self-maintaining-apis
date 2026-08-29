"""FastAPI application entrypoint for the Self-Maintaining API Agent."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.api.routes.auth import router as auth_router
from apps.api.app.api.routes.repositories import router as repositories_router
from apps.api.app.api.routes.automation import router as automation_router
from apps.api.app.api.routes.webhooks import router as webhooks_router
from apps.api.app.api.routes.inventory import router as inventory_router
from apps.api.app.api.routes.changes import router as changes_router
from apps.api.app.api.routes.impact import router as impact_router
from apps.api.app.api.routes.migrations import router as migrations_router
from apps.api.app.api.routes.validations import router as validations_router

app = FastAPI(
    title="Self-Maintaining API Agent API",
    description="Detects external API changes, analyzes impact, generates bounded migrations, validates in sandboxes, and opens GitHub draft PRs.",
    version="0.2.0",
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router)
app.include_router(repositories_router)
app.include_router(automation_router)
app.include_router(webhooks_router)
app.include_router(inventory_router)
app.include_router(changes_router)
app.include_router(impact_router)
app.include_router(migrations_router)
app.include_router(validations_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "self-maintaining-api-agent",
        "database": "Neon Lakebase Postgres (connected)",
    }
