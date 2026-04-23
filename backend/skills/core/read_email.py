"""
Skill: read_email
Purpose: Fetch the full body (and attachment list) of a single email by id.
         Scoped to the current user — refuses if the email belongs to another
         prospect or if user_id is missing from the context.
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from skills.base import SkillResult

SKILL_ID = "read_email"
DESCRIPTION = "Lire le contenu complet d'un email précis"
TASK_TYPE = "email_query"

TOOL_SCHEMA = {
    "name": "read_email",
    "description": (
        "Récupère le contenu complet d'un email par son id: corps texte intégral, "
        "destinataires, pièces jointes, cross-links (client/fournisseur/devis/facture). "
        "À utiliser après search_emails pour obtenir les détails d'un email identifié."
    ),
    "when_to_use": [
        "Répondre précisément au contenu d'un email particulier",
        "Lire les détails complets après une recherche",
    ],
    "when_not_to_use": [
        "Parcourir plusieurs emails — utiliser search_emails",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "email_id": {
                "type": "integer",
                "description": "Identifiant numérique interne de l'email (champ 'id')",
            },
        },
        "required": ["email_id"],
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

        email_id = input_data.get("email_id")
        if email_id is None:
            return SkillResult(success=False, data=None, error="email_id est requis")

        stmt = (
            select(Email)
            .where(and_(Email.id == int(email_id), Email.user_id == user_id))
            .options(selectinload(Email.attachments))
        )
        result = await db.execute(stmt)
        email = result.scalar_one_or_none()

        if email is None:
            return SkillResult(
                success=False,
                data=None,
                error=f"Email {email_id} introuvable (ou n'appartient pas à cet utilisateur)",
            )

        return SkillResult(
            success=True,
            data={
                "id": email.id,
                "from_email": email.from_email,
                "from_name": email.from_name,
                "to_emails": json.loads(email.to_emails or "[]"),
                "subject": email.subject,
                "received_at": email.received_at.isoformat() if email.received_at else None,
                "body_plain": email.body_plain,
                "priority": email.priority,
                "topic": email.topic,
                "category": email.category,
                "is_important": email.is_important,
                "ai_summary": email.ai_summary or email.summary,
                "suggested_reply": email.suggested_reply,
                "related_client_id": email.related_client_id,
                "related_supplier_id": email.related_supplier_id,
                "related_quote_id": email.related_quote_id,
                "attachments": [
                    {"filename": a.filename, "mime_type": a.mime_type, "size_bytes": a.size_bytes}
                    for a in email.attachments
                ],
            },
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"read_email failed: {exc}")


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
