"""Tests for GitHub App connection, repository ingestion, and deep AST scanning routes."""

import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


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
        # Connect
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
        res = client.get("/api/repositories/github")
        assert res.status_code == 200
        data = res.json()
        assert "repositories" in data
        assert len(data["repositories"]) >= 1

    def test_connect_and_scan_repository(self):
        # 1. Connect
        res = client.post(
            "/api/repositories/connect",
            json={"github_repo": "demo-org/demo-checkout", "name": "demo-checkout"},
        )
        assert res.status_code in (200, 201)
        repo_id = res.json()["id"]

        # 2. Trigger Scan
        scan_res = client.post(f"/api/repositories/{repo_id}/scan")
        assert scan_res.status_code == 200
        scan_data = scan_res.json()
        assert scan_data["status"] == "ready"
        assert scan_data["usages_discovered"] >= 5


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
