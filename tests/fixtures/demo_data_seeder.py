#!/usr/bin/env python3
"""Demo data seeder for Self-Maintaining APIs system.

Populates the database with realistic migration history for impressive demos.

Usage:
    python demo_data_seeder.py --populate     # Add demo data
    python demo_data_seeder.py --clear        # Clear demo data
    python demo_data_seeder.py --verbose      # Verbose output
"""

import argparse
import datetime
import random
import sys
import uuid
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.app.models.db_models import (
    Base,
    Organization,
    Repository,
    Provider,
    APIVersion,
    APIChangeModel,
    APIUsageModel,
    MigrationRun,
    ValidationRun,
    AutomationSettings,
)
from apps.api.app.db.session import get_db_url


# Demo data constants
PROVIDERS = ["fakepay", "stripe"]
REPOSITORIES = [
    {"name": "demo-checkout", "github_repo": "demo-org/demo-checkout", "language": "TypeScript"},
    {"name": "payment-service", "github_repo": "demo-org/payment-service", "language": "Python"},
    {"name": "billing-api", "github_repo": "demo-org/billing-api", "language": "TypeScript"},
    {"name": "fakepay-nextjs-demo", "github_repo": "rizzzabh-06/fakepay-nextjs-demo", "language": "TypeScript"},
]

CHANGE_TYPES = [
    "ENDPOINT_RENAMED",
    "FIELD_REQUIRED",
    "FIELD_REMOVED",
    "TYPE_CHANGED",
    "RESPONSE_SCHEMA_CHANGED",
]

