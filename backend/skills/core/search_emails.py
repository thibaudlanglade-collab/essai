"""
Skill: search_emails
Purpose: Full-text search across the current prospect's emails, filterable
         by sender, date range, priority, topic. Used by the assistant as a
         tool to answer questions about the inbox.

Multi-tenant: always scoped to `context["user_id"]`. If no user_id in context,
the skill refuses rather than returning all rows.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import or_, select

from skills.base import SkillResult

SKILL_ID = "search_emails"
DESCRIPTION = "Rechercher dans les emails de l'utilisateur"
TASK_TYPE = "email_query"

TOOL_SCHEMA = {
    "name": "search_emails",
    "description": (
        "Recherche dans les emails de l'utilisateur. "
        "La recherche porte sur les champs expéditeur, sujet, aperçu, corps et résumé IA. "
        "Filtres optionnels: expéditeur exact, période, priorité, topic, catégorie, importance. "
        "Retourne la liste des emails correspondants avec leurs métadonnées clés "
        "(id, expéditeur, sujet, date, priorité, topic, aperçu, cross-links client/fournisseur/devis/facture). "
        "Le body complet n'est PAS retourné — utilise read_email(id) pour l'obtenir."
    ),
    "when_to_use": [
        "L'utilisateur pose une question sur ses emails",
        "Besoin de lister des emails par expéditeur, sujet, période",
        "Résumer les échanges avec une personne ou une entreprise",
    ],
    "when_not_to_use": [
        "Obtenir le contenu complet d'un email précis — utiliser read_email",
        "Compter rapidement des emails sans en lister le contenu — utiliser count_emails",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Termes à chercher dans l'expéditeur, le sujet, l'aperçu, "
                    "le corps et le résumé IA. Laisser vide pour ne filtrer que "
                    "sur les autres critères."
                ),
            },
            "from_email": {
                "type": "string",
                "description": "Filtrer sur l'adresse email exacte de l'expéditeur",
            },
            "days_back": {
                "type": "integer",
                "description": "Limiter aux emails reçus dans les N derniers jours",
                "minimum": 1,
                "maximum": 365,
            },
            "priority": {
                "type": "string",
                "enum": ["urgent", "important", "normal", "low"],
                "description": "Filtrer sur la priorité classée par l'IA",
            },
            "topic": {
                "type": "string",
                "description": "Filtrer sur le topic (catégorie métier) classé par l'IA",
            },
            "category": {
                "type": "string",
                "enum": ["facture", "client", "fournisseur", "admin", "newsletter"],
                "description": "Filtrer sur la catégorie métier",
            },
            "important_only": {
                "type": "boolean",
                "description": "Ne retourner que les emails marqués comme importants",
            },
            "limit": {
                "type": "integer",
                "description": "Nombre maximum d'emails à retourner (défaut 20, max 100)",
                "minimum": 1,
                "maximum": 100,
            },
        },
        "required": [],
    },
}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from db.models import Email

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context (unauthenticated)")

        query_text = (input_data.get("query") or "").strip()
        from_email = (input_data.get("from_email") or "").strip()
        days_back = input_data.get("days_back")
        priority = input_data.get("priority")
        topic = input_data.get("topic")
        category = input_data.get("category")
        important_only = bool(input_data.get("important_only"))
        limit = min(int(input_data.get("limit") or 20), 100)

        stmt = select(Email).where(Email.user_id == user_id)

        if query_text:
            like = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Email.from_email.ilike(like),
                    Email.from_name.ilike(like),
                    Email.subject.ilike(like),
                    Email.snippet.ilike(like),
                    Email.body_plain.ilike(like),
                    Email.ai_summary.ilike(like),
                    Email.summary.ilike(like),
                )
            )

        if from_email:
            stmt = stmt.where(Email.from_email.ilike(f"%{from_email}%"))

        if days_back:
            # Email.received_at is timezone-naive in the schema; match it.
            cutoff = datetime.utcnow() - timedelta(days=int(days_back))
            stmt = stmt.where(Email.received_at >= cutoff)

        if priority:
            stmt = stmt.where(Email.priority == priority)

        if topic:
            stmt = stmt.where(Email.topic == topic)

        if category:
            stmt = stmt.where(Email.category == category)

        if important_only:
            stmt = stmt.where(Email.is_important.is_(True))

        stmt = stmt.order_by(Email.received_at.desc()).limit(limit)

        result = await db.execute(stmt)
        emails = result.scalars().all()

        rows = [
            {
                "id": e.id,
                "from_email": e.from_email,
                "from_name": e.from_name,
                "subject": e.subject,
                "snippet": e.snippet,
                "received_at": e.received_at.isoformat() if e.received_at else None,
                "priority": e.priority,
                "topic": e.topic,
                "category": e.category,
                "is_important": e.is_important,
                "ai_summary": e.ai_summary or e.summary,
                "is_read": e.is_read,
                "related_client_id": e.related_client_id,
                "related_supplier_id": e.related_supplier_id,
                "related_quote_id": e.related_quote_id,
            }
            for e in emails
        ]

        return SkillResult(
            success=True,
            data={"emails": rows, "count": len(rows)},
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"search_emails failed: {exc}")


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
