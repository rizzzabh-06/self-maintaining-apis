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

    def test_list_providers(self):
        response = client.get("/api/inventory/providers")
        assert response.status_code == 200
        providers = response.json()
        assert isinstance(providers, list)
        assert any(p["slug"] == "fakepay" for p in providers)

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
