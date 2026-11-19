"""Tests for GitHub App connection, repository ingestion, and deep AST scanning routes."""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)

FIXTURES = Path(__file__).parent / "fixtures"
DEMO_REPO = FIXTURES / "demo-repository"


class TestAuthAndSessionRoutes:
    def test_get_session(self):
        res = client.get("/api/auth/session")
        assert res.status_code == 200
        data = res.json()
        assert "user" in data
        assert "workspace" in data
        assert "github" in data

    def test_get_github_authorize_url(self):
        res = client.get("/api/auth/github/authorize-url")
        assert res.status_code == 200
        data = res.json()
        assert "url" in data
        assert "type" in data

    def test_connect_and_disconnect_github(self):
        # Patch the httpx call inside connect_github so it doesn't hit GitHub
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "login": "demo-org",
            "type": "Organization",
            "avatar_url": "https://avatars.githubusercontent.com/demo-org",
            "name": "Demo Org",
        }
        with patch("apps.api.app.api.routes.auth.httpx.Client") as mock_client_cls:
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.get.return_value = mock_response
            mock_client_cls.return_value = mock_ctx

            res = client.post(
                "/api/auth/github/connect",
                json={"account_login": "demo-org", "token": "ghp_test_mock_token"},
            )
        assert res.status_code == 200
        assert res.json()["status"] == "connected"

        # Check session reflects connected
        sess = client.get("/api/auth/session").json()
        assert sess["github"]["connected"] is True


class TestRepositoryManagementAndScan:
    def test_list_github_repositories(self):
        # Patch httpx so the route doesn't call the real GitHub API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "id": 1,
                "full_name": "rizzzabh-06/fakepay-demo-consumer",
                "name": "fakepay-demo-consumer",
                "default_branch": "main",
                "language": "TypeScript",
                "private": False,
                "description": "Demo checkout service",
                "html_url": "https://github.com/rizzzabh-06/fakepay-demo-consumer",
                "stargazers_count": 0,
            }
        ]
        with patch("apps.api.app.api.routes.repositories.httpx.Client") as mock_client_cls:
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.get.return_value = mock_response
            mock_client_cls.return_value = mock_ctx

            res = client.get("/api/repositories/github")
        assert res.status_code == 200
        data = res.json()
        assert "repositories" in data
        assert len(data["repositories"]) >= 1

    def test_search_github_repositories(self):
        # Patch httpx so the route doesn't call the real GitHub search API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "total_count": 1,
            "items": [
                {
                    "id": 1,
                    "full_name": "rizzzabh-06/fakepay-demo-consumer",
                    "name": "fakepay-demo-consumer",
                    "default_branch": "main",
                    "language": "TypeScript",
                    "private": False,
                    "description": "Demo checkout service",
                    "html_url": "https://github.com/rizzzabh-06/fakepay-demo-consumer",
                    "stargazers_count": 0,
                }
            ],
        }
        with patch("apps.api.app.api.routes.repositories.httpx.Client") as mock_client_cls:
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.get.return_value = mock_response
            mock_client_cls.return_value = mock_ctx

            res = client.get("/api/repositories/github?search=checkout")
        assert res.status_code == 200
        data = res.json()
        assert "repositories" in data
        assert isinstance(data["repositories"], list)

    def test_connect_and_scan_repository(self):
        # 1. Connect
        res = client.post(
            "/api/repositories/connect",
            json={"github_repo": "rizzzabh-06/fakepay-demo-consumer", "name": "fakepay-demo-consumer"},
        )
        assert res.status_code in (200, 201)
        repo_id = res.json()["id"]

        # 2. Trigger Scan — patch _ensure_repository_local to return the fixture demo repo
        with patch(
            "apps.api.app.api.routes.repositories._ensure_repository_local",
            return_value=DEMO_REPO,
        ):
            scan_res = client.post(f"/api/repositories/{repo_id}/scan")
        assert scan_res.status_code == 200
        scan_data = scan_res.json()
        assert scan_data["status"] == "ready"
        assert scan_data["usages_discovered"] >= 5

    def test_disconnect_repository(self):
        # Connect disposable test repo
        res = client.post(
            "/api/repositories/connect",
            json={"github_repo": "test-org/disposable-repo", "name": "disposable-repo"},
        )
        repo_id = res.json()["id"]
        del_res = client.delete(f"/api/repositories/{repo_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "disconnected"




class TestAutomationSettings:
    def test_get_and_update_automation(self):
        get_res = client.get("/api/automation")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["draft_pr_only"] is True

        # Update
        post_res = client.post(
            "/api/automation",
            json={
                "auto_scan_on_push": True,
                "auto_pr_on_breaking": True,
                "confidence_threshold": 0.95,
                "draft_pr_only": True,
            },
        )
        assert post_res.status_code == 200
        assert post_res.json()["settings"]["confidence_threshold"] == 0.95
