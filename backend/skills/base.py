from dataclasses import dataclass, field
from typing import Any


@dataclass
class SkillResult:
    success: bool
    data: Any
    debug: dict = field(default_factory=dict)
    error: str | None = None
