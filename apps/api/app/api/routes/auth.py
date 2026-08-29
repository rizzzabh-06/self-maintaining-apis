"""REST API endpoints for Authentication, Workspace Session, and GitHub App Integration."""

from __future__ import annotations

import os
import secrets
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import User, Organization, GitHubAppInstallation, AutomationSettings

router = APIRouter(prefix="/api/auth", tags=["Auth & Workspace"])


class ConnectGitHubRequest(BaseModel):
    token: Optional[str] = None
    account_login: Optional[str] = None
    installation_id: Optional[str] = None


class WorkspaceCreateRequest(BaseModel):
    name: str = "Default Workspace"
    slug: Optional[str] = None


@router.get("/session")
def get_session(db: Session = Depends(get_db)):
    """Retrieve current logged-in user, active workspace, and GitHub connection status."""
    # Find or create primary organization/workspace
    org = db.query(Organization).filter(Organization.id == "org-wispy-boat-92392834").first()
    if not org:
        org = db.query(Organization).first()

    installation = db.query(GitHubAppInstallation).first()
    github_connected = installation is not None or bool(os.getenv("GITHUB_TOKEN"))

    return {
        "user": {
            "id": "usr_demo_01",
            "name": "Rizzabh Admin",
            "email": "admin@example.com",
            "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
        },
        "workspace": {
            "id": org.id if org else "org-wispy-boat-92392834",
            "name": org.name if org else "Rizzabh",
            "slug": org.slug if org else "rizzabh",
        },
        "github": {
            "connected": github_connected,
            "account_login": installation.account_login if installation else (os.getenv("GITHUB_USER") or "demo-org"),
            "account_type": installation.account_type if installation else "Organization",
            "installation_id": installation.id if installation else None,
            "has_app_configured": bool(os.getenv("GITHUB_APP_ID") or os.getenv("GITHUB_CLIENT_ID")),
        },
    }


@router.get("/github/authorize-url")
def get_github_authorize_url():
    """Generate GitHub App installation or OAuth URL."""
    client_id = os.getenv("GITHUB_CLIENT_ID") or os.getenv("GITHUB_APP_ID")
    app_name = os.getenv("GITHUB_APP_NAME", "self-maintaining-api-agent")

    if os.getenv("GITHUB_APP_ID"):
        # GitHub App installation URL
        install_url = f"https://github.com/apps/{app_name}/installations/new"
        return {"url": install_url, "type": "github_app"}

    if client_id:
        state = secrets.token_hex(16)
        oauth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&scope=repo,read:org&state={state}"
        return {"url": oauth_url, "type": "oauth"}

    # Fallback simulation URL for development
    return {
        "url": "/api/auth/github/simulate-connect",
        "type": "token_direct",
        "message": "Enter your GitHub Personal Access Token or use development sandbox mode."
    }


@router.post("/github/connect")
def connect_github(
    req: ConnectGitHubRequest,
    db: Session = Depends(get_db),
):
    """Save GitHub connection credentials / Token / Installation."""
    account_login = req.account_login or "demo-org"
    inst_id = req.installation_id or f"inst_{secrets.token_hex(6)}"

    installation = db.query(GitHubAppInstallation).filter(GitHubAppInstallation.account_login == account_login).first()
    if not installation:
        installation = GitHubAppInstallation(
            id=inst_id,
            organization_id="org-wispy-boat-92392834",
            account_login=account_login,
            account_type="Organization",
            access_token=req.token or "ghp_simulated_token",
            selected_repositories=["demo-org/demo-checkout", "demo-org/payment-service"],
        )
        db.add(installation)
    else:
        if req.token:
            installation.access_token = req.token
        installation.selected_repositories = ["demo-org/demo-checkout", "demo-org/payment-service"]

    db.commit()

    return {
        "status": "connected",
        "account_login": account_login,
        "installation_id": installation.id,
        "selected_repositories": installation.selected_repositories,
    }


@router.post("/github/disconnect")
def disconnect_github(db: Session = Depends(get_db)):
    """Disconnect GitHub integration."""
    db.query(GitHubAppInstallation).delete()
    db.commit()
    return {"status": "disconnected"}
