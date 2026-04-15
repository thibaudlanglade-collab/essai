import uuid
from dataclasses import dataclass, field


@dataclass
class PipelineContext:
    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    feature_id: str = ""
    metadata: dict = field(default_factory=dict)  # filename, content_type, etc.
    step_log: list[dict] = field(default_factory=list)
