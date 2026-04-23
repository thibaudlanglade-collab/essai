"""Quote service (Sprint 3).

Pure helpers around the `quotes` table: numbering, totals recomputation,
and PDF rendering. DB access is scoped by `user_id` everywhere — the caller
(API route) is responsible for loading the session context.
"""
from __future__ import annotations

import io
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import AccessToken, Client, Quote

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Numbering
# ─────────────────────────────────────────────────────────────────────────────

_QUOTE_NUM_RE = re.compile(r"^DEV-(\d{4})-(\d{3,6})$")


async def next_quote_number(db: AsyncSession, user_id: str, *, year: Optional[int] = None) -> str:
    """Return the next `DEV-YYYY-NNN` number for this tenant and year.

    Sequence is isolated per user_id, so two prospects never collide. Gaps
    (from deleted devis) are left as-is: we always take max(seq)+1.
    """
    if year is None:
        year = datetime.utcnow().year
    prefix = f"DEV-{year}-"

    res = await db.execute(
        select(Quote.quote_number)
        .where(
            Quote.user_id == user_id,
            Quote.quote_number.like(f"{prefix}%"),
        )
    )

    max_seq = 0
    for (number,) in res.all():
        if not number:
            continue
        match = _QUOTE_NUM_RE.match(number)
        if not match or int(match.group(1)) != year:
            continue
        try:
            max_seq = max(max_seq, int(match.group(2)))
        except (TypeError, ValueError):
            continue

    return f"{prefix}{max_seq + 1:03d}"


# ─────────────────────────────────────────────────────────────────────────────
# Totals recomputation
# ─────────────────────────────────────────────────────────────────────────────


def sanitize_lines(lines: Any) -> list[dict[str, Any]]:
    """Normalise a list of quote lines coming from the frontend or the skill.

    Each resulting line has: label (str, trimmed), quantity (float, >= 0),
    unit (str), unit_price_ht (float, >= 0), total_ht (float, = qty * pu).

    Invalid or blank lines are dropped silently.
    """
    if not isinstance(lines, list):
        return []

    cleaned: list[dict[str, Any]] = []
    for raw in lines:
        if not isinstance(raw, dict):
            continue
        label = str(raw.get("label") or "").strip()
        if not label:
            continue
        try:
            qty = float(raw.get("quantity") or 0)
        except (TypeError, ValueError):
            qty = 0.0
        if qty < 0:
            qty = 0.0
        unit = str(raw.get("unit") or "").strip() or "u"
        try:
            pu = float(raw.get("unit_price_ht") or 0)
        except (TypeError, ValueError):
            pu = 0.0
        if pu < 0:
            pu = 0.0
        cleaned.append({
            "label": label[:255],
            "quantity": round(qty, 4),
            "unit": unit[:20],
            "unit_price_ht": round(pu, 2),
            "total_ht": round(qty * pu, 2),
        })
    return cleaned


def compute_totals(lines: list[dict[str, Any]], vat_rate: float) -> tuple[float, float]:
    """Return (amount_ht, amount_ttc) from a sanitised list of lines."""
    amount_ht = round(sum(line.get("total_ht") or 0 for line in lines), 2)
    amount_ttc = round(amount_ht * (1 + (vat_rate or 0)), 2)
    return amount_ht, amount_ttc


# ─────────────────────────────────────────────────────────────────────────────
# PDF rendering
# ─────────────────────────────────────────────────────────────────────────────


_ACCENT = "#4c1d95"  # deep violet
_ACCENT_LIGHT = "#ede9fe"
_ACCENT_BORDER = "#c4b5fd"
_MUTED = "#6b7280"
_ROW_ALT = "#faf9fb"


