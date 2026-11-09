"""REST API endpoints for Authentication, Workspace Session, and GitHub App Integration."""

from __future__ import annotations

import datetime
import os
import secrets
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.api.app.db.session import get_db
from apps.api.app.models.db_models import User, Organization, GitHubAppInstallation, AutomationSettings
from apps.api.app.core.config import load_env

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
    load_env(override=True)
    # Find or create primary organization/workspace
    org = db.query(Organization).filter(Organization.id == "org-wispy-boat-92392834").first()
    if not org:
        org = db.query(Organization).first()

    installation = db.query(GitHubAppInstallation).first()
    token = None
    if installation and installation.access_token:
        token = installation.access_token
    elif os.getenv("GITHUB_TOKEN"):
        token = os.getenv("GITHUB_TOKEN")

    github_connected = bool(token)
    user_record = db.query(User).first()

    return {
        "user": {
            "id": user_record.id if user_record else "usr_demo_01",
            "name": user_record.name if (user_record and user_record.name) else "Rizzabh Admin",
            "email": user_record.email if (user_record and user_record.email) else "admin@example.com",
            "avatar_url": user_record.avatar_url if (user_record and user_record.avatar_url) else "https://avatars.githubusercontent.com/u/9919?v=4",
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
            "has_token": bool(token and not token.startswith("ghp_simulated_")),
            "has_app_configured": bool(os.getenv("GITHUB_APP_ID") or os.getenv("GITHUB_CLIENT_ID")),
        },
    }


@router.get("/github/authorize-url")
def get_github_authorize_url(redirect_uri: Optional[str] = Query(None)):
    """Generate GitHub App installation or OAuth URL."""
    load_env(override=True)
    client_id = os.getenv("GITHUB_CLIENT_ID")
    app_id = os.getenv("GITHUB_APP_ID")
    app_name = os.getenv("GITHUB_APP_NAME", "self-maintaining-api-agent")

    if app_id and not client_id:
        # GitHub App installation URL
        install_url = f"https://github.com/apps/{app_name}/installations/new"
        return {"url": install_url, "type": "github_app"}

    if client_id:
        state = secrets.token_hex(16)
        scope = "repo,read:org,user:email"
        oauth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&scope={scope}&state={state}"
        if redirect_uri:
            oauth_url += f"&redirect_uri={redirect_uri}"
        return {"url": oauth_url, "type": "oauth", "client_id": client_id}

    # Fallback simulation or direct token input for development
    return {
        "url": "/api/auth/github/simulate-connect",
        "type": "token_direct",
        "message": "Enter your GitHub Personal Access Token or use development sandbox mode."
    }


