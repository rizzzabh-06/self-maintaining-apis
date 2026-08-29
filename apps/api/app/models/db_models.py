"""SQLAlchemy database models for Neon Lakebase Postgres."""

from __future__ import annotations

import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Float,
    Text,
    DateTime,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship

from apps.api.app.db.session import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repositories = relationship("Repository", back_populates="organization")


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String(64), primary_key=True)
    organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=True)
    name = Column(String(255), nullable=False)
    github_repo = Column(String(255), nullable=False)
    default_branch = Column(String(64), default="main")
    language = Column(String(32), default="TypeScript")
    last_scanned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="repositories")
    usages = relationship("APIUsageModel", back_populates="repository")
    migrations = relationship("MigrationRun", back_populates="repository")


class Provider(Base):
    __tablename__ = "providers"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False, unique=True)
    slug = Column(String(64), nullable=False, unique=True)
    webhook_secret = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    versions = relationship("APIVersion", back_populates="provider")


class APIVersion(Base):
    __tablename__ = "api_versions"

    id = Column(String(64), primary_key=True)
    provider_id = Column(String(64), ForeignKey("providers.id"), nullable=False)
    version = Column(String(64), nullable=False)
    spec_location = Column(String(255), nullable=True)
    retrieved_at = Column(DateTime, default=datetime.datetime.utcnow)

    provider = relationship("Provider", back_populates="versions")
    changes = relationship("APIChangeModel", back_populates="api_version")


class APIChangeModel(Base):
    __tablename__ = "api_changes"

    id = Column(String(64), primary_key=True)
    api_version_id = Column(String(64), ForeignKey("api_versions.id"), nullable=False)
    change_type = Column(String(64), nullable=False)
    breaking = Column(Boolean, default=True)
    endpoint = Column(String(255), nullable=True)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    severity = Column(String(32), default="critical")
    description = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    api_version = relationship("APIVersion", back_populates="changes")


class APIUsageModel(Base):
    __tablename__ = "api_usages"

    id = Column(String(64), primary_key=True)
    repository_id = Column(String(64), ForeignKey("repositories.id"), nullable=False)
    provider = Column(String(64), nullable=False)
    endpoint = Column(String(255), nullable=True)
    file_path = Column(String(255), nullable=False)
    line_number = Column(Integer, nullable=True)
    symbol = Column(String(128), nullable=True)
    usage_type = Column(String(64), nullable=False)
    confidence = Column(Float, default=1.0)
    snippet = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repository = relationship("Repository", back_populates="usages")


class MigrationRun(Base):
    __tablename__ = "migration_runs"

    id = Column(String(64), primary_key=True)
    repository_id = Column(String(64), ForeignKey("repositories.id"), nullable=False)
    provider = Column(String(64), nullable=False)
    status = Column(String(32), default="pending")  # pending, validating, passed, failed, pr_created
    plan = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.95)
    risk_level = Column(String(32), default="high")
    is_deterministic = Column(Boolean, default=True)
    pr_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repository = relationship("Repository", back_populates="migrations")
    validation = relationship("ValidationRun", back_populates="migration", uselist=False)


class ValidationRun(Base):
    __tablename__ = "validation_runs"

    id = Column(String(64), primary_key=True)
    migration_id = Column(String(64), ForeignKey("migration_runs.id"), nullable=False)
    overall_status = Column(String(32), nullable=False)  # PASS, FAIL, ERROR
    build_status = Column(String(32), nullable=False)
    test_status = Column(String(32), nullable=False)
    contract_status = Column(String(32), nullable=False)
    logs = Column(JSON, nullable=True)
    executed_at = Column(DateTime, default=datetime.datetime.utcnow)

    migration = relationship("MigrationRun", back_populates="validation")
