"""Database table initialization for Neon Lakebase Postgres."""

from __future__ import annotations

from apps.api.app.db.session import engine, Base
import apps.api.app.models.db_models  # noqa: F401


def init_db():
    """Create all tables in the connected database."""
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully on Neon Lakebase Postgres.")


if __name__ == "__main__":
    init_db()
