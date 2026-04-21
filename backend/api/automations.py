"""
FastAPI router: /automations — CRUD, templates, NL creation, run, history.
Registered with prefix="/api" in main.py → final paths /api/automations/...
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Automation, AutomationRun
from services.automation_templates import get_template, list_templates

logger = logging.getLogger(__name__)

automations_router = APIRouter(prefix="/automations")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_mgr():
    from services.automation_triggers import get_trigger_manager
    return get_trigger_manager()


# ── Template catalogue ────────────────────────────────────────────────────────

@automations_router.get("/templates")
async def get_templates_list() -> list[dict[str, Any]]:
    return list_templates()


# ── CRUD ──────────────────────────────────────────────────────────────────────

@automations_router.get("")
async def list_automations(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Automation).order_by(desc(Automation.created_at))
    )
    return [a.to_dict() for a in result.scalars().all()]


@automations_router.get("/{automation_id}")
async def get_automation(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")
    return auto.to_dict()


@automations_router.post("")
async def create_automation(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    auto = Automation(
        name=body["name"],
        description=body.get("description"),
        template_id=body.get("template_id"),
        is_active=body.get("is_active", True),
        trigger_type=body["trigger_type"],
        trigger_config=json.dumps(body.get("trigger_config", {})),
        actions=json.dumps(body.get("actions", [])),
        on_error=body.get("on_error", "stop"),
    )
    db.add(auto)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, f"Une automatisation nommée '{body['name']}' existe déjà")
    await db.refresh(auto)

    if auto.is_active:
        mgr = _get_mgr()
        if mgr:
            await mgr.register_automation(auto)

    return auto.to_dict()


@automations_router.post("/from-template")
async def create_from_template(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    template_id: str = body.get("template_id", "")
    tmpl = get_template(template_id)
    if tmpl is None:
        raise HTTPException(400, f"Template '{template_id}' introuvable")

    overrides: dict = body.get("overrides", {})
    trigger_config = {**tmpl["trigger_config"], **overrides.get("trigger_config", {})}

    auto = Automation(
        name=body.get("custom_name") or tmpl["name"],
        description=tmpl.get("description"),
        template_id=template_id,
        is_active=True,
        trigger_type=tmpl["trigger_type"],
        trigger_config=json.dumps(trigger_config),
        actions=json.dumps(tmpl.get("actions", [])),
        on_error=tmpl.get("on_error", "stop"),
    )
    db.add(auto)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, f"Une automatisation avec ce nom existe déjà")
    await db.refresh(auto)

    if auto.is_active:
        mgr = _get_mgr()
        if mgr:
            await mgr.register_automation(auto)

    return auto.to_dict()


@automations_router.post("/from-natural-language")
async def create_from_natural_language(
    body: dict[str, Any],
) -> dict[str, Any]:
    """Parse a French description into an automation config (preview only, not saved)."""
    from openai import AsyncOpenAI
    import config as cfg
    from engine.planner import skill_registry

    prompt: str = body.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(400, "Prompt vide")

    skill_registry.discover_skills()
    skill_names = skill_registry.list_skill_names()

    system = (
        "Tu convertis une description en français en configuration JSON d'automatisation.\n\n"
        f"Skills disponibles: {json.dumps(skill_names)}\n"
        "Triggers disponibles:\n"
        "  - cron: {\"hour\": 8, \"minute\": 0}\n"
        "  - folder_watch: {\"folder_path\": \"C:\\\\Synthese\\\\Inbox\", \"extensions\": [\".pdf\"]}\n"
        "  - email_new: {\"filter_priority\": \"urgent\"} (optionnel)\n\n"
        "Retourne UNIQUEMENT du JSON valide, sans markdown:\n"
        "{\n"
        "  \"name\": \"...\",\n"
        "  \"description\": \"...\",\n"
        "  \"trigger_type\": \"cron|folder_watch|email_new\",\n"
        "  \"trigger_config\": {},\n"
        "  \"actions\": [{\"skill_id\": \"...\", \"args\": {}, \"output_key\": \"...\"}],\n"
        "  \"on_error\": \"continue|stop\"\n"
        "}"
    )

    client = AsyncOpenAI(api_key=cfg.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1024,
    )

    raw = (response.choices[0].message.content or "").strip()
    # Strip markdown fences
    if raw.startswith("```"):
        lines = raw.split("\n")
        end = -1 if lines[-1].strip() == "```" else len(lines)
        raw = "\n".join(lines[1:end])

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(422, f"GPT-4o a retourné du JSON invalide: {exc}") from exc


@automations_router.put("/{automation_id}")
async def update_automation(
    automation_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")

    mgr = _get_mgr()
    if mgr:
        await mgr.unregister_automation(automation_id)

    for field in ("name", "description", "on_error", "is_active"):
        if field in body:
            setattr(auto, field, body[field])
    if "trigger_type" in body:
        auto.trigger_type = body["trigger_type"]
    if "trigger_config" in body:
        auto.trigger_config = json.dumps(body["trigger_config"])
    if "actions" in body:
        auto.actions = json.dumps(body["actions"])

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Nom déjà utilisé par une autre automatisation")
    await db.refresh(auto)

    if auto.is_active and mgr:
        await mgr.register_automation(auto)

    return auto.to_dict()


@automations_router.delete("/{automation_id}")
async def delete_automation(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")

    mgr = _get_mgr()
    if mgr:
        await mgr.unregister_automation(automation_id)

    await db.delete(auto)
    await db.commit()
    return {"status": "deleted", "id": str(automation_id)}


# ── Toggle / Run now ──────────────────────────────────────────────────────────

@automations_router.post("/{automation_id}/toggle")
async def toggle_automation(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")

    mgr = _get_mgr()
    if auto.is_active:
        auto.is_active = False
        if mgr:
            await mgr.unregister_automation(automation_id)
    else:
        auto.is_active = True
        await db.commit()
        await db.refresh(auto)
        if mgr:
            await mgr.register_automation(auto)
        return auto.to_dict()

    await db.commit()
    await db.refresh(auto)
    return auto.to_dict()


@automations_router.post("/{automation_id}/run-now")
async def run_now(
    automation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")

    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
    except Exception as exc:
        logger.warning("run_now: could not parse body: %s", exc)
        body = {}

    logger.info("run_now: body=%r, trigger_context will include file_path=%r", body, body.get("file_path"))
    trigger_context: dict[str, Any] = {"manual": True, **body}

    from services.automation_engine import AutomationEngine
    engine = AutomationEngine()
    try:
        return await engine.run_automation(automation_id, trigger_context)
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc


# ── Resync template ──────────────────────────────────────────────────────────

@automations_router.post("/{automation_id}/resync-template")
async def resync_template(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Re-apply the latest template definition to an existing automation.

    Updates actions, trigger_type, trigger_config, and on_error from the
    template while preserving run history, name, and all other fields.
    """
    auto = await db.get(Automation, automation_id)
    if auto is None:
        raise HTTPException(404, f"Automation {automation_id} introuvable")

    if not auto.template_id:
        raise HTTPException(400, "Cette automatisation n'est pas liée à un template")

    tmpl = get_template(auto.template_id)
    if tmpl is None:
        raise HTTPException(404, f"Template '{auto.template_id}' introuvable")

    mgr = _get_mgr()
    if mgr:
        await mgr.unregister_automation(automation_id)

    auto.trigger_type = tmpl["trigger_type"]
    auto.trigger_config = json.dumps(tmpl["trigger_config"])
    auto.actions = json.dumps(tmpl.get("actions", []))
    auto.on_error = tmpl.get("on_error", "stop")

    await db.commit()
    await db.refresh(auto)

    if auto.is_active and mgr:
        await mgr.register_automation(auto)

    logger.info("Automation %d resynced from template '%s'", automation_id, auto.template_id)
    return auto.to_dict()


# ── Run history ───────────────────────────────────────────────────────────────

@automations_router.get("/{automation_id}/runs")
async def list_runs(
    automation_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(AutomationRun)
        .where(AutomationRun.automation_id == automation_id)
        .order_by(desc(AutomationRun.started_at))
        .limit(20)
    )
    return [r.to_dict() for r in result.scalars().all()]
