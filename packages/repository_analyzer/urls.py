"""URL and configuration detection for API providers."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List

from .models import APIUsage, UsageType

# Provider known domain patterns
KNOWN_PROVIDER_DOMAINS: Dict[str, str] = {
    r"api\.fakepay\.dev": "fakepay",
    r"fakepay\.dev": "fakepay",
    r"api\.stripe\.com": "stripe",
    r"api\.twilio\.com": "twilio",
    r"api\.openai\.com": "openai",
    r"api\.sendgrid\.com": "sendgrid",
}

URL_REGEX = re.compile(r"https?://[^\s\"'`)]+", re.IGNORECASE)


def scan_urls_in_file(file_path: Path, repo_root: Path) -> list[APIUsage]:
    """Scan a single file for known provider API URLs."""
    usages: list[APIUsage] = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return usages

    rel_path = str(file_path.relative_to(repo_root))
    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        for match in URL_REGEX.finditer(line):
            url = match.group(0)
            for pattern, provider in KNOWN_PROVIDER_DOMAINS.items():
                if re.search(pattern, url, re.IGNORECASE):
                    usages.append(
                        APIUsage(
                            provider=provider,
                            usage_type=UsageType.BASE_URL_CONFIG,
                            file_path=rel_path,
                            line_number=idx,
                            symbol=url,
                            confidence=0.98,
                            snippet=line.strip(),
                            raw_match=url,
                        )
                    )
                    break

    return usages