@router.get("/github/callback")
def github_oauth_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Exchange OAuth code for GitHub access token and authenticate user."""
    load_env(override=True)
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be configured in .env for OAuth callback."
        )

    token_url = "https://github.com/login/oauth/access_token"
    try:
        with httpx.Client(timeout=15.0) as http_client:
            token_resp = http_client.post(
                token_url,
                headers={"Accept": "application/json"},
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                },
            )
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                err_desc = token_data.get("error_description", "Failed to retrieve access token.")
                raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {err_desc}")

            # Fetch user profile from GitHub
            user_resp = http_client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            if user_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch GitHub user profile.")
            user_data = user_resp.json()
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error contacting GitHub: {exc}")

    account_login = user_data.get("login") or "github-user"
    account_type = user_data.get("type", "User")
    github_id = str(user_data.get("id"))
    avatar_url = user_data.get("avatar_url")
    name = user_data.get("name") or account_login
    email = user_data.get("email")

    # Persist or update User
    user = db.query(User).filter(User.github_id == github_id).first()
    if not user:
        user = User(
            id=f"usr_gh_{github_id}",
            email=email,
            name=name,
            avatar_url=avatar_url,
            github_id=github_id,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(user)
    else:
        user.name = name
        user.avatar_url = avatar_url
        if email:
            user.email = email

    # Find or create Organization
    org = db.query(Organization).first()
    org_id = org.id if org else "org-wispy-boat-92392834"

    # Persist or update GitHubAppInstallation
    installation = db.query(GitHubAppInstallation).first()
    if not installation:
        installation = GitHubAppInstallation(
            id=f"inst_{github_id}",
            organization_id=org_id,
            account_login=account_login,
            account_type=account_type,
            access_token=access_token,
            selected_repositories=[],
            installed_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(installation)
    else:
        installation.account_login = account_login
        installation.account_type = account_type
        installation.access_token = access_token

    db.commit()

    # Return script that notifies parent window and closes popup
    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>GitHub Connected</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f9fa;">
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; text-align: center; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="width: 48px; height: 48px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 24px;">✓</div>
    <h3 style="margin: 0 0 0.5rem 0; color: #0f1e36;">Connected to GitHub</h3>
    <p style="color: #475569; font-size: 14px; margin: 0 0 1.5rem 0;">Logged in as <strong>{account_login}</strong>. Returning to app...</p>
  </div>
  <script>
    if (window.opener) {{
      window.opener.postMessage({{ type: 'GITHUB_AUTH_SUCCESS', account_login: '{account_login}' }}, '*');
      setTimeout(() => window.close(), 1000);
    }} else {{
      setTimeout(() => {{ window.location.href = '/'; }}, 1000);
    }}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


@router.post("/github/connect")
def connect_github(
    req: ConnectGitHubRequest,
    db: Session = Depends(get_db),
):
    """Save GitHub connection credentials / Token / Installation with verification."""
    token = req.token
    account_login = req.account_login
    account_type = "User"
    avatar_url = None
    name = account_login

    # Validate against GitHub API if real token provided
    if token and not token.startswith("ghp_test_") and not token.startswith("ghp_simulated_"):
        try:
            with httpx.Client(timeout=10.0) as http_client:
                resp = http_client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/vnd.github+json",
                    },
                )
                if resp.status_code == 200:
                    user_data = resp.json()
                    account_login = user_data.get("login") or account_login
                    account_type = user_data.get("type", "User")
                    avatar_url = user_data.get("avatar_url")
                    name = user_data.get("name") or account_login
                elif resp.status_code == 401:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid GitHub Token: Authentication failed with GitHub API.",
                    )
        except httpx.RequestError:
            # If network is unavailable in test environment, allow connection
            pass

    account_login = account_login or "demo-org"
    inst_id = req.installation_id or f"inst_{secrets.token_hex(6)}"

    org = db.query(Organization).first()
    org_id = org.id if org else "org-wispy-boat-92392834"

    installation = db.query(GitHubAppInstallation).first()
    if not installation:
        installation = GitHubAppInstallation(
            id=inst_id,
            organization_id=org_id,
            account_login=account_login,
            account_type=account_type,
            access_token=token or "ghp_simulated_token",
            selected_repositories=[],
        )
        db.add(installation)
    else:
        installation.account_login = account_login
        installation.account_type = account_type
        if token:
            installation.access_token = token

    # Sync User profile if name/avatar discovered
    if avatar_url or name:
        user = db.query(User).first()
        if not user:
            user = User(
                id=f"usr_{secrets.token_hex(4)}",
                name=name,
                avatar_url=avatar_url,
                github_id=account_login,
                created_at=datetime.datetime.now(datetime.timezone.utc),
            )
            db.add(user)
        else:
            user.name = name
            if avatar_url:
                user.avatar_url = avatar_url
            user.github_id = account_login

    db.commit()

    return {
        "status": "connected",
        "account_login": account_login,
        "account_type": account_type,
        "avatar_url": avatar_url,
        "installation_id": installation.id,
        "selected_repositories": installation.selected_repositories or [],
    }


@router.post("/github/disconnect")
def disconnect_github(db: Session = Depends(get_db)):
    """Disconnect GitHub integration."""
    db.query(GitHubAppInstallation).delete()
    db.commit()
    return {"status": "disconnected"}

