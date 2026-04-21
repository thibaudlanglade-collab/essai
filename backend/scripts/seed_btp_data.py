"""Insert the BTP demo seed (suppliers, clients, invoices, quotes, emails)
into the tenant space identified by `user_id`.

The JSON payload lives in `backend/data/btp_seed.json`. This loader is purely
inserts: it does not touch schema. It is idempotent per user_id by probing
the `clients` table for an existing seed row before any write.
"""
from __future__ import annotations

import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Client, Email, Invoice, Quote, Supplier

_SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "btp_seed.json"


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _to_datetime(value: str) -> datetime:
    """Accept `YYYY-MM-DD` or full ISO and return a `datetime` for DateTime columns."""
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.combine(_parse_date(value), time.min)


async def seed_btp_data(db: AsyncSession, user_id: str) -> dict[str, int]:
    """Insert all BTP demo data for `user_id`.

    Idempotent: if the tenant already has at least one seed client, this is a
    no-op and every count in the returned dict is 0.

    Returns a dict of inserted row counts:
        {"suppliers": N, "clients": N, "invoices": N, "quotes": N, "emails": N}
    """
    # ── Idempotence guard ───────────────────────────────────────────────────
    existing = await db.execute(
        select(Client.id)
        .where(Client.user_id == user_id, Client.is_seed.is_(True))
        .limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return {"suppliers": 0, "clients": 0, "invoices": 0, "quotes": 0, "emails": 0}

    # ── Load payload ────────────────────────────────────────────────────────
    with _SEED_PATH.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    counts = {"suppliers": 0, "clients": 0, "invoices": 0, "quotes": 0, "emails": 0}

    # ── Suppliers ───────────────────────────────────────────────────────────
    supplier_id_by_name: dict[str, str] = {}
    for row in payload["suppliers"]:
        supplier = Supplier(
            user_id=user_id,
            is_seed=True,
            name=row["name"],
            category=row.get("category"),
            siret=row.get("siret"),
            city=row.get("city"),
            notes=row.get("notes"),
        )
        db.add(supplier)
        await db.flush()
        supplier_id_by_name[row["name"]] = supplier.id
        counts["suppliers"] += 1

    # ── Clients ─────────────────────────────────────────────────────────────
    client_id_by_name: dict[str, str] = {}
    for row in payload["clients"]:
        client = Client(
            user_id=user_id,
            is_seed=True,
            name=row["name"],
            type=row.get("type"),
            address=row.get("address"),
            email=row.get("email"),
            phone=row.get("phone"),
            notes=row.get("notes"),
        )
        db.add(client)
        await db.flush()
        client_id_by_name[row["name"]] = client.id
        counts["clients"] += 1

    # ── Invoices ────────────────────────────────────────────────────────────
    invoice_id_by_number: dict[str, str] = {}
    for row in payload["invoices"]:
        extracted = {
            "supplier_name": row["supplier_name"],
            "invoice_number": row["invoice_number"],
            "invoice_date": row["invoice_date"],
            "amount_ht": row["amount_ht"],
            "vat_rate": row["vat_rate"],
            "amount_vat": row["amount_vat"],
            "amount_ttc": row["amount_ttc"],
            "auto_liquidation": row["auto_liquidation"],
            "lines": row["lines"],
        }
        invoice = Invoice(
            user_id=user_id,
            is_seed=True,
            supplier_id=supplier_id_by_name[row["supplier_name"]],
            invoice_number=row["invoice_number"],
            invoice_date=_parse_date(row["invoice_date"]),
            amount_ht=row["amount_ht"],
            vat_rate=row["vat_rate"],
            amount_vat=row["amount_vat"],
            amount_ttc=row["amount_ttc"],
            auto_liquidation=row["auto_liquidation"],
            raw_text=row.get("raw_text"),
            extracted_data=extracted,
        )
        db.add(invoice)
        await db.flush()
        invoice_id_by_number[row["invoice_number"]] = invoice.id
        counts["invoices"] += 1

    # ── Quotes ──────────────────────────────────────────────────────────────
    quote_id_by_number: dict[str, str] = {}
    for row in payload["quotes"]:
        quote = Quote(
            user_id=user_id,
            is_seed=True,
            client_id=client_id_by_name[row["client_name"]],
            quote_number=row["quote_number"],
            title=row.get("title"),
            description=row.get("description"),
            lines=row.get("lines") or [],
            amount_ht=row.get("amount_ht"),
            vat_rate=row.get("vat_rate"),
            amount_ttc=row.get("amount_ttc"),
            status=row.get("status", "draft"),
            created_at=_to_datetime(row["created_at"]),
        )
        db.add(quote)
        await db.flush()
        quote_id_by_number[row["quote_number"]] = quote.id
        counts["quotes"] += 1

    # ── Emails ──────────────────────────────────────────────────────────────
    for row in payload["emails"]:
        related_client_id = (
            client_id_by_name.get(row["related_client_name"])
            if row.get("related_client_name")
            else None
        )
        related_supplier_id = (
            supplier_id_by_name.get(row["related_supplier_name"])
            if row.get("related_supplier_name")
            else None
        )
        related_quote_id = (
            quote_id_by_number.get(row["related_quote_number"])
            if row.get("related_quote_number")
            else None
        )
        related_invoice_id = (
            invoice_id_by_number.get(row["related_invoice_number"])
            if row.get("related_invoice_number")
            else None
        )
        to_email: Optional[str] = row.get("to_email")
        email = Email(
            user_id=user_id,
            is_seed=True,
            is_from_gmail=False,
            from_name=row.get("from_name"),
            from_email=row["from_email"],
            # Legacy Gmail column expects a JSON array as text; wrap the
            # single recipient so the existing read-path still works.
            to_emails=json.dumps([to_email]) if to_email else "[]",
            subject=row.get("subject"),
            body_plain=row.get("body"),
            received_at=_parse_datetime(row["received_at"]),
            category=row.get("category"),
            is_important=bool(row.get("is_important", False)),
            related_client_id=related_client_id,
            related_supplier_id=related_supplier_id,
            related_quote_id=related_quote_id,
            related_invoice_id=related_invoice_id,
        )
        db.add(email)
        counts["emails"] += 1

    await db.commit()
    return counts
