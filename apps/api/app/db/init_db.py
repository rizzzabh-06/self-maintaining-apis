"""Database table initialization and schema migration for Neon Lakebase Postgres."""

from __future__ import annotations

from sqlalchemy import text
from apps.api.app.db.session import engine, Base
import apps.api.app.models.db_models  # noqa: F401


def init_db():
    """Create all tables and ensure schema columns exist."""
    Base.metadata.create_all(bind=engine)

    # Ensure added columns exist on existing tables in Neon
    with engine.begin() as conn:
        migrations = [
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS github_id INTEGER;",
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS is_monitored BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ready';",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR(128);",
            "ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;",
        ]
        for query in migrations:
            try:
                conn.execute(text(query))
            except Exception as e:
                print(f"Migration notice: {e}")

    print("Database tables initialized successfully on Neon Lakebase Postgres.")


if __name__ == "__main__":
    init_db()
