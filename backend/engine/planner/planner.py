"""
Planner — converts a user request + state into an execution plan.

Public API:
    plan = await create_plan(user_request, state, context)
    # plan: {"reasoning": str, "steps": list[dict]}
"""
from __future__ import annotations

import json
import re

from engine.planner.state import PlannerState
from engine.planner import skill_registry
from engine.planner.system_prompt import PLANNER_SYSTEM_PROMPT

TASK_TYPE = "planning"


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON; return {} on failure."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    # Fallback: find outermost {...}
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return {}


# ── Validation ────────────────────────────────────────────────────────────────

def _validate_plan(plan: object, registry: list[dict]) -> dict:
    """
    Validate the LLM-produced plan dict against the registered skill schemas.

    Returns the original plan if valid, or a safe empty plan with a
    descriptive reasoning string if not.
    """
    # Build a lookup: skill_name -> schema
    schema_by_name: dict[str, dict] = {s["name"]: s for s in registry if "name" in s}

    # ── Top-level structure ──────────────────────────────────────────────────
    if not isinstance(plan, dict):
        return {"reasoning": "Plan validation failed: response is not a JSON object", "steps": []}

    if not isinstance(plan.get("reasoning"), str):
        return {"reasoning": "Plan validation failed: missing or non-string 'reasoning'", "steps": []}

    if not isinstance(plan.get("steps"), list):
        return {"reasoning": "Plan validation failed: missing or non-list 'steps'", "steps": []}

    # Empty plan is valid — the planner chose not to act
    if len(plan["steps"]) == 0:
        return plan

    # ── Per-step checks ──────────────────────────────────────────────────────
    for idx, step in enumerate(plan["steps"], start=1):
        step_label = f"step {idx}"

        if not isinstance(step, dict):
            return {
                "reasoning": f"Plan validation failed: {step_label} is not an object",
                "steps": [],
            }

        for required_field in ("skill", "args", "output_key"):
            if required_field not in step:
                return {
                    "reasoning": f"Plan validation failed: {step_label} missing '{required_field}'",
                    "steps": [],
                }

        # skill must be a known string
        skill_name = step["skill"]
        if not isinstance(skill_name, str):
            return {
                "reasoning": f"Plan validation failed: {step_label} 'skill' must be a string",
                "steps": [],
            }
        if skill_name not in schema_by_name:
            return {
                "reasoning": (
                    f"Plan validation failed: {step_label} references unknown skill '{skill_name}'. "
                    f"Available: {list(schema_by_name.keys())}"
                ),
                "steps": [],
            }

        # args must be a dict
        args = step["args"]
        if not isinstance(args, dict):
            return {
                "reasoning": f"Plan validation failed: {step_label} 'args' must be an object",
                "steps": [],
            }

        # output_key must be a non-empty string
        output_key = step["output_key"]
        if not isinstance(output_key, str) or not output_key.strip():
            return {
                "reasoning": f"Plan validation failed: {step_label} 'output_key' must be a non-empty string",
                "steps": [],
            }

        # Schema-level checks (only when the skill exposes input_schema)
        schema = schema_by_name[skill_name]
        input_schema = schema.get("input_schema") or schema.get("parameters") or {}
        properties: dict = input_schema.get("properties", {})
        required_args: list = input_schema.get("required", [])

        for arg_name, arg_value in args.items():
            # Arg must be declared in properties (if properties is defined)
            if properties and arg_name not in properties:
                return {
                    "reasoning": (
                        f"Plan validation failed: {step_label} passes undeclared arg '{arg_name}' "
                        f"to skill '{skill_name}'"
                    ),
                    "steps": [],
                }

            # Validate $state. reference format
            if isinstance(arg_value, str) and arg_value.startswith("$state."):
                ref_key = arg_value[len("$state."):]
                if not ref_key:
                    return {
                        "reasoning": (
                            f"Plan validation failed: {step_label} arg '{arg_name}' has "
                            "malformed state reference '$state.' (empty key)"
                        ),
                        "steps": [],
                    }

        # All required args must be present
        for req in required_args:
            if req not in args:
                return {
                    "reasoning": (
                        f"Plan validation failed: {step_label} missing required arg '{req}' "
                        f"for skill '{skill_name}'"
                    ),
                    "steps": [],
                }

    return plan


# ── Public API ────────────────────────────────────────────────────────────────

async def create_plan(
    user_request: str,
    state: PlannerState,
    context,  # PipelineContext — kept for interface compatibility
) -> dict:
    """
    Ask the LLM planner to produce an execution plan.

    Returns:
        {"reasoning": str, "steps": list[dict]}

    Never raises — all errors are returned as an empty-steps plan.
    """
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        skill_schemas = skill_registry.get_all_schemas()

        if not skill_schemas:
            return {"reasoning": "No skills available in registry", "steps": []}

        state_description = state.describe()

        user_content = (
            "USER REQUEST:\n"
            f"{user_request}\n\n"
            "CURRENT STATE:\n"
            f"{json.dumps(state_description, indent=2)}\n\n"
            "AVAILABLE SKILLS:\n"
            f"{json.dumps(skill_schemas, indent=2)}\n\n"
            "Produce the execution plan now. Return ONLY valid JSON."
        )

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=4096,
        )

        raw_output = response.choices[0].message.content or ""
        plan = _extract_json(raw_output)

        if not plan:
            return {
                "reasoning": f"Planning failed: LLM returned non-JSON output. Raw: {raw_output[:300]}",
                "steps": [],
            }

        return _validate_plan(plan, skill_schemas)

    except Exception as exc:
        return {"reasoning": f"Planning failed: {exc}", "steps": []}
