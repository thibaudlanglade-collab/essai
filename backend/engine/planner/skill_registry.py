"""
Skill registry for the tool-calling planner.

Discovers all skills under backend/skills/core/ that export a TOOL_SCHEMA
dict. Legacy skills (without TOOL_SCHEMA) are silently skipped.

Usage:
    from engine.planner.skill_registry import discover_skills, get_all_schemas, get_skill_module

    discover_skills()                    # call once at startup
    schemas = get_all_schemas()          # send to planner LLM
    module  = get_skill_module("name")   # execute the skill
"""
from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path
from types import ModuleType

# ── Module-level cache ────────────────────────────────────────────────────────

_registry: dict[str, dict] = {}          # name -> TOOL_SCHEMA
_modules:  dict[str, ModuleType] = {}    # name -> module
_discovered: bool = False

# Path to the core skills package, relative to this file's location.
# Resolves to: backend/skills/core/
_CORE_SKILLS_PATH = Path(__file__).parent.parent.parent / "skills" / "core"
_CORE_SKILLS_PACKAGE = "skills.core"


# ── Public API ────────────────────────────────────────────────────────────────

def discover_skills(force_reload: bool = False) -> None:
    """
    Scan backend/skills/core/ and register every module that exports
    a TOOL_SCHEMA dict. Idempotent unless force_reload=True.
    """
    global _discovered

    if _discovered and not force_reload:
        return

    _registry.clear()
    _modules.clear()

    if not _CORE_SKILLS_PATH.exists():
        # Folder doesn't exist yet — registry stays empty, no error.
        _discovered = True
        return

    for finder, module_name, _ in pkgutil.iter_modules([str(_CORE_SKILLS_PATH)]):
        if module_name.startswith("_"):
            continue

        full_name = f"{_CORE_SKILLS_PACKAGE}.{module_name}"
        try:
            mod = importlib.import_module(full_name)
        except Exception as exc:
            # Bad import should not crash the whole registry — log and skip.
            import warnings
            warnings.warn(f"skill_registry: could not import '{full_name}': {exc}", stacklevel=1)
            continue

        schema = getattr(mod, "TOOL_SCHEMA", None)
        if schema is None:
            # Legacy skill or non-skill module — silently skip.
            continue

        if not isinstance(schema, dict) or "name" not in schema:
            import warnings
            warnings.warn(
                f"skill_registry: '{full_name}' has an invalid TOOL_SCHEMA (missing 'name'). Skipped.",
                stacklevel=1,
            )
            continue

        skill_name = schema["name"]
        _registry[skill_name] = schema
        _modules[skill_name] = mod

    _discovered = True


def get_all_schemas() -> list[dict]:
    """Return all registered TOOL_SCHEMAs — safe to send to the planner LLM."""
    _ensure_discovered()
    return list(_registry.values())


def get_skill_module(name: str) -> ModuleType:
    """
    Return the Python module for a registered skill.
    Raises KeyError if not found.
    """
    _ensure_discovered()
    if name not in _modules:
        raise KeyError(
            f"No skill named '{name}' in registry. "
            f"Available: {list_skill_names()}"
        )
    return _modules[name]


def list_skill_names() -> list[str]:
    """Return all registered skill names."""
    _ensure_discovered()
    return list(_registry.keys())


def get_all_skills() -> list[str]:
    """Alias for list_skill_names() — returns all registered skill names."""
    return list_skill_names()


# ── Internal ──────────────────────────────────────────────────────────────────

def _ensure_discovered() -> None:
    if not _discovered:
        discover_skills()
