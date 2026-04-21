"""
Feature registry — auto-discovers every module in this package that exposes
a `FEATURE` dict and registers it by ID.

Adding a new feature = create a new file in features/ with a FEATURE dict.
Zero changes required anywhere else in the app.
"""
from __future__ import annotations
from typing import Optional

import importlib
import pkgutil
from pathlib import Path

_REGISTRY: dict[str, dict] = {}


def load_all() -> None:
    """Import every feature module and register its FEATURE dict."""
    pkg_dir = Path(__file__).parent
    for _, module_name, _ in pkgutil.iter_modules([str(pkg_dir)]):
        if module_name in ("registry", "__init__"):
            continue
        mod = importlib.import_module(f"features.{module_name}")
        if hasattr(mod, "FEATURE"):
            feature = mod.FEATURE
            _REGISTRY[feature["id"]] = feature


def get_all() -> list[dict]:
    """Return all registered features (metadata only, no pipeline modules)."""
    return [
        {k: v for k, v in f.items() if k != "pipeline"}
        for f in _REGISTRY.values()
    ]


def get(feature_id: str) -> Optional[dict]:
    """Return a full feature dict (including pipeline) by ID, or None."""
    return _REGISTRY.get(feature_id)
