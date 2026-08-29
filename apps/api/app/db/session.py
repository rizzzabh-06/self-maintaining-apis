"""Neon Lakebase Postgres database session management and engine configuration."""

from __future__ import annotations

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Neon Connection Strings:
# - DATABASE_URL: Pooled connection string (-pooler suffix) for application runtime queries
# - DATABASE_URL_UNPOOLED: Direct connection string for DDL / migrations / session-level tasks
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_URL_UNPOOLED = os.getenv("DATABASE_URL_UNPOOLED") or DATABASE_URL

# Fallback to local SQLite for offline tests if DATABASE_URL is not yet supplied
if not DATABASE_URL:
    db_file = Path(__file__).parents[4] / "self_maintaining_apis.db"
    DATABASE_URL = f"sqlite:///{db_file}"
    DATABASE_URL_UNPOOLED = DATABASE_URL

# SQLAlchemy PostgreSQL connection string conversion if needed (postgresql:// -> postgresql+psycopg://)
connect_url = DATABASE_URL
if connect_url.startswith("postgres://"):
    connect_url = connect_url.replace("postgres://", "postgresql+psycopg://", 1)
elif connect_url.startswith("postgresql://") and not connect_url.startswith("postgresql+"):
    connect_url = connect_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine_kwargs = {}
if "sqlite" not in connect_url:
    engine_kwargs = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

engine = create_engine(connect_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
