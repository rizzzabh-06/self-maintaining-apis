"""Dependency detection for Node/TypeScript package manifests and Python requirements."""

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
    "supabase": "supabase",
    "@supabase/supabase-js": "supabase",
    "@tanstack/react-query": "react_query",
    "cytoscape": "cytoscape",
    "recharts": "recharts",
    "fastapi": "fastapi",
    "networkx": "networkx",
    "scikit-learn": "scikit_learn",
}

KNOWN_HTTP_CLIENTS = {
    "axios",
    "got",
    "node-fetch",
    "superagent",
    "ky",
    "request",
    "httpx",
    "requests",
    "aiohttp",
    "urllib3",
}

IGNORE_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".pytest_cache", "__pycache__"}


def scan_package_json(
    repo_path: Path,
) -> tuple[list[DiscoveredDependency], list[APIUsage]]:
    """Scan root and subdirectories for package manifests and Python requirements."""
    dependencies: list[DiscoveredDependency] = []
    usages: list[APIUsage] = []

    # 1. Find all package.json files
    pkg_files: list[Path] = []
    root_pkg = repo_path / "package.json"
    if root_pkg.is_file():
        pkg_files.append(root_pkg)
    for p in repo_path.glob("*/package.json"):
        if not any(ig in p.parts for ig in IGNORE_DIRS):
            pkg_files.append(p)

    for pkg_file in pkg_files:
        try:
            data = json.loads(pkg_file.read_text(encoding="utf-8"))
            rel_path = str(pkg_file.relative_to(repo_path))
        except Exception:
            continue

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
                        file_path=rel_path,
                    )
                )

                if provider:
                    usages.append(
                        APIUsage(
                            provider=provider,
                            usage_type=UsageType.SDK_DEPENDENCY,
                            file_path=rel_path,
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
                            file_path=rel_path,
                            symbol=name,
                            confidence=0.8,
                            snippet=f'"{name}": "{ver}"',
                            raw_match=name,
                        )
                    )

    # 2. Check requirements.txt files
    req_files: list[Path] = []
    root_req = repo_path / "requirements.txt"
    if root_req.is_file():
        req_files.append(root_req)
    for p in repo_path.glob("*/requirements.txt"):
        if not any(ig in p.parts for ig in IGNORE_DIRS):
            req_files.append(p)

    for req_file in req_files:
        try:
            content = req_file.read_text(encoding="utf-8")
            rel_path = str(req_file.relative_to(repo_path))
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                # Split package and version (e.g. fastapi==0.109.2 or supabase>=2.31.0)
                import re
                parts = re.split(r"[><=~]+", line, maxsplit=1)
                pkg_name = parts[0].strip().lower()
                ver_spec = parts[1].strip() if len(parts) > 1 else "*"
                provider = KNOWN_PROVIDER_PACKAGES.get(pkg_name)
                dependencies.append(
                    DiscoveredDependency(
                        name=pkg_name,
                        version_spec=ver_spec,
                        provider=provider,
                        is_dev=False,
                        file_path=rel_path,
                    )
                )
                if provider:
                    usages.append(
                        APIUsage(
                            provider=provider,
                            usage_type=UsageType.SDK_DEPENDENCY,
                            file_path=rel_path,
                            symbol=pkg_name,
                            confidence=0.95,
                            snippet=line,
                            raw_match=pkg_name,
                        )
                    )
                elif pkg_name in KNOWN_HTTP_CLIENTS:
                    usages.append(
                        APIUsage(
                            provider="generic_http",
                            usage_type=UsageType.HTTP_CLIENT_DEPENDENCY,
                            file_path=rel_path,
                            symbol=pkg_name,
                            confidence=0.8,
                            snippet=line,
                            raw_match=pkg_name,
                        )
                    )
        except Exception:
            continue

    return dependencies, usages
