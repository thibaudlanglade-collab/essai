_MODEL_MAP = {
    # Heavy: vision, multi-page documents, complex reasoning
    "vision":       "gpt-4o",
    "complex":      "gpt-4o",
    "planning":     "gpt-4o",
    # Mid: structured extraction, JSON transformation
    "structuring":  "gpt-4o-mini",
    "coding":       "gpt-4o-mini",
    # Light: summarization, classification, text cleanup
    "summarizing":  "gpt-4o-mini",
    "cleaning":     "gpt-4o-mini",
    "classifying":  "gpt-4o-mini",
}

_DEFAULT = "gpt-4o-mini"


def get_model(task_type: str) -> str:
    """Return the appropriate model ID for a given task type."""
    return _MODEL_MAP.get(task_type, _DEFAULT)
