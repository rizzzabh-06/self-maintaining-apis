"""Configuration loader that syncs .env into os.environ."""

from __future__ import annotations

import os
from pathlib import Path


def load_env(override: bool = True) -> dict[str, str]:
    """Parse project root .env and inject variables into os.environ.

    If override=True, values from the .env file take precedence over existing
    empty or stale os.environ values.
    """
    loaded: dict[str, str] = {}
    # Find .env at project root (4 levels up from this file)
    current = Path(__file__).resolve().parent
    for _ in range(5):
        candidate = current / ".env"
        if candidate.is_file():
            try:
                for line in candidate.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if override or key not in os.environ:
                        os.environ[key] = val
                    loaded[key] = val
            except Exception:
                pass
            break
        current = current.parent
    return loaded


# Automatically load on import
load_env(override=False)