def render_quote_pdf(
    quote: Quote,
    *,
    issuer: AccessToken,
    client: Optional[Client] = None,
    validity_days: int = 30,
) -> bytes:
    """Render a devis to a polished PDF byte string.

    Layout :
      ┌─ Bandeau haut : nom société (gros, accent) + coordonnées | cartouche
      │                 devis N° / date / validité / statut
      ├─ Cartouche "À l'attention de" (client, si présent)
      ├─ Titre du devis + description
      ├─ Tableau des lignes (zébré, en-tête violet)
      ├─ Totaux à droite (HT, TVA, TTC accentué)
      ├─ Conditions de paiement + validité
      ├─ Bloc signature "Bon pour accord"
      └─ Mentions légales en pied
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        KeepTogether,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title=f"Devis {quote.quote_number or quote.id}",
        author=issuer.company_name or issuer.prospect_name or "Synthèse",
    )

    base = getSampleStyleSheet()
    styles = {
        "company": ParagraphStyle(
            "company", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=18, leading=21, textColor=colors.HexColor(_ACCENT),
        ),
        "muted": ParagraphStyle(
            "muted", parent=base["Normal"], fontSize=8, leading=11,
            textColor=colors.HexColor(_MUTED),
        ),
        "normal": ParagraphStyle(
            "normal", parent=base["Normal"], fontSize=9, leading=12,
        ),
        "bold": ParagraphStyle(
            "bold", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, leading=12,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, leading=13, textColor=colors.HexColor(_ACCENT),
            spaceBefore=2, spaceAfter=3,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=13, leading=16, textColor=colors.HexColor("#1f2937"),
        ),
        "devis_label": ParagraphStyle(
            "devis_label", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, leading=13, textColor=colors.HexColor(_ACCENT),
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontSize=7, leading=9,
            textColor=colors.HexColor(_MUTED),
        ),
    }

    story: list[Any] = []

    # ── Top band : issuer on left, devis cartouche on right ─────────────────
    issuer_name = issuer.company_name or issuer.prospect_name or "Votre société"
    issuer_lines: list[str] = []
    if issuer.company_sector:
        issuer_lines.append(issuer.company_sector)
    if issuer.prospect_email:
        issuer_lines.append(issuer.prospect_email)
    issuer_meta_html = "<br/>".join(issuer_lines) if issuer_lines else "&nbsp;"

    issuer_col = [
        Paragraph(issuer_name, styles["company"]),
        Paragraph(issuer_meta_html, styles["muted"]),
    ]

    created = quote.created_at or datetime.utcnow()
    validity = created + timedelta(days=validity_days)
    status_label = _status_label(quote.status)

    devis_rows = [
        [Paragraph("DEVIS", styles["devis_label"])],
        [Paragraph(
            f"<b>N°</b> {quote.quote_number or '(brouillon)'}<br/>"
            f"<b>Date :</b> {created.strftime('%d/%m/%Y')}<br/>"
            f"<b>Validité :</b> {validity.strftime('%d/%m/%Y')}<br/>"
            f"<b>Statut :</b> {status_label}",
            styles["normal"],
        )],
    ]
    devis_cartouche = Table(devis_rows, colWidths=[6.5 * cm])
    devis_cartouche.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor(_ACCENT_LIGHT)),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(_ACCENT_BORDER)),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor(_ACCENT_BORDER)),
    ]))

    top_band = Table([[issuer_col, devis_cartouche]], colWidths=[11.1 * cm, 6.5 * cm])
    top_band.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(top_band)
    story.append(Spacer(1, 0.6 * cm))

    # Accent separator
    sep = Table([[""]], colWidths=[17.6 * cm], rowHeights=[0.05 * cm])
    sep.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(_ACCENT)),
    ]))
    story.append(sep)
    story.append(Spacer(1, 0.4 * cm))

    # ── Client block ────────────────────────────────────────────────────────
    if client is not None:
        client_html_lines = [f"<b>{client.name}</b>"]
        if client.address:
            client_html_lines.append(client.address.replace("\n", "<br/>"))
        contact_bits = []
        if client.email:
            contact_bits.append(client.email)
        if client.phone:
            contact_bits.append(client.phone)
        if contact_bits:
            client_html_lines.append(" · ".join(contact_bits))

        client_card = Table(
            [
                [Paragraph("À l'attention de", styles["section"])],
                [Paragraph("<br/>".join(client_html_lines), styles["normal"])],
            ],
            colWidths=[8.5 * cm],
        )
        client_card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
        ]))
        story.append(client_card)
        story.append(Spacer(1, 0.5 * cm))

    # ── Title + description ─────────────────────────────────────────────────
    if quote.title:
        story.append(Paragraph(quote.title, styles["title"]))
        story.append(Spacer(1, 0.15 * cm))
    if quote.description:
        story.append(Paragraph(
            quote.description.replace("\n", "<br/>"), styles["normal"],
        ))
        story.append(Spacer(1, 0.4 * cm))
    else:
        story.append(Spacer(1, 0.2 * cm))

    # ── Lines table ─────────────────────────────────────────────────────────
    rows: list[list[Any]] = [[
        Paragraph("<b>Désignation</b>", styles["normal"]),
        Paragraph("<b>Qté</b>", styles["normal"]),
        Paragraph("<b>Unité</b>", styles["normal"]),
        Paragraph("<b>P.U. HT</b>", styles["normal"]),
        Paragraph("<b>Total HT</b>", styles["normal"]),
    ]]
    for line in (quote.lines or []):
        label = str(line.get("label") or "")
        qty = line.get("quantity") or 0
        unit = str(line.get("unit") or "")
        pu = line.get("unit_price_ht") or 0
        total = line.get("total_ht") or 0
        rows.append([
            Paragraph(label, styles["normal"]),
            _fmt_num(qty),
            unit,
            f"{_fmt_num(pu, 2)} €",
            f"{_fmt_num(total, 2)} €",
        ])

    lines_table = Table(
        rows,
        colWidths=[8.4 * cm, 1.8 * cm, 1.6 * cm, 2.6 * cm, 2.6 * cm],
        repeatRows=1,
    )
    # Build zebra style
    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(_ACCENT)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (2, 1), (2, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
    ]
    for idx in range(1, len(rows)):
        if idx % 2 == 0:
            table_style.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor(_ROW_ALT)))
    lines_table.setStyle(TableStyle(table_style))
    story.append(lines_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Totals card on the right ────────────────────────────────────────────
    vat_rate = float(quote.vat_rate) if quote.vat_rate is not None else 0.10
    amount_ht = float(quote.amount_ht) if quote.amount_ht is not None else 0.0
    amount_ttc = (
        float(quote.amount_ttc) if quote.amount_ttc is not None
        else round(amount_ht * (1 + vat_rate), 2)
    )
    amount_vat = round(amount_ttc - amount_ht, 2)

    totals_rows = [
        ["Total HT", f"{_fmt_num(amount_ht, 2)} €"],
        [f"TVA ({_fmt_num(vat_rate * 100, 1)} %)", f"{_fmt_num(amount_vat, 2)} €"],
        ["Total TTC", f"{_fmt_num(amount_ttc, 2)} €"],
    ]
    totals_table = Table(totals_rows, colWidths=[4.2 * cm, 3 * cm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, 1), 9),
        ("FONTSIZE", (0, 2), (-1, 2), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("FONTNAME", (0, 2), (-1, 2), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 2), (-1, 2), colors.white),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor(_ACCENT)),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, colors.HexColor("#e5e7eb")),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 0.7 * cm))

    # ── Payment conditions + signature (kept together) ──────────────────────
    conditions_para = Paragraph(
        "<b>Conditions de paiement</b><br/>"
        "Acompte de 30 % à la signature du devis.<br/>"
        "Solde à la réception des travaux.<br/>"
        f"Devis valable jusqu'au {validity.strftime('%d/%m/%Y')}.",
        styles["normal"],
    )
    signature_para = Paragraph(
        "<b>Bon pour accord</b><br/><br/>"
        "Date : ____ / ____ / ________<br/><br/>"
        "Signature précédée de la mention<br/>"
        "« Bon pour accord »",
        styles["normal"],
    )

    footer_block = Table(
        [[conditions_para, signature_para]],
        colWidths=[10 * cm, 7.6 * cm],
    )
    footer_block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (0, 0), 0.4, colors.HexColor("#e5e7eb")),
        ("BOX", (1, 0), (1, 0), 0.4, colors.HexColor(_ACCENT_BORDER)),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#fafafa")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor(_ACCENT_LIGHT)),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(KeepTogether(footer_block))
    story.append(Spacer(1, 0.6 * cm))

    # ── Legal footer ────────────────────────────────────────────────────────
    legal = (
        "En cas de retard de paiement, des pénalités calculées au taux prévu par la loi "
        "en vigueur seront exigibles de plein droit, majorées d'une indemnité forfaitaire "
        "de 40 € pour frais de recouvrement (article L441-10 du Code de commerce). "
        "Le présent devis a valeur contractuelle une fois signé par les deux parties."
    )
    story.append(Paragraph(legal, styles["footer"]))

    doc.build(story)
    return buffer.getvalue()


def _status_label(status: Optional[str]) -> str:
    mapping = {
        "draft": "Brouillon",
        "sent": "Envoyé",
        "accepted": "Accepté",
        "refused": "Refusé",
    }
    return mapping.get(status or "", (status or "").capitalize())


def _fmt_num(value: Any, decimals: int = 0) -> str:
    """Format a number with French thousands + comma separator."""
    try:
        num = float(value)
    except (TypeError, ValueError):
        return "0"
    if decimals == 0 and num == int(num):
        return f"{int(num):,}".replace(",", " ")
    return f"{num:,.{decimals}f}".replace(",", " ").replace(".", ",")
