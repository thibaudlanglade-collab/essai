"""
FastAPI router: /api/dashboard — live signals that surface what needs the
prospect's attention right now. Used by the Radar widget on the dashboard
home.

Every endpoint is scoped to the authenticated prospect's user_id.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, Client, Email, Invoice, Quote

logger = logging.getLogger(__name__)

dashboard_router = APIRouter(prefix="/dashboard")


@dashboard_router.get("/radar")
async def radar(
    user: AccessToken = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return 4 actionable live signals for the user's landing page.

    Signals are ordered by severity (critical → info). Each signal has:
      - key: stable id for keying in the UI
      - severity: "critical" | "warning" | "info"
      - title: main headline
      - detail: second line with the concrete numbers
      - count: the headline number
      - to: route to dive in
      - icon: lucide-react icon name
    """
    today = datetime.utcnow()
    today_d = today.date()

    signals: list[dict[str, Any]] = []

    # ── 1. Devis envoyés depuis plus de 14 jours — à relancer ────────────
    cutoff_quote = today - timedelta(days=14)
    pending_quotes = (
        await db.execute(
            select(Quote)
            .where(
                and_(
                    Quote.user_id == user.id,
                    Quote.status == "sent",
                    Quote.created_at < cutoff_quote,
                )
            )
            .order_by(Quote.created_at)
        )
    ).scalars().all()

    if pending_quotes:
        total_amount = sum(float(q.amount_ht or 0) for q in pending_quotes)
        oldest = pending_quotes[0]
        oldest_days = (today - oldest.created_at).days if oldest.created_at else 0
        signals.append({
            "key": "pending_quotes",
            "severity": "warning",
            "title": f"{len(pending_quotes)} devis en attente de réponse",
            "detail": (
                f"{total_amount:,.0f} € HT total • le plus ancien : {oldest_days}j"
            ).replace(",", " "),
            "count": len(pending_quotes),
            "to": "/dashboard/devis",
            "icon": "Clock",
        })

    # ── 2. Emails urgents non lus ────────────────────────────────────────
    urgent_unread = (
        await db.execute(
            select(func.count(Email.id)).where(
                and_(
                    Email.user_id == user.id,
                    Email.is_read.is_(False),
                    Email.priority == "urgent",
                )
            )
        )
    ).scalar_one() or 0

    if urgent_unread > 0:
        signals.append({
            "key": "urgent_emails",
            "severity": "critical",
            "title": f"{urgent_unread} email{'s' if urgent_unread > 1 else ''} urgent{'s' if urgent_unread > 1 else ''} à lire",
            "detail": "Classés « urgent » par l'IA, non ouverts.",
            "count": urgent_unread,
            "to": "/dashboard/emails",
            "icon": "AlertCircle",
        })

    # ── 3. Factures fournisseurs reçues ce mois ──────────────────────────
    month_start = today_d.replace(day=1)
    invoices_rows = (
        await db.execute(
            select(Invoice.amount_ht, Invoice.amount_ttc).where(
                and_(
                    Invoice.user_id == user.id,
                    Invoice.invoice_date >= month_start,
                )
            )
        )
    ).all()
    if invoices_rows:
        total_ht = sum(float(r[0] or 0) for r in invoices_rows)
        signals.append({
            "key": "invoices_month",
            "severity": "info",
            "title": f"{len(invoices_rows)} facture{'s' if len(invoices_rows) > 1 else ''} reçue{'s' if len(invoices_rows) > 1 else ''} ce mois",
            "detail": f"{total_ht:,.0f} € HT à traiter".replace(",", " "),
            "count": len(invoices_rows),
            "to": "/dashboard/extract",
            "icon": "Receipt",
        })

    # ── 4. Clients actifs sur les 30 derniers jours (via emails) ─────────
    cutoff_activity = today - timedelta(days=30)
    recent_clients = (
        await db.execute(
            select(func.count(func.distinct(Email.from_email))).where(
                and_(
                    Email.user_id == user.id,
                    Email.received_at >= cutoff_activity,
                )
            )
        )
    ).scalar_one() or 0

    total_clients = (
        await db.execute(
            select(func.count(Client.id)).where(Client.user_id == user.id)
        )
    ).scalar_one() or 0

    if total_clients > 0:
        signals.append({
            "key": "activity",
            "severity": "info",
            "title": f"{total_clients} client{'s' if total_clients > 1 else ''} au total",
            "detail": (
                f"{recent_clients} interlocuteur{'s' if recent_clients > 1 else ''} "
                f"distinct{'s' if recent_clients > 1 else ''} sur 30j"
            ),
            "count": total_clients,
            "to": "/dashboard/clients",
            "icon": "Users",
        })

    # Severity order: critical → warning → info
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    signals.sort(key=lambda s: severity_order.get(s["severity"], 99))

    return {"signals": signals, "generated_at": today.isoformat()}
