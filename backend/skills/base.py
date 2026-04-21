from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SkillResult:
    success: bool
    data: Any
    debug: dict = field(default_factory=dict)
    error: Optional[str] = None
