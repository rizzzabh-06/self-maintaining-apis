"""Dependency detection for Node/TypeScript package manifests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from .models import DiscoveredDependency, APIUsage, UsageType

# Mapping known package prefixes/names to provider identifiers
KNOWN_PROVIDER_PACKAGES: Dict[str, str] = {
    "fakepay-sdk": "fakepay",
    "@fakepay/sdk": "fakepay",
    "stripe": "stripe",
    "@stripe/stripe-js": "stripe",
    "twilio": "twilio",
    "@twilio/voice-sdk": "twilio",
    "@aws-sdk/client-s3": "aws",
    "openai": "openai",
    "@sendgrid/mail": "sendgrid",
}

KNOWN_HTTP_CLIENTS = {
    "axios",
    "got",
    "node-fetch",
    "superagent",
    "ky",
    "request",
}


def scan_package_json(
    repo_path: Path,
) -> tuple[list[DiscoveredDependency], list[APIUsage]]:
    """Scan package.json for known API provider SDKs and HTTP clients."""
    pkg_file = repo_path / "package.json"
    if not pkg_file.is_file():
        return [], []

    try:
        data = json.loads(pkg_file.read_text(encoding="utf-8"))
    except Exception:
        return [], []

    dependencies: list[DiscoveredDependency] = []
    usages: list[APIUsage] = []

    deps_map = {
        False: data.get("dependencies", {}),
        True: data.get("devDependencies", {}),
    }

    for is_dev, deps in deps_map.items():
        if not isinstance(deps, dict):
            continue
        for name, ver in deps.items():
            provider = KNOWN_PROVIDER_PACKAGES.get(name)
            dependencies.append(
                DiscoveredDependency(
                    name=name,
                    version_spec=str(ver),
                    provider=provider,
                    is_dev=is_dev,
                    file_path="package.json",
                )
            )

            if provider:
                usages.append(
                    APIUsage(
                        provider=provider,
                        usage_type=UsageType.SDK_DEPENDENCY,
                        file_path="package.json",
                        symbol=name,
                        confidence=0.95,
                        snippet=f'"{name}": "{ver}"',
                        raw_match=name,
                    )
                )
            elif name in KNOWN_HTTP_CLIENTS:
                usages.append(
                    APIUsage(
                        provider="generic_http",
                        usage_type=UsageType.HTTP_CLIENT_DEPENDENCY,
                        file_path="package.json",
                        symbol=name,
                        confidence=0.8,
                        snippet=f'"{name}": "{ver}"',
                        raw_match=name,
                    )
                )

    return dependencies, usages