ENDPOINTS_FAKEPAY = ["/payment", "/payment/{id}"]
ENDPOINTS_STRIPE = ["/v1/charges", "/v1/payment_intents", "/v1/customers"]


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID."""
    return f"{prefix}{uuid.uuid4().hex[:16]}" if prefix else uuid.uuid4().hex[:16]


def random_datetime_last_30_days() -> datetime.datetime:
    """Generate random datetime within last 30 days."""
    now = datetime.datetime.utcnow()
    days_ago = random.randint(0, 30)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)
    return now - datetime.timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)


def seed_organization(session) -> Organization:
    """Create demo organization."""
    org = Organization(
        id=generate_id("org_"),
        name="Demo Organization",
        slug="demo-org",
    )
    session.add(org)
    
    # Add automation settings
    automation = AutomationSettings(
        id=generate_id("auto_"),
        organization_id=org.id,
        auto_scan_on_push=True,
        auto_pr_on_breaking=True,
        confidence_threshold=0.90,
        draft_pr_only=True,
    )
    session.add(automation)
    
    return org


def seed_providers(session) -> dict:
    """Create providers."""
    providers = {}
    for provider_name in PROVIDERS:
        provider = Provider(
            id=generate_id("prov_"),
            name=provider_name.title(),
            slug=provider_name,
            is_active=True,
        )
        session.add(provider)
        providers[provider_name] = provider
        
        # Add API versions
        v1 = APIVersion(
            id=generate_id("ver_"),
            provider_id=provider.id,
            version="1.0.0",
            spec_location=f"tests/fixtures/api-v1/{provider_name}.yaml",
            retrieved_at=random_datetime_last_30_days(),
        )
        v2 = APIVersion(
            id=generate_id("ver_"),
            provider_id=provider.id,
            version="2.0.0",
            spec_location=f"tests/fixtures/api-v2/{provider_name}.yaml",
            retrieved_at=random_datetime_last_30_days(),
        )
        session.add(v1)
        session.add(v2)
        
        # Add breaking changes for v2
        if provider_name == "fakepay":
            changes = [
                {
                    "change_type": "ENDPOINT_RENAMED",
                    "endpoint": "/payment",
                    "old_value": "/payment",
                    "new_value": "/payments",
                    "description": "POST endpoint renamed from singular to plural",
                },
                {
                    "change_type": "ENDPOINT_RENAMED",
                    "endpoint": "/payment/{id}",
                    "old_value": "/payment/{id}",
                    "new_value": "/payments/{id}",
                    "description": "GET endpoint renamed from singular to plural",
                },
                {
                    "change_type": "FIELD_REQUIRED",
                    "endpoint": "/payments",
                    "old_value": "optional",
                    "new_value": "required",
                    "description": "Field 'currency' is now required in CreatePaymentRequest",
                },
            ]
        else:  # stripe
            changes = [
                {
                    "change_type": "ENDPOINT_RENAMED",
                    "endpoint": "/v1/charges",
                    "old_value": "/v1/charges",
                    "new_value": "/v1/payment_intents",
                    "description": "Charges API deprecated, use Payment Intents",
                },
                {
                    "change_type": "FIELD_REQUIRED",
                    "endpoint": "/v1/payment_intents",
                    "old_value": "not present",
                    "new_value": "required",
                    "description": "Field 'payment_method' is now required",
                },
            ]
        
        for change_data in changes:
            change = APIChangeModel(
                id=generate_id("chg_"),
                api_version_id=v2.id,
                change_type=change_data["change_type"],
                breaking=True,
                endpoint=change_data.get("endpoint"),
                old_value=change_data.get("old_value"),
                new_value=change_data.get("new_value"),
                severity="critical",
                description=change_data["description"],
                evidence={"detected_via": "openapi_diff"},
            )
            session.add(change)
    
    return providers


def seed_repositories(session, org: Organization) -> list:
    """Create demo repositories."""
    repos = []
    for repo_data in REPOSITORIES:
        repo = Repository(
            id=generate_id("repo_"),
            organization_id=org.id,
            name=repo_data["name"],
            github_repo=repo_data["github_repo"],
            github_id=random.randint(1000, 9999),
            default_branch="main",
            language=repo_data["language"],
            is_monitored=True,
            status="ready",
            last_scanned_at=random_datetime_last_30_days(),
        )
        session.add(repo)
        repos.append(repo)
    
    return repos


def seed_usages(session, repositories: list) -> None:
    """Create API usages for repositories."""
    for repo in repositories:
        provider = random.choice(PROVIDERS)
        endpoints = ENDPOINTS_FAKEPAY if provider == "fakepay" else ENDPOINTS_STRIPE
        
        # Create 3-8 usages per repository
        num_usages = random.randint(3, 8)
        for _ in range(num_usages):
            usage = APIUsageModel(
                id=generate_id("usage_"),
                repository_id=repo.id,
                provider=provider,
                endpoint=random.choice(endpoints),
                file_path=f"src/{random.choice(['lib', 'api', 'services'])}/{random.choice(['client', 'payment', 'checkout'])}.{random.choice(['ts', 'py', 'go'])}",
                line_number=random.randint(10, 200),
                symbol=random.choice(["createPayment", "getPayment", "createCharge", "getCharge"]),
                usage_type=random.choice(["function_call", "import", "type_reference"]),
                confidence=round(random.uniform(0.85, 1.0), 2),
                snippet='const payment = await client.createPayment({ amount: 1000 })',
            )
            session.add(usage)


def seed_migrations(session, repositories: list, verbose: bool = False) -> None:
    """Create migration history."""
    statuses = ["passed", "passed", "passed", "passed", "passed", "passed", 
                "passed", "passed", "failed", "pending"]
    
    for i in range(20):
        repo = random.choice(repositories)
        provider = random.choice(PROVIDERS)
        status = random.choice(statuses)
        confidence = round(random.uniform(0.92, 0.99), 2)
        created_at = random_datetime_last_30_days()
        
        # Create more realistic distribution
        if i < 15:  # 75% success rate
            status = "passed"
        elif i < 18:  # 15% failed
            status = "failed"
        else:  # 10% in progress or pending
            status = random.choice(["pending", "validating"])
        
        migration = MigrationRun(
            id=generate_id("mig_"),
            repository_id=repo.id,
            provider=provider,
            status=status if status != "passed" else "pr_created",
            plan={
                "provider": provider,
                "recipe_name": f"{provider}_v1_to_v2",
                "steps": [
                    {"file": f"src/lib/{provider}-client.ts", "description": "Update API endpoints"},
                    {"file": f"src/types/{provider}.ts", "description": "Update type definitions"},
                    {"file": "src/app/api/checkout/route.ts", "description": "Update checkout logic"},
                    {"file": "tests/checkout.test.ts", "description": "Update test assertions"},
                ],
                "file_patches": 4 if status == "passed" else random.randint(2, 4),
                "is_deterministic": True,
            },
            confidence=confidence,
            risk_level="high" if confidence < 0.95 else "medium",
            is_deterministic=True,
            pr_url=f"https://github.com/{repo.github_repo}/pull/{random.randint(1, 50)}" if status == "pr_created" else None,
            created_at=created_at,
        )
        session.add(migration)
        
        # Add validation result if not pending
        if status != "pending":
            validation_status = "PASS" if status == "passed" or status == "pr_created" else "FAIL"
            validation = ValidationRun(
                id=generate_id("val_"),
                migration_id=migration.id,
                overall_status=validation_status,
                build_status="PASS" if validation_status == "PASS" else random.choice(["PASS", "FAIL"]),
                test_status="PASS" if validation_status == "PASS" else "FAIL",
                contract_status="PASS",
                logs={
                    "build": {
                        "stdout": "Build completed successfully" if validation_status == "PASS" else "Build failed with errors",
                        "exit_code": 0 if validation_status == "PASS" else 1,
                    },
                    "tests": {
                        "total": random.randint(10, 30),
                        "passed": random.randint(10, 30) if validation_status == "PASS" else random.randint(5, 15),
                        "failed": 0 if validation_status == "PASS" else random.randint(1, 5),
                    },
                },
                executed_at=created_at + datetime.timedelta(minutes=random.randint(1, 5)),
            )
            session.add(validation)
        
        if verbose:
            print(f"  ✓ Created migration {i+1}/20: {provider} for {repo.name} ({status})")


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for Self-Maintaining APIs")
    parser.add_argument("--populate", action="store_true", help="Populate database with demo data")
    parser.add_argument("--clear", action="store_true", help="Clear demo data")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()
    
    if not args.populate and not args.clear:
        parser.print_help()
        return
    
    # Get database URL
    try:
        db_url = get_db_url()
    except Exception as e:
        print(f"❌ Error getting database URL: {e}")
        print("Make sure DATABASE_URL or Neon credentials are set in .env")
        return
    
    # Create engine and session
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        if args.clear:
            print("🗑️  Clearing demo data...")
            # Delete in reverse order of dependencies
            session.query(ValidationRun).delete()
            session.query(MigrationRun).delete()
            session.query(APIUsageModel).delete()
            session.query(APIChangeModel).delete()
            session.query(APIVersion).delete()
            session.query(Provider).delete()
            session.query(Repository).delete()
            session.query(AutomationSettings).delete()
            session.query(Organization).delete()
            session.commit()
            print("✅ Demo data cleared successfully")
        
        if args.populate:
            print("🌱 Seeding demo data...")
            
            # Create organization
            if args.verbose:
                print("  Creating organization...")
            org = seed_organization(session)
            
            # Create providers
            if args.verbose:
                print("  Creating providers...")
            providers = seed_providers(session)
            
            # Create repositories
            if args.verbose:
                print("  Creating repositories...")
            repos = seed_repositories(session, org)
            
            # Commit so we have IDs
            session.commit()
            
            # Create usages
            if args.verbose:
                print("  Creating API usages...")
            seed_usages(session, repos)
            
            # Create migrations
            if args.verbose:
                print("  Creating migration history...")
            seed_migrations(session, repos, args.verbose)
            
            # Final commit
            session.commit()
            
            print(f"✅ Demo data seeded successfully!")
            print(f"   - 1 organization")
            print(f"   - 2 providers (FakePay, Stripe)")
            print(f"   - 4 repositories")
            print(f"   - 20 migrations (15 passed, 3 failed, 2 pending)")
            print(f"   - ~20-30 API usages")
            print(f"   - Breaking changes and validation results")
    
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        session.close()


if __name__ == "__main__":
    main()
