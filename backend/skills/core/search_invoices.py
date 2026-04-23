"""
Skill: search_invoices
Purpose: Search the prospect's received supplier invoices by supplier, status,
         amount, period, text. Multi-tenant: always scoped to context["user_id"].
         Includes a `summary` block with counts + totals (HT + TTC).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import aliased

from skills.base import SkillResult

SKILL_ID = "search_invoices"
DESCRIPTION = "Rechercher dans les factures fournisseurs reçues par l'utilisateur"
TASK_TYPE = "invoice_query"

TOOL_SCHEMA = {
    "name": "search_invoices",
    "description": (
        "Recherche dans les factures fournisseurs reçues par l'utilisateur "
        "(ce qu'il doit payer à ses fournisseurs). "
        "Porte sur le numéro de facture, le nom du fichier et le texte brut extrait. "
        "Filtres: nom fournisseur (fuzzy), période, montant min/max. "
        "Retourne la liste + un résumé (count + total HT/TTC)."
    ),
    "when_to_use": [
        "« Combien je dois à [fournisseur] ? »",
        "« Quelles factures reçues sur les 30 derniers jours ? »",
        "« Total des factures Point P du trimestre »",
    ],
    "when_not_to_use": [
        "Devis émis aux clients — utiliser search_quotes",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Texte à chercher dans numéro, fichier, raw_text",
            },
            "supplier_name": {
                "type": "string",
                "description": "Nom du fournisseur (fuzzy — jointure avec Supplier)",
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
                "description": "Factures dont la date (invoice_date) est dans les N derniers jours",
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
        from db.models import Invoice, Supplier

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context")

        query_text = (input_data.get("query") or "").strip()
        supplier_name = (input_data.get("supplier_name") or "").strip()
        amount_min = input_data.get("amount_min")
        amount_max = input_data.get("amount_max")
        days_back = input_data.get("days_back")
        limit = min(int(input_data.get("limit") or 20), 100)

        SupplierT = aliased(Supplier)
        stmt = (
            select(Invoice, SupplierT.name.label("supplier_name"))
            .outerjoin(SupplierT, Invoice.supplier_id == SupplierT.id)
            .where(Invoice.user_id == user_id)
        )

        if query_text:
            like = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Invoice.invoice_number.ilike(like),
                    Invoice.original_filename.ilike(like),
                    Invoice.raw_text.ilike(like),
                )
            )
        if supplier_name:
            stmt = stmt.where(SupplierT.name.ilike(f"%{supplier_name}%"))
        if amount_min is not None:
            stmt = stmt.where(Invoice.amount_ht >= float(amount_min))
        if amount_max is not None:
            stmt = stmt.where(Invoice.amount_ht <= float(amount_max))
        if days_back:
            cutoff = date.today() - timedelta(days=int(days_back))
            stmt = stmt.where(Invoice.invoice_date >= cutoff)

        stmt = stmt.order_by(Invoice.invoice_date.desc().nullslast()).limit(limit)
        rows = (await db.execute(stmt)).all()

        items = []
        total_ht = 0.0
        total_ttc = 0.0
        for invoice, sname in rows:
            ht = float(invoice.amount_ht) if invoice.amount_ht is not None else 0.0
            ttc = float(invoice.amount_ttc) if invoice.amount_ttc is not None else 0.0
            total_ht += ht
            total_ttc += ttc
            items.append({
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "supplier_id": invoice.supplier_id,
                "supplier_name": sname,
                "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                "amount_ht": ht,
                "amount_ttc": ttc,
                "status": invoice.status,
                "original_filename": invoice.original_filename,
            })

        return SkillResult(
            success=True,
            data={
                "invoices": items,
                "count": len(items),
                "total_ht": round(total_ht, 2),
                "total_ttc": round(total_ttc, 2),
            },
        )

    except Exception as exc:
        return SkillResult(success=False, data=None, error=f"search_invoices failed: {exc}")


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
