"""
Skill: extract_structured_data
Purpose: Extract structured JSON from text or an image using a planner-supplied
         target schema. Covers ~60% of extraction use cases.
"""
from __future__ import annotations

import base64
import json
import re
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "extract_structured_data"
DESCRIPTION = "Extract structured JSON from text or image using a target schema"
TASK_TYPE = "structuring"

TOOL_SCHEMA = {
    "name": "extract_structured_data",
    "description": (
        "Extract structured data from text or an image, matching "
        "a JSON schema provided by the planner. Adapts to messy inputs and "
        "variations. The most flexible extraction skill in the system."
    ),
    "when_to_use": [
        "Extract specific fields from a document (invoice details, contact info, etc.)",
        "Convert unstructured text into JSON matching a schema",
        "Pull values from a document that are NOT in tabular form",
    ],
    "when_not_to_use": [
        "Extract full tables with many rows (use extract_tables_smart)",
        "Generate new content (use generate_document)",
        "Read a raw file (use extract_file_content first)",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "content_ref": {
                "type": "string",
                "description": "State key reference to text (str) or image (bytes)",
            },
            "content_type": {
                "type": "string",
                "enum": ["text", "image"],
                "description": "Whether the content is text or an image",
            },
            "target_schema": {
                "type": "object",
                "description": "JSON schema describing the desired output shape",
            },
            "context_hint": {
                "type": "string",
                "description": "Optional extra context to guide extraction (e.g. 'French invoice')",
            },
        },
        "required": ["content_ref", "content_type", "target_schema"],
    },
}


def _extract_json(raw: str) -> Any:
    """Return dict or list. Strips markdown fences and attempts multiple parses."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, (dict, list)):
            return parsed
    except json.JSONDecodeError:
        pass
    # Try to find a JSON object or array in the raw string
    for pattern in (r"\{.*\}", r"\[.*\]"):
        match = re.search(pattern, cleaned, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, (dict, list)):
                    return parsed
            except json.JSONDecodeError:
                pass
    return None


def _build_system_prompt(target_schema: dict, context_hint: Optional[str]) -> str:
    hint_section = (
        f"\nADDITIONAL CONTEXT: {context_hint}\n" if context_hint else ""
    )
    return (
        "You are a precise structured data extraction assistant.\n"
        "Extract data matching the target schema below from the provided content.\n\n"
        "RULES:\n"
        "- Return ONLY valid JSON, no markdown, no commentary\n"
        "- Use null for genuinely missing fields (not empty strings)\n"
        "- For ambiguous values, make a reasonable interpretation\n"
        "- If multiple items match the schema, return them as a JSON array\n"
        "- Adapt to format variations — the input may be messy\n\n"
        f"TARGET SCHEMA:\n{json.dumps(target_schema, indent=2)}\n"
        f"{hint_section}\n"
        'If you cannot extract anything meaningful, return {"error": "<reason>"}'
    )


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        content: Any = input_data.get("content_ref")
        content_type: str = input_data.get("content_type", "text")
        target_schema: dict = input_data.get("target_schema", {})
        context_hint: Optional[str] = input_data.get("context_hint")

        # Tolerant input handling: if content is a dict wrapper from another
        # skill (e.g. extract_file_content), unwrap the relevant inner field.
        if isinstance(content, dict):
            if content_type == "text" and "text" in content:
                content = content["text"]
            elif content_type == "image" and "image_bytes" in content:
                content = content["image_bytes"]

        system_prompt = _build_system_prompt(target_schema, context_hint)
        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

        # ── Text path ─────────────────────────────────────────────────────────
        if content_type == "text":
            if not isinstance(content, str):
                return SkillResult(
                    success=False,
                    data=None,
                    error=(
                        f"extract_structured_data: content_type='text' but "
                        f"content_ref resolved to {type(content).__name__}"
                    ),
                )
            user_content = content[:50_000]
            task_type_used = TASK_TYPE
            model = get_model(TASK_TYPE)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ]
            tokens_estimate = len(user_content) // 4

        # ── Image path ────────────────────────────────────────────────────────
        elif content_type == "image":
            if not isinstance(content, bytes):
                return SkillResult(
                    success=False,
                    data=None,
                    error=(
                        f"extract_structured_data: content_type='image' but "
                        f"content_ref resolved to {type(content).__name__}"
                    ),
                )
            task_type_used = "vision"
            model = get_model("vision")
            b64 = base64.b64encode(content).decode("ascii")
            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract data matching the schema."},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{b64}"},
                        },
                    ],
                },
            ]
            tokens_estimate = len(content) // 100  # rough image estimate

        else:
            return SkillResult(
                success=False,
                data=None,
                error=f"extract_structured_data: unknown content_type '{content_type}'",
            )

        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=8192,
        )

        raw_output = response.choices[0].message.content or ""
        parsed = _extract_json(raw_output)

        if parsed is None:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"extract_structured_data: LLM did not return valid JSON. "
                    f"Raw: {raw_output[:300]}"
                ),
            )

        if isinstance(parsed, dict) and "error" in parsed and len(parsed) == 1:
            return SkillResult(
                success=False,
                data=None,
                error=f"extract_structured_data: LLM reported error: {parsed['error']}",
            )

        output_keys = list(parsed.keys()) if isinstance(parsed, dict) else None
        return SkillResult(
            success=True,
            data=parsed,
            debug={
                "content_type": content_type,
                "task_type_used": task_type_used,
                "tokens_input_estimate": tokens_estimate,
                "output_keys": output_keys,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"extract_structured_data failed: {exc}",
        )
