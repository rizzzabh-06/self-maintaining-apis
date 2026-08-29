"""High-level repository scanner orchestrating package, URL, config, and AST/source analysis."""

from __future__ import annotations

import os
from pathlib import Path

from .models import ScanResult, APIUsage
from .dependencies import scan_package_json
from .urls import scan_urls_in_file
from .typescript.parser import scan_typescript_file

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".pytest_cache",
    "__pycache__",
}

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs"}
CONFIG_EXTENSIONS = {".json", ".yaml", ".yml", ".env", ".env.example", ".ts", ".js"}


def scan_repository(repo_path: str | Path) -> ScanResult:
    """Scan a repository and build a structured API inventory."""
    root = Path(repo_path).resolve()
    if not root.is_dir():
        raise ValueError(f"Repository directory does not exist: {root}")

    # 1. Scan package.json for SDKs and HTTP client dependencies
    dependencies, dep_usages = scan_package_json(root)

    all_usages: list[APIUsage] = list(dep_usages)
    discovered_providers: set[str] = {
        d.provider for d in dependencies if d.provider is not None
    }

    # 2. Walk directory files
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for fname in filenames:
            file_path = Path(dirpath) / fname
            rel_path = file_path.relative_to(root)
            ext = file_path.suffix.lower()

            # Skip package.json (already handled)
            if fname == "package.json":
                continue

            # A. URL & Base URL Config detection
            if ext in CONFIG_EXTENSIONS or ext in SOURCE_EXTENSIONS:
                url_usages = scan_urls_in_file(file_path, root)
                for u in url_usages:
                    discovered_providers.add(u.provider)
                all_usages.extend(url_usages)

            # B. TypeScript / JavaScript AST & Source Analysis
            if ext in SOURCE_EXTENSIONS:
                ts_usages = scan_typescript_file(file_path, root)
                for u in ts_usages:
                    discovered_providers.add(u.provider)
                all_usages.extend(ts_usages)

    # Filter out generic_http if specific providers are discovered
    real_providers = [p for p in sorted(discovered_providers) if p != "generic_http"]
    if not real_providers and "generic_http" in discovered_providers:
        real_providers = ["generic_http"]

    return ScanResult(
        repository_path=str(root),
        providers=real_providers,
        dependencies=dependencies,
        usages=all_usages,
    )
