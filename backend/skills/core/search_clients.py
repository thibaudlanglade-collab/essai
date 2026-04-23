"""
Skill: search_clients
Purpose: Search the prospect's clients by name, email, phone, type, notes.
         Multi-tenant: always scoped to context["user_id"].
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import or_, select

from skills.base import SkillResult

SKILL_ID = "search_clients"
DESCRIPTION = "Rechercher dans les clients de l'utilisateur"
TASK_TYPE = "client_query"

TOOL_SCHEMA = {
    "name": "search_clients",
    "description": (
        "Recherche dans les clients de l'utilisateur (particuliers, SCI, copros, "
        "mairies, promoteurs). Porte sur le nom, email, téléphone, adresse et notes. "
        "Retourne id, nom, type, email, téléphone, adresse — utilisables comme "
        "filtre pour search_quotes (via client_name)."
    ),
    "when_to_use": [
        "L'utilisateur demande des infos sur un client nommé",
        "Besoin de lister les clients d'un certain type",
        "Avant de chercher des devis liés à un client, pour obtenir son id",
    ],
    "when_not_to_use": [
        "Lister les fournisseurs — utiliser search_suppliers",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Texte à chercher dans nom, email, téléphone, adresse, notes",
            },
            "type": {
                "type": "string",
                "enum": ["particulier", "sci", "copro", "mairie", "promoteur"],
                "description": "Filtrer sur le type de client",
            },
            "limit": {
                "type": "integer",
                "description": "Nombre maximum à retourner (défaut 20, max 100)",
                "minimum": 1,
                "maximum": 100,
            },
        },
        "required": [],
    },
}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from db.models import Client

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context")

        query_text = (input_data.get("query") or "").strip()
        client_type = input_data.get("type")
        limit = min(int(input_data.get("limit") or 20), 100)

        stmt = select(Client).where(Client.user_id == user_id)

        if query_text:
            like = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Client.name.ilike(like),
                    Client.email.ilike(like),
                    Client.phone.ilike(like),
                    Client.address.ilike(like),
                    Client.notes.ilike(like),
                )
            )
        if client_type:
            stmt = stmt.where(Client.type == client_type)

        stmt = stmt.order_by(Client.name).limit(limit)
        rows = (await db.execute(stmt)).scalars().all()

        return SkillResult(
            success=True,
            data={
                "clients": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "type": c.type,
                        "email": c.email,
                        "phone": c.phone,
                        "address": c.address,
                        "notes": c.notes,
                    }
                    for c in rows
                ],
                "count": len(rows),
            },
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"search_clients failed: {exc}")


def _get_db(context: Any):
    if context is None:
        return None
    if isinstance(context, dict):
        return context.get("db")
    return getattr(context, "db", None)


def _get_user_id(context: Any) -> str:
    if context is None:
        return ""
    if isinstance(context, dict):
        return context.get("user_id") or ""
    return getattr(context, "user_id", "") or ""
