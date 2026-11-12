"""Tests for FastAPI REST Control Plane routes against Neon Lakebase Postgres."""

import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


class TestHealthAndInventoryRoutes:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert "Neon" in response.json()["database"]

    def test_events_stream_status(self):
        """GET /api/events/status should return status ready."""
        response = client.get("/api/events/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "active_subscribers" in data

    def test_list_providers(self):
        response = client.get("/api/inventory/providers")
        assert response.status_code == 200
        providers = response.json()
        assert isinstance(providers, list)
        fakepay = next((p for p in providers if p["slug"] == "fakepay"), None)
        assert fakepay is not None, "fakepay provider must be present"
        # Enriched fields added in this session
        assert "health" in fakepay, "providers must include 'health'"
        assert fakepay["health"] in ("healthy", "degraded", "down")
        assert "current_version" in fakepay
        assert "latest_version" in fakepay
        assert "webhook_active" in fakepay
        assert "usages_count" in fakepay
        assert "repos_affected" in fakepay
        assert "version_history" in fakepay
        assert isinstance(fakepay["version_history"], list)

    def test_get_provider_by_slug(self):
        response = client.get("/api/inventory/providers/fakepay")
        assert response.status_code == 200
        p = response.json()
        assert p["slug"] == "fakepay"
        assert "breaking_change_history" in p
        assert isinstance(p["breaking_change_history"], list)

    def test_get_provider_by_slug_not_found(self):
        response = client.get("/api/inventory/providers/does-not-exist")
        assert response.status_code == 404

    def test_list_validations(self):
        """GET /api/validations should return an envelope with an items list."""
        response = client.get("/api/validations")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert "total" in data

    def test_list_validations_status_filter(self):
        """Filter by status=passed should return only passed runs (or empty list)."""
        response = client.get("/api/validations?status=passed")
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "passed"

    def test_list_repositories(self):
        response = client.get("/api/inventory/repositories")
        assert response.status_code == 200
        repos = response.json()
        assert isinstance(repos, list)
        assert any(r["name"] == "demo-checkout" for r in repos)

    def test_list_usages(self):
        response = client.get("/api/inventory/usages?provider=fakepay")
        assert response.status_code == 200
        usages = response.json()
        assert isinstance(usages, list)
        assert len(usages) >= 5


class TestChangesAndImpactRoutes:
    def test_get_changes(self):
        response = client.get("/api/changes")
        assert response.status_code == 200
        data = response.json()
        # Either list or diff summary object
        if isinstance(data, dict):
            assert data["provider"] == "fakepay"
            assert data["total_changes"] == 3
        else:
            assert isinstance(data, list)

    def test_get_impact_analysis(self):
        response = client.get("/api/impact?provider=fakepay")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "fakepay"
        assert len(data["affected_files"]) >= 4
        assert data["overall_confidence"] >= 0.85


class TestMigrationAndValidationRoutes:
    def test_trigger_and_query_migration(self):
        # 1. Trigger migration
        payload = {
            "provider": "fakepay",
            "repo_name": "demo-org/demo-checkout",
            "create_draft_pr": True,
        }
        res = client.post("/api/migrations/trigger", json=payload)
        assert res.status_code == 201
        data = res.json()
        migration_id = data["migration_id"]
        assert migration_id.startswith("mig_")
        assert data["pipeline_result"]["validation_status"] == "PASS"

        # 2. Query migration by ID
        get_res = client.get(f"/api/migrations/{migration_id}")
        assert get_res.status_code == 200
        mig_data = get_res.json()
        assert mig_data["status"] == "passed"

        # 3. Query validation run
        val_res = client.get(f"/api/validations/{migration_id}")
        assert val_res.status_code == 200
        val_data = val_res.json()
        assert val_data["overall_status"] == "PASS"
