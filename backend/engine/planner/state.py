"""
PlannerState — shared object store for a single plan execution.

Skills reference objects by string keys. The planner LLM never sees
raw binary data — only the describe() metadata preview.
"""
from __future__ import annotations

from typing import Any, Optional


class PlannerState:
    def __init__(
        self,
        user_request: str = "",
        uploaded_file: Optional[bytes] = None,
        uploaded_file_meta: Optional[dict] = None,
    ) -> None:
        self._store: dict[str, Any] = {}

        if user_request:
            self._store["user_request"] = user_request
        if uploaded_file is not None:
            self._store["uploaded_file"] = uploaded_file
        if uploaded_file_meta is not None:
            self._store["uploaded_file_meta"] = uploaded_file_meta

    # ── Core access ──────────────────────────────────────────────────────────

    def set(self, key: str, value: Any) -> None:
        self._store[key] = value

    def get(self, key: str) -> Any:
        if key not in self._store:
            raise KeyError(f"PlannerState has no key '{key}'. Available: {self.list_keys()}")
        return self._store[key]

    def has(self, key: str) -> bool:
        return key in self._store

    def list_keys(self) -> list[str]:
        return list(self._store.keys())

    # ── LLM-safe preview ─────────────────────────────────────────────────────

    def describe(self) -> dict[str, dict]:
        """
        Return a safe metadata preview of every key.
        Never exposes raw bytes or large objects — only type, size, and a
        short repr. This dict is what the planner LLM receives.
        """
        preview: dict[str, dict] = {}
        for key, value in self._store.items():
            preview[key] = _describe_value(value)
        return preview


# ── Helper ───────────────────────────────────────────────────────────────────

def _describe_value(value: Any) -> dict:
    type_name = type(value).__name__

    if isinstance(value, bytes):
        return {"type": "bytes", "size_bytes": len(value)}

    if isinstance(value, str):
        return {
            "type": "str",
            "length": len(value),
            "preview": value[:120] + ("…" if len(value) > 120 else ""),
        }

    if isinstance(value, dict):
        return {
            "type": "dict",
            "keys": list(value.keys())[:20],
        }

    if isinstance(value, list):
        return {
            "type": "list",
            "length": len(value),
            "item_type": type(value[0]).__name__ if value else "unknown",
        }

    # Fallback: safe repr truncated to 200 chars
    raw = repr(value)
    return {
        "type": type_name,
        "repr": raw[:200] + ("…" if len(raw) > 200 else ""),
    }
