"""
Skill: search_suppliers
Purpose: Search the prospect's suppliers by name, category, SIRET, city, notes.
         Multi-tenant: always scoped to context["user_id"].
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import or_, select

from skills.base import SkillResult

SKILL_ID = "search_suppliers"
DESCRIPTION = "Rechercher dans les fournisseurs de l'utilisateur"
TASK_TYPE = "supplier_query"

TOOL_SCHEMA = {
    "name": "search_suppliers",
    "description": (
        "Recherche dans les fournisseurs de l'utilisateur (matériaux, outillage, "
        "sous-traitants, etc.). Porte sur le nom, SIRET, ville, catégorie et notes. "
        "Retourne id, nom, catégorie, SIRET, ville. Utile avant search_invoices "
        "pour pointer sur un fournisseur précis."
    ),
    "when_to_use": [
        "L'utilisateur demande des infos sur un fournisseur",
        "Lister les fournisseurs par catégorie (béton, plomberie, etc.) ou par ville",
        "Avant de chercher les factures d'un fournisseur",
    ],
    "when_not_to_use": [
        "Lister les clients — utiliser search_clients",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Texte à chercher dans nom, SIRET, ville, catégorie, notes",
            },
            "category": {
                "type": "string",
                "description": "Filtrer sur la catégorie (ex: 'béton', 'plomberie', 'électricité')",
            },
            "city": {
                "type": "string",
                "description": "Filtrer sur la ville",
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
        from db.models import Supplier

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context")

        query_text = (input_data.get("query") or "").strip()
        category = (input_data.get("category") or "").strip()
        city = (input_data.get("city") or "").strip()
        limit = min(int(input_data.get("limit") or 20), 100)

        stmt = select(Supplier).where(Supplier.user_id == user_id)

        if query_text:
            like = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Supplier.name.ilike(like),
                    Supplier.siret.ilike(like),
                    Supplier.city.ilike(like),
                    Supplier.category.ilike(like),
                    Supplier.notes.ilike(like),
                )
            )
        if category:
            stmt = stmt.where(Supplier.category.ilike(f"%{category}%"))
        if city:
            stmt = stmt.where(Supplier.city.ilike(f"%{city}%"))

        stmt = stmt.order_by(Supplier.name).limit(limit)
        rows = (await db.execute(stmt)).scalars().all()

        return SkillResult(
            success=True,
            data={
                "suppliers": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "category": s.category,
                        "siret": s.siret,
                        "city": s.city,
                        "notes": s.notes,
                    }
                    for s in rows
                ],
                "count": len(rows),
            },
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"search_suppliers failed: {exc}")


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
