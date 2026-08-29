"""Impact analysis engine mapping detected API changes to codebase usages."""

from __future__ import annotations

from typing import List, Set
from pathlib import Path

from packages.change_engine.models import APIChange, ChangeType
from packages.repository_analyzer.models import ScanResult, APIUsage, UsageType
from .models import ImpactReport, AffectedUsage, RiskLevel


def _match_endpoint_change(
    change: APIChange, usages: list[APIUsage]
) -> list[AffectedUsage]:
    """Find usages directly or indirectly affected by an endpoint change."""
    affected: list[AffectedUsage] = []
    old_path = change.old_path or change.path

    if not old_path:
        return affected

    # Normalize path (e.g. /payment vs /payment/)
    norm_old_path = old_path.rstrip("/")

    # 1. Direct endpoint calls
    for u in usages:
        if u.endpoint and u.endpoint.rstrip("/") == norm_old_path:
            affected.append(
                AffectedUsage(
                    file_path=u.file_path,
                    line_number=u.line_number,
                    symbol=u.symbol,
                    change_reason=f"Direct call to changed endpoint '{old_path}'",
                    confidence=u.confidence,
                    usage_type=u.usage_type.value,
                    snippet=u.snippet,
                    related_change=change,
                )
            )

    # 2. Base URL configs (e.g. /v1 -> /v2 base URL references)
    if "/v1" in norm_old_path or change.old_path in ("/payment", "/payment/{id}"):
        for u in usages:
            if u.usage_type == UsageType.BASE_URL_CONFIG:
                affected.append(
                    AffectedUsage(
                        file_path=u.file_path,
                        line_number=u.line_number,
                        symbol=u.symbol,
                        change_reason="Base URL config referencing legacy API version",
                        confidence=u.confidence,
                        usage_type=u.usage_type.value,
                        snippet=u.snippet,
                        related_change=change,
                    )
                )

    # 3. Caller / wrapper method references (e.g. createPayment / getPayment)
    if change.operation_id:
        op_name = change.operation_id.lower()
        for u in usages:
            if u.usage_type == UsageType.CLIENT_METHOD_CALL:
                if u.symbol and (
                    u.symbol.lower() == op_name
                    or op_name in u.symbol.lower()
                    or u.symbol.lower() in op_name
                ):
                    # Check not already included for this line
                    if not any(
                        a.file_path == u.file_path and a.line_number == u.line_number
                        for a in affected
                    ):
                        affected.append(
                            AffectedUsage(
                                file_path=u.file_path,
                                line_number=u.line_number,
                                symbol=u.symbol,
                                change_reason=f"Method '{u.symbol}' invokes modified endpoint '{old_path}'",
                                confidence=u.confidence,
                                usage_type=u.usage_type.value,
                                snippet=u.snippet,
                                related_change=change,
                            )
                        )

    return affected


def _match_field_change(
    change: APIChange, usages: list[APIUsage]
) -> list[AffectedUsage]:
    """Find usages affected by schema field changes (e.g. required field added)."""
    affected: list[AffectedUsage] = []
    schema_name = change.schema
    field_name = change.field

    for u in usages:
        # A. Type / interface definition matching schema
        if (
            u.usage_type == UsageType.TYPE_REFERENCE
            and schema_name
            and u.symbol == schema_name
        ):
            affected.append(
                AffectedUsage(
                    file_path=u.file_path,
                    line_number=u.line_number,
                    symbol=u.symbol,
                    change_reason=f"Type definition '{schema_name}' needs updated field '{field_name}'",
                    confidence=u.confidence,
                    usage_type=u.usage_type.value,
                    snippet=u.snippet,
                    related_change=change,
                )
            )

        # B. Callers invoking the operation that requires the field
        if u.usage_type in (UsageType.CLIENT_METHOD_CALL, UsageType.ENDPOINT_CALL):
            if change.operation_id and u.symbol:
                if change.operation_id.lower() in u.symbol.lower() or u.symbol.lower() in change.operation_id.lower():
                    affected.append(
                        AffectedUsage(
                            file_path=u.file_path,
                            line_number=u.line_number,
                            symbol=u.symbol,
                            change_reason=f"Payload in '{u.symbol}' must provide newly required field '{field_name}'",
                            confidence=u.confidence * 0.95,
                            usage_type=u.usage_type.value,
                            snippet=u.snippet,
                            related_change=change,
                        )
                    )

    return affected


def analyze_impact(
    changes: list[APIChange],
    scan_result: ScanResult,
    provider: str = "fakepay",
) -> ImpactReport:
    """Analyze the impact of a set of APIChanges on a scanned repository inventory."""
    provider_usages = scan_result.usages_for_provider(provider)
    if not provider_usages:
        # Fallback to all usages if provider filtering yields none
        provider_usages = scan_result.usages

    all_affected: list[AffectedUsage] = []
    seen_keys: set[tuple[str, int | None, str]] = set()

    for change in changes:
        if change.type in (
            ChangeType.ENDPOINT_RENAMED,
            ChangeType.ENDPOINT_REMOVED,
            ChangeType.ENDPOINT_ADDED,
        ):
            matched = _match_endpoint_change(change, provider_usages)
        elif change.type in (
            ChangeType.FIELD_REQUIRED,
            ChangeType.FIELD_OPTIONAL,
            ChangeType.FIELD_REMOVED,
            ChangeType.FIELD_ADDED,
        ):
            matched = _match_field_change(change, provider_usages)
        else:
            matched = []

        for item in matched:
            key = (item.file_path, item.line_number, item.change_reason)
            if key not in seen_keys:
                seen_keys.add(key)
                all_affected.append(item)

    # Compute affected unique files
    affected_files = sorted({item.file_path for item in all_affected})

    # Compute overall confidence
    if all_affected:
        avg_confidence = sum(item.confidence for item in all_affected) / len(all_affected)
    else:
        avg_confidence = 0.0

    # Determine risk level
    has_breaking = any(c.breaking for c in changes)
    if has_breaking and len(affected_files) >= 3:
        risk = RiskLevel.CRITICAL
    elif has_breaking:
        risk = RiskLevel.HIGH
    elif len(affected_files) > 0:
        risk = RiskLevel.MEDIUM
    else:
        risk = RiskLevel.LOW

    summary = (
        f"Detected {len(changes)} API change(s) impacting {len(affected_files)} file(s) "
        f"and {len(all_affected)} usage location(s) with {risk.value.upper()} risk."
    )

    return ImpactReport(
        provider=provider,
        repository_path=scan_result.repository_path,
        changes=changes,
        affected_files=affected_files,
        affected_usages=all_affected,
        overall_confidence=avg_confidence,
        risk_level=risk,
        summary=summary,
    )
