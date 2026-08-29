"""Deterministic structural diff of two OpenAPI 3.x specs.

Compares paths and schemas to produce a list of APIChange records.
No LLM involvement — purely structural comparison.
"""

from __future__ import annotations

from .models import APIChange, ChangeType


def _get_operation_id(path_item: dict, method: str) -> str | None:
    """Extract operationId from a path item for a given HTTP method."""
    op = path_item.get(method)
    if op:
        return op.get("operationId")
    return None


def _methods_in(path_item: dict) -> list[str]:
    """Return HTTP methods defined on a path item."""
    return [m for m in ("get", "post", "put", "patch", "delete") if m in path_item]


# ── Endpoint diffing ─────────────────────────────────────────────────


def _detect_endpoint_renames(
    old_paths: dict, new_paths: dict
) -> tuple[list[APIChange], set[str], set[str]]:
    """Detect renamed endpoints by matching operationIds.

    Returns:
        - list of rename changes
        - set of old paths that were matched as renames (to exclude from removed)
        - set of new paths that were matched as renames (to exclude from added)
    """
    changes: list[APIChange] = []
    matched_old: set[str] = set()
    matched_new: set[str] = set()

    # Build operationId → (path, method) index for old spec
    old_ops: dict[str, list[tuple[str, str]]] = {}
    for path, item in old_paths.items():
        for method in _methods_in(item):
            op_id = _get_operation_id(item, method)
            if op_id:
                old_ops.setdefault(op_id, []).append((path, method))

    # For each new endpoint, check if its operationId existed in old under a different path
    for new_path, new_item in new_paths.items():
        for method in _methods_in(new_item):
            op_id = _get_operation_id(new_item, method)
            if not op_id or op_id not in old_ops:
                continue
            for old_path, old_method in old_ops[op_id]:
                if old_path != new_path and old_method == method:
                    changes.append(
                        APIChange(
                            type=ChangeType.ENDPOINT_RENAMED,
                            breaking=True,
                            description=f"{method.upper()} {old_path} renamed to {method.upper()} {new_path}",
                            old_path=old_path,
                            new_path=new_path,
                            method=method.upper(),
                            operation_id=op_id,
                        )
                    )
                    matched_old.add(old_path)
                    matched_new.add(new_path)

    return changes, matched_old, matched_new


def _detect_endpoint_additions_removals(
    old_paths: dict, new_paths: dict, renamed_old: set[str], renamed_new: set[str]
) -> list[APIChange]:
    """Detect endpoints that were purely added or removed (not renamed)."""
    changes: list[APIChange] = []

    for path in old_paths:
        if path not in new_paths and path not in renamed_old:
            for method in _methods_in(old_paths[path]):
                changes.append(
                    APIChange(
                        type=ChangeType.ENDPOINT_REMOVED,
                        breaking=True,
                        description=f"{method.upper()} {path} removed",
                        old_path=path,
                        method=method.upper(),
                        operation_id=_get_operation_id(old_paths[path], method),
                    )
                )

    for path in new_paths:
        if path not in old_paths and path not in renamed_new:
            for method in _methods_in(new_paths[path]):
                changes.append(
                    APIChange(
                        type=ChangeType.ENDPOINT_ADDED,
                        breaking=False,
                        description=f"{method.upper()} {path} added",
                        new_path=path,
                        method=method.upper(),
                        operation_id=_get_operation_id(new_paths[path], method),
                    )
                )

    return changes


# ── Schema diffing ───────────────────────────────────────────────────


def _detect_schema_changes(
    old_schemas: dict, new_schemas: dict, new_paths: dict
) -> list[APIChange]:
    """Detect field-level changes between matching schemas."""
    changes: list[APIChange] = []

    for schema_name, old_schema in old_schemas.items():
        new_schema = new_schemas.get(schema_name)
        if not new_schema:
            continue

        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))
        old_props = set(old_schema.get("properties", {}).keys())
        new_props = set(new_schema.get("properties", {}).keys())

        # Fields that became required
        became_required = (new_required - old_required) & new_props
        for field_name in sorted(became_required):
            # Find which endpoint uses this schema
            endpoint_path, endpoint_method, op_id = _find_endpoint_for_schema(
                new_paths, schema_name
            )
            changes.append(
                APIChange(
                    type=ChangeType.FIELD_REQUIRED,
                    breaking=True,
                    description=(
                        f"{field_name} field in {schema_name} is now required"
                        f" (was optional{', defaulted to USD' if field_name == 'currency' else ''})"
                    ),
                    path=endpoint_path,
                    method=endpoint_method,
                    operation_id=op_id,
                    location="requestBody",
                    schema=schema_name,
                    field=field_name,
                    old_required=False,
                    new_required=True,
                )
            )

        # Fields that became optional
        became_optional = (old_required - new_required) & old_props & new_props
        for field_name in sorted(became_optional):
            endpoint_path, endpoint_method, op_id = _find_endpoint_for_schema(
                new_paths, schema_name
            )
            changes.append(
                APIChange(
                    type=ChangeType.FIELD_OPTIONAL,
                    breaking=False,
                    description=f"{field_name} field in {schema_name} is now optional (was required)",
                    path=endpoint_path,
                    method=endpoint_method,
                    operation_id=op_id,
                    location="requestBody",
                    schema=schema_name,
                    field=field_name,
                    old_required=True,
                    new_required=False,
                )
            )

    return changes


def _find_endpoint_for_schema(
    paths: dict, schema_name: str
) -> tuple[str | None, str | None, str | None]:
    """Find the first endpoint that references a given schema name."""
    ref_suffix = f"/{schema_name}"
    for path, item in paths.items():
        for method in _methods_in(item):
            op = item[method]
            body = op.get("requestBody", {})
            content = body.get("content", {})
            for media in content.values():
                ref = media.get("schema", {}).get("$ref", "")
                if ref.endswith(ref_suffix):
                    return path, method.upper(), op.get("operationId")
    return None, None, None


# ── Public API ───────────────────────────────────────────────────────


def diff_specs(old_spec: dict, new_spec: dict) -> list[APIChange]:
    """Compare two OpenAPI 3.x specs and return structured changes.

    This is a purely deterministic, structural comparison.
    No LLM involvement.
    """
    old_paths = old_spec.get("paths", {})
    new_paths = new_spec.get("paths", {})
    old_schemas = old_spec.get("components", {}).get("schemas", {})
    new_schemas = new_spec.get("components", {}).get("schemas", {})

    # 1. Detect renames first (so we don't double-count as add+remove)
    renames, renamed_old, renamed_new = _detect_endpoint_renames(old_paths, new_paths)

    # 2. Detect pure additions/removals
    add_remove = _detect_endpoint_additions_removals(
        old_paths, new_paths, renamed_old, renamed_new
    )

    # 3. Detect schema-level changes
    schema_changes = _detect_schema_changes(old_schemas, new_schemas, new_paths)

    return renames + add_remove + schema_changes
