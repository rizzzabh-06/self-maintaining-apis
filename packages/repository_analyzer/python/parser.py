"""Python source analyzer for FastAPI/Flask route and HTTP client usages."""

from __future__ import annotations

import re
from pathlib import Path
from typing import List

from ..models import APIUsage, UsageType

# Regex for FastAPI/Flask decorators: @router.get("/users") or @app.post("/items")
PY_ROUTE_REGEX = re.compile(
    r"""@(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']""",
    re.IGNORECASE,
)

# Regex for requests / httpx client calls: requests.get("https://...", httpx.post(...)
PY_HTTP_CLIENT_REGEX = re.compile(
    r"""\b(?:requests|httpx|client|session)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']""",
    re.IGNORECASE,
)


def scan_python_file(
    file_path: Path, repo_root: Path, default_provider: str = "api"
) -> list[APIUsage]:
    """Scan a Python file for routes and outbound HTTP calls."""
    usages: list[APIUsage] = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return usages

    rel_path = str(file_path.relative_to(repo_root))
    lines = content.splitlines()

    provider = default_provider
    if "stripe" in rel_path.lower() or "stripe" in content.lower():
        provider = "stripe"
    elif "fakepay" in rel_path.lower() or "fakepay" in content.lower():
        provider = "fakepay"
    elif "supabase" in rel_path.lower() or "supabase" in content.lower():
        provider = "supabase"

    for idx, line in enumerate(lines, start=1):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("#"):
            continue

        # 1. FastAPI / Flask route definition
        for m in PY_ROUTE_REGEX.finditer(line):
            method = m.group(1).upper()
            raw_path = m.group(2)
            usages.append(
                APIUsage(
                    provider=provider,
                    usage_type=UsageType.ENDPOINT_CALL,
                    file_path=rel_path,
                    endpoint=raw_path,
                    method=method,
                    line_number=idx,
                    confidence=0.95,
                    snippet=line_clean,
                    raw_match=m.group(0),
                )
            )

        # 2. Outbound HTTP client call
        for m in PY_HTTP_CLIENT_REGEX.finditer(line):
            method = m.group(1).upper()
            raw_path = m.group(2)
            usages.append(
                APIUsage(
                    provider=provider,
                    usage_type=UsageType.ENDPOINT_CALL,
                    file_path=rel_path,
                    endpoint=raw_path,
                    method=method,
                    line_number=idx,
                    confidence=0.90,
                    snippet=line_clean,
                    raw_match=m.group(0),
                )
            )

    return usages

