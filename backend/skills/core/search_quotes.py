"""
Skill: search_quotes
Purpose: Search the prospect's quotes (devis) by client, status, amount, text.
         Multi-tenant: always scoped to context["user_id"].
         Includes a `summary` block with counts + totals by status.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import aliased

from skills.base import SkillResult

SKILL_ID = "search_quotes"
DESCRIPTION = "Rechercher dans les devis émis par l'utilisateur"
TASK_TYPE = "quote_query"

TOOL_SCHEMA = {
    "name": "search_quotes",
    "description": (
        "Recherche dans les devis émis par l'utilisateur à ses clients. "
        "Porte sur le numéro, le titre, la description, le texte source. "
        "Filtres: nom client (fuzzy), statut (draft/sent/accepted/refused), "
        "montant min/max, période. "
        "Retourne la liste + un résumé (count + total HT/TTC par statut)."
    ),
    "when_to_use": [
        "Questions sur les devis: liste, total, en attente, refusés",
        "« Quel CA potentiel en devis envoyés ? »",
        "« Quels devis pour [client] ? »",
    ],
    "when_not_to_use": [
        "Factures reçues — utiliser search_invoices",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Texte à chercher dans numéro, titre, description",
            },
            "client_name": {
                "type": "string",
                "description": "Nom du client (fuzzy — fait une jointure avec Client)",
            },
            "status": {
                "type": "string",
                "enum": ["draft", "sent", "accepted", "refused"],
                "description": "Filtrer sur le statut du devis",
            },
            "amount_min": {
                "type": "number",
                "description": "Montant HT minimum",
            },
            "amount_max": {
                "type": "number",
                "description": "Montant HT maximum",
            },
            "days_back": {
                "type": "integer",
                "description": "Devis créés dans les N derniers jours",
                "minimum": 1,
                "maximum": 730,
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
        from db.models import Client, Quote

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context")

        query_text = (input_data.get("query") or "").strip()
        client_name = (input_data.get("client_name") or "").strip()
        status = input_data.get("status")
        amount_min = input_data.get("amount_min")
        amount_max = input_data.get("amount_max")
        days_back = input_data.get("days_back")
        limit = min(int(input_data.get("limit") or 20), 100)

        # Base-scoped query joined on clients for fuzzy client-name filter + display.
        ClientT = aliased(Client)
        stmt = (
            select(Quote, ClientT.name.label("client_name"))
            .outerjoin(ClientT, Quote.client_id == ClientT.id)
            .where(Quote.user_id == user_id)
        )

        if query_text:
            like = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Quote.quote_number.ilike(like),
                    Quote.title.ilike(like),
                    Quote.description.ilike(like),
                )
            )
        if client_name:
            stmt = stmt.where(ClientT.name.ilike(f"%{client_name}%"))
        if status:
            stmt = stmt.where(Quote.status == status)
        if amount_min is not None:
            stmt = stmt.where(Quote.amount_ht >= float(amount_min))
        if amount_max is not None:
            stmt = stmt.where(Quote.amount_ht <= float(amount_max))
        if days_back:
            cutoff = datetime.utcnow() - timedelta(days=int(days_back))
            stmt = stmt.where(Quote.created_at >= cutoff)

        stmt = stmt.order_by(Quote.created_at.desc()).limit(limit)
        rows = (await db.execute(stmt)).all()

        items = []
        summary: dict[str, dict] = {}
        for quote, cname in rows:
            amount_ht = float(quote.amount_ht) if quote.amount_ht is not None else 0.0
            amount_ttc = float(quote.amount_ttc) if quote.amount_ttc is not None else 0.0
            items.append({
                "id": quote.id,
                "quote_number": quote.quote_number,
                "title": quote.title,
                "client_id": quote.client_id,
                "client_name": cname,
                "status": quote.status,
                "amount_ht": amount_ht,
                "amount_ttc": amount_ttc,
                "created_at": quote.created_at.isoformat() if quote.created_at else None,
            })
            bucket = summary.setdefault(
                quote.status or "unknown",
                {"count": 0, "total_ht": 0.0, "total_ttc": 0.0},
            )
            bucket["count"] += 1
            bucket["total_ht"] += amount_ht
            bucket["total_ttc"] += amount_ttc

        return SkillResult(
            success=True,
            data={
                "quotes": items,
                "count": len(items),
                "summary_by_status": summary,
            },
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"search_quotes failed: {exc}")


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
