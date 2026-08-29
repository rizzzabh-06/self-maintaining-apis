"""Seed Neon Lakebase Postgres database with initial organization, repository, and provider inventory."""

from __future__ import annotations

import datetime
from pathlib import Path
import yaml

from apps.api.app.db.session import SessionLocal
from apps.api.app.models.db_models import (
    Organization,
    Repository,
    Provider,
    APIVersion,
    APIUsageModel,
)
from packages.repository_analyzer.scanner import scan_repository

FIXTURES_DIR = Path(__file__).parents[1] / "tests" / "fixtures"
DEMO_REPO = FIXTURES_DIR / "demo-repository"


def seed():
    db = SessionLocal()
    try:
        print("🌱 Seeding Neon Lakebase Postgres...")

        # 1. Organization
        org = db.query(Organization).filter(Organization.id == "org-wispy-boat-92392834").first()
        if not org:
            org = Organization(
                id="org-wispy-boat-92392834",
                name="Rizzabh",
                created_at=datetime.datetime.utcnow(),
            )
            db.add(org)
            db.commit()
            print("  ✓ Created Organization: Rizzabh (org-wispy-boat-92392834)")

        # 2. Provider: FakePay
        provider = db.query(Provider).filter(Provider.slug == "fakepay").first()
        if not provider:
            provider = Provider(
                id="prov_fakepay_01",
                name="FakePay",
                slug="fakepay",
                webhook_secret="test_webhook_secret_key_123",
                created_at=datetime.datetime.utcnow(),
            )
            db.add(provider)
            db.commit()
            print("  ✓ Created Provider: FakePay")

        # 3. API Version: v1.0.0
        v1_path = FIXTURES_DIR / "api-v1" / "fakepay.yaml"
        version_v1 = db.query(APIVersion).filter(
            APIVersion.provider_id == provider.id, APIVersion.version == "1.0.0"
        ).first()
        if not version_v1:
            version_v1 = APIVersion(
                id="ver_fakepay_v1",
                provider_id=provider.id,
                version="1.0.0",
                spec_location=str(v1_path),
                retrieved_at=datetime.datetime.utcnow(),
            )
            db.add(version_v1)
            db.commit()
            print("  ✓ Created API Version: FakePay v1.0.0")

        # 4. Repository: demo-checkout
        repo = db.query(Repository).filter(Repository.id == "repo_demo_checkout").first()
        if not repo:
            repo = Repository(
                id="repo_demo_checkout",
                organization_id=org.id,
                name="demo-checkout",
                github_repo="demo-org/demo-checkout",
                default_branch="main",
                language="TypeScript",
                last_scanned_at=datetime.datetime.utcnow(),
                created_at=datetime.datetime.utcnow(),
            )
            db.add(repo)
            db.commit()
            print("  ✓ Created Repository: demo-checkout")

        # 5. Scan repository and persist inventory
        scan_res = scan_repository(DEMO_REPO)
        # Clear existing usages if any
        db.query(APIUsageModel).filter(APIUsageModel.repository_id == repo.id).delete()
        for idx, u in enumerate(scan_res.usages, start=1):
            db_usage = APIUsageModel(
                id=f"use_{repo.id}_{idx}",
                repository_id=repo.id,
                provider=u.provider,
                endpoint=u.endpoint,
                file_path=u.file_path,
                line_number=u.line_number,
                symbol=u.symbol,
                usage_type=u.usage_type.value,
                confidence=u.confidence,
                snippet=u.snippet,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(db_usage)
        db.commit()
        print(f"  ✓ Persisted {len(scan_res.usages)} API usages in live inventory")

        print("✨ Seeding completed successfully on Neon Lakebase Postgres!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
