"""Data models for repository scanning and API inventory."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class UsageType(str, Enum):
    SDK_DEPENDENCY = "sdk_dependency"
    HTTP_CLIENT_DEPENDENCY = "http_client_dependency"
    BASE_URL_CONFIG = "base_url_config"
    ENDPOINT_CALL = "endpoint_call"
    TYPE_REFERENCE = "type_reference"
    CLIENT_METHOD_CALL = "client_method_call"
    IMPORT = "import"


@dataclass
class APIUsage:
    """A detected instance of an API or provider usage in the repository."""

    provider: str
    usage_type: UsageType
    file_path: str
    endpoint: str | None = None
    method: str | None = None
    line_number: int | None = None
    symbol: str | None = None
    confidence: float = 1.0
    snippet: str | None = None
    raw_match: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["usage_type"] = self.usage_type.value
        return {k: v for k, v in data.items() if v is not None}


@dataclass
class DiscoveredDependency:
    """A detected package dependency."""

    name: str
    version_spec: str
    provider: str | None
    is_dev: bool = False
    file_path: str = "package.json"


@dataclass
class ScanResult:
    """Result of a complete repository scan."""

    repository_path: str
    providers: list[str] = field(default_factory=list)
    dependencies: list[DiscoveredDependency] = field(default_factory=list)
    usages: list[APIUsage] = field(default_factory=list)

    def usages_for_provider(self, provider: str) -> list[APIUsage]:
        return [u for u in self.usages if u.provider.lower() == provider.lower()]

    def usages_for_endpoint(self, endpoint: str) -> list[APIUsage]:
        return [
            u for u in self.usages
            if u.endpoint and u.endpoint.rstrip("/") == endpoint.rstrip("/")
        ]

    def to_dict(self) -> dict[str, Any]:
        return {
            "repository_path": self.repository_path,
            "providers": self.providers,
            "dependencies": [asdict(d) for d in self.dependencies],
            "usages": [u.to_dict() for u in self.usages],
        }
