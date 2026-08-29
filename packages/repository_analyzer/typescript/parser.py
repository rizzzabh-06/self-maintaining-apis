"""TypeScript/JavaScript source analyzer for API endpoint and symbol usage discovery."""

from __future__ import annotations

import re
from pathlib import Path
from typing import List

from ..models import APIUsage, UsageType

# Regex for HTTP method calls on axios/fetch/http instances
# matches: .post("/payment", ...) or .get(`/payment/${id}`) or post<Type>("/payment"
HTTP_CALL_REGEX = re.compile(
    r"""(?:\b(?:this\.http|http|axios|client|api|request)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(\s*[`"']([^`"']+)|\b(?:get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(\s*[`"']([^`"']+))""",
    re.IGNORECASE,
)

# Regex for template literal path with interpolation: `/payment/${id}`
TEMPLATE_PATH_REGEX = re.compile(
    r"""(?:\.|\b)(get|post|put|patch|delete)\s*(?:<[^>]+>)?\s*\(\s*`([^`]+)`""",
    re.IGNORECASE,
)

# Known SDK or client method calls
CLIENT_METHOD_REGEX = re.compile(
    r"""\b(?:fakepay|stripe|client|api)\s*\.\s*([a-zA-Z0-9_]+)\s*\(""",
    re.IGNORECASE,
)

# Import declarations
IMPORT_REGEX = re.compile(
    r"""import\s+(?:type\s+)?(?:\{([^}]+)\}|([a-zA-Z0-9_]+))\s+from\s+["']([^"']+)["']"""
)

# Type or Interface definitions
TYPE_OR_INTERFACE_REGEX = re.compile(
    r"""(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)"""
)

# Function or method declarations to determine enclosing symbol
FUNCTION_DEF_REGEX = re.compile(
    r"""(?:async\s+)?(?:function\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^\{]+)?\s*\{)"""
)

CLASS_DEF_REGEX = re.compile(r"""(?:export\s+)?class\s+([a-zA-Z0-9_]+)""")


def normalize_endpoint_template(path: str) -> str:
    """Normalize template strings like `/payment/${id}` or `/payment/:id` to `/payment/{id}`."""
    # replace ${var} with {var}
    normalized = re.sub(r"\$\{([a-zA-Z0-9_]+)\}", r"{\1}", path)
    # replace :var with {var}
    normalized = re.sub(r":([a-zA-Z0-9_]+)", r"{\1}", normalized)
    return normalized


def _find_enclosing_symbol(lines: list[str], current_line_idx: int) -> str | None:
    """Find the name of the function or class enclosing the given line index."""
    for idx in range(current_line_idx - 1, -1, -1):
        line = lines[idx].strip()
        f_match = FUNCTION_DEF_REGEX.search(line)
        if f_match:
            return f_match.group(1) or f_match.group(2)
        c_match = CLASS_DEF_REGEX.search(line)
        if c_match:
            return c_match.group(1)
    return None


def scan_typescript_file(
    file_path: Path, repo_root: Path, default_provider: str = "fakepay"
) -> list[APIUsage]:
    """Scan a TypeScript/JavaScript file for endpoint usages, SDK calls, and imports."""
    usages: list[APIUsage] = []
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return usages

    rel_path = str(file_path.relative_to(repo_root))
    lines = content.splitlines()

    # Determine provider context for this file
    provider = default_provider
    if "stripe" in rel_path.lower() or "stripe" in content.lower():
        provider = "stripe"
    elif "fakepay" in rel_path.lower() or "fakepay" in content.lower():
        provider = "fakepay"

    for idx, line in enumerate(lines, start=1):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("//") or line_clean.startswith("/*"):
            continue

        enclosing_symbol = _find_enclosing_symbol(lines, idx - 1)

        # 1. Check HTTP endpoint calls with template literals: `.../payment/${id}...`
        for t_match in TEMPLATE_PATH_REGEX.finditer(line):
            method = t_match.group(1).upper()
            raw_path = t_match.group(2)
            norm_path = normalize_endpoint_template(raw_path)
            usages.append(
                APIUsage(
                    provider=provider,
                    usage_type=UsageType.ENDPOINT_CALL,
                    file_path=rel_path,
                    endpoint=norm_path,
                    method=method,
                    line_number=idx,
                    symbol=enclosing_symbol,
                    confidence=0.98,
                    snippet=line_clean,
                    raw_match=t_match.group(0),
                )
            )

        # 2. Check direct HTTP method calls: .post("/payment", ...)
        for h_match in HTTP_CALL_REGEX.finditer(line):
            method = (h_match.group(1) or "POST").upper()
            raw_path = h_match.group(2) or h_match.group(3)
            if raw_path and not raw_path.startswith("http"):
                norm_path = normalize_endpoint_template(raw_path)
                # Avoid duplicate if already matched by template regex
                if not any(
                    u.line_number == idx and u.endpoint == norm_path for u in usages
                ):
                    usages.append(
                        APIUsage(
                            provider=provider,
                            usage_type=UsageType.ENDPOINT_CALL,
                            file_path=rel_path,
                            endpoint=norm_path,
                            method=method,
                            line_number=idx,
                            symbol=enclosing_symbol,
                            confidence=0.98,
                            snippet=line_clean,
                            raw_match=h_match.group(0),
                        )
                    )

        # 3. Check client method calls: fakepay.createPayment(...)
        for cm_match in CLIENT_METHOD_REGEX.finditer(line):
            method_name = cm_match.group(1)
            # map known method names to endpoint heuristics if applicable
            endpoint_guess = None
            if "payment" in method_name.lower():
                endpoint_guess = "/payment"

            usages.append(
                APIUsage(
                    provider=provider,
                    usage_type=UsageType.CLIENT_METHOD_CALL,
                    file_path=rel_path,
                    endpoint=endpoint_guess,
                    line_number=idx,
                    symbol=method_name,
                    confidence=0.90,
                    snippet=line_clean,
                    raw_match=cm_match.group(0),
                )
            )

        # 4. Check imports
        for imp_match in IMPORT_REGEX.finditer(line):
            import_source = imp_match.group(3)
            imported_symbols = imp_match.group(1) or imp_match.group(2)
            if "fakepay" in import_source.lower() or (
                imported_symbols and "fakepay" in imported_symbols.lower()
            ):
                usages.append(
                    APIUsage(
                        provider=provider,
                        usage_type=UsageType.IMPORT,
                        file_path=rel_path,
                        line_number=idx,
                        symbol=imported_symbols.strip() if imported_symbols else import_source,
                        confidence=0.90,
                        snippet=line_clean,
                        raw_match=imp_match.group(0),
                    )
                )

        # 5. Check type / interface definitions relevant to provider schemas
        for type_match in TYPE_OR_INTERFACE_REGEX.finditer(line):
            type_name = type_match.group(1)
            if any(k in type_name.lower() for k in ("payment", "fakepay", "checkout")):
                usages.append(
                    APIUsage(
                        provider=provider,
                        usage_type=UsageType.TYPE_REFERENCE,
                        file_path=rel_path,
                        line_number=idx,
                        symbol=type_name,
                        confidence=0.85,
                        snippet=line_clean,
                        raw_match=type_match.group(0),
                    )
                )

    return usages
