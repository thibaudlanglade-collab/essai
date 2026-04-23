"""Rapport Client orchestrator (brief §5.3 / Sprint 4).

Given a client + a free-form question, this service:

1. Loads the client (strict `user_id` scope).
2. Gathers every document in the prospect's DB that relates to that client:
   - `Quote.client_id == client.id`
   - `Email.related_client_id == client.id`
   - `Invoice` / `Extraction` whose `raw_text` or `extracted_data` mentions
     the client's name (the "wide net" pass agreed with Thibaud — catches
     documents the user never linked explicitly).
3. For each `ClientReportFolder` the prospect has configured, pulls the
   files from Google Drive, keeps only those whose filename mentions the
   client (fast path: no download for irrelevant files), downloads the
   survivors and extracts their text.
4. Feeds everything (capped) to the `answer_client_question` skill.
5. Resolves the source_ids cited by the LLM back into clickable references
   (`kind` + `id` + `label` + optional Drive URL).

Caps (hard-coded, can revisit if usage shows issues):
  * 40 docs max in the LLM context (the skill itself truncates to the same).
  * ~2200 chars per snippet (skill-side).
  * 30 Drive files scanned per folder.
  * 12 Drive files downloaded + extracted per folder (post filename filter).
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any, Optional

from sqlalchemy import String, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    Client,
    ClientReportFolder,
    Email,
    Extraction,
    Invoice,
    OAuthConnection,
    Quote,
    Supplier,
)
from services.crypto import decrypt_token, encrypt_token
from services.drive_service import (
    DriveServiceError,
    fetch_file_content,
    list_folder_files_recursive,
)
from skills.base import SkillResult
from skills.core import answer_client_question, extract_file_content

logger = logging.getLogger(__name__)


_MAX_QUOTES = 25
_MAX_EMAILS = 30
_MAX_WIDE_NET_INVOICES = 10
_MAX_WIDE_NET_EXTRACTIONS = 10
_MAX_DOCS_TO_LLM = 40
_DRIVE_FILES_SCANNED_PER_FOLDER = 30
_DRIVE_FILES_DOWNLOADED_PER_FOLDER = 12
_DRIVE_TEXT_CHARS_MAX = 2500

# Keyword-match filet (docs whose text mentions terms from the question)
_MAX_KEYWORD_EMAILS = 6
_MAX_KEYWORD_QUOTES = 4
_MAX_KEYWORD_INVOICES = 4
_MAX_KEYWORD_EXTRACTIONS = 4
_MAX_QUESTION_KEYWORDS = 3

# Question words + generic FR stop-words that are never useful as DB search
# terms. Kept minimal on purpose — if the user writes "croix rouge", we
# want "croix" and "rouge" to survive.
_QUESTION_STOPWORDS = frozenset({
    "alors", "aussi", "avec", "avoir", "avez", "avait", "aller",
    "bien", "bon", "cela", "celle", "celui", "cette", "chez",
    "combien", "comment", "dans", "depuis", "dire", "dit", "donc",
    "entre", "est-ce", "etre", "être", "faire", "fait", "faut",
    "leur", "leurs", "mais", "même", "mon", "nous", "notre", "nos",
    "parler", "parle", "parles", "pour", "pourquoi", "pouvoir",
    "quand", "quelle", "quelles", "quels", "quel", "quoi", "qu'est-ce",
    "résumez", "résumer", "résumé", "résume", "savoir", "sans",
    "selon", "son", "ses", "sous", "suis", "tout", "tous", "toutes",
    "toute", "vers", "voir", "votre", "vos", "vous", "est-elle",
    "est-il", "ont-ils", "client", "clients", "dossier", "dossiers",
    "document", "documents", "fichier", "fichiers", "infos",
    "information", "informations",
})


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


async def list_clients(db: AsyncSession, user_id: str) -> list[dict[str, Any]]:
    """List every client of the tenant (seed + prospect-created)."""
    result = await db.execute(
        select(Client)
        .where(Client.user_id == user_id)
        .order_by(Client.name.asc())
    )
    return [c.to_dict() for c in result.scalars().all()]


async def get_client(
    db: AsyncSession, user_id: str, client_id: str
) -> Optional[Client]:
    result = await db.execute(
        select(Client).where(
            Client.user_id == user_id,
            Client.id == client_id,
        )
    )
    return result.scalar_one_or_none()


async def ask_client_question(
    *,
    db: AsyncSession,
    user_id: str,
    client: Client,
    question: str,
) -> dict[str, Any]:
    """Aggregate context for `client`, call the LLM skill, resolve sources.

    Returns:
        {
          "answer": str,
          "sources": [{kind, source_id, id, label, url|None, date}],
          "confidence": float,
          "stats": {
            "quotes": int, "emails": int, "invoices": int,
            "extractions": int, "drive_files": int, "total_docs": int,
            "folders_searched": int,
          }
        }
    """
    client_name = client.name or ""
    context_docs: list[dict[str, Any]] = []
    source_index: dict[str, dict[str, Any]] = {}

    # ── 1. DB — explicit links ──────────────────────────────────────────────
    quote_docs = await _collect_quotes(db, user_id, client)
    email_docs = await _collect_emails(db, user_id, client)

    # ── 2. DB — wide net on invoices / extractions ──────────────────────────
    invoice_docs = await _collect_wide_net_invoices(db, user_id, client_name)
    extraction_docs = await _collect_wide_net_extractions(
        db, user_id, client_name, already_linked_ids=_ids_referenced_in_emails(email_docs)
    )

    # ── 2b. DB — keyword filet on the question's significant terms ──────────
    # Picks up documents whose text mentions terms like "croix rouge" even
    # when they are not tied to this client in the DB.
    already_source_ids = {
        d["source_id"]
        for group in (quote_docs, email_docs, invoice_docs, extraction_docs)
        for d in group
    }
    keyword_docs = await _collect_keyword_matches(
        db, user_id, question, client_name, already_source_ids
    )

    # ── 3. Drive folders the prospect configured ────────────────────────────
    question_keywords = _extract_question_keywords(question, client_name)
    drive_docs, folders_searched = await _collect_drive_docs(
        db, user_id, client_name, question_keywords
    )

    # ── 4. Merge + index ────────────────────────────────────────────────────
    for group in (quote_docs, email_docs, invoice_docs, extraction_docs, keyword_docs, drive_docs):
        for doc in group:
            source_index[doc["source_id"]] = doc
            context_docs.append(
                {
                    "source_id": doc["source_id"],
                    "kind": doc["kind"],
                    "title": doc.get("title") or "",
                    "date": doc.get("date"),
                    "metadata": doc.get("metadata") or {},
                    "snippet": doc.get("snippet") or "",
                }
            )

    # Respect hard cap before LLM
    if len(context_docs) > _MAX_DOCS_TO_LLM:
        context_docs = context_docs[:_MAX_DOCS_TO_LLM]

    # ── 5. Skill call ───────────────────────────────────────────────────────
    skill_result: SkillResult = await answer_client_question.execute(
        {
            "client_name": client_name,
            "client_type": client.type or "autre",
            "question": question,
            "context_docs": context_docs,
        },
        context=None,
    )

    if not skill_result.success:
        raise RuntimeError(skill_result.error or "answer_client_question failed")

    payload = skill_result.data or {}
    cited_ids: list[str] = list(payload.get("sources") or [])
    raw_summaries: list[dict[str, Any]] = list(payload.get("source_summaries") or [])
    summary_by_id: dict[str, str] = {
        str(s.get("source_id")): str(s.get("summary") or "")
        for s in raw_summaries
        if isinstance(s, dict) and s.get("source_id")
    }

    # ── 6. Resolve sources to public shape ──────────────────────────────────
    sources_public: list[dict[str, Any]] = []
    for source_id in cited_ids:
        doc = source_index.get(source_id)
        if doc is None:
            continue
        sources_public.append(
            {
                "source_id": source_id,
                "kind": doc["kind"],
                "id": doc.get("id"),
                "label": doc.get("label") or doc.get("title"),
                "url": doc.get("url"),
                "date": doc.get("date"),
                "summary": summary_by_id.get(source_id, ""),
            }
        )

    stats = {
        "quotes": len(quote_docs),
        "emails": len(email_docs),
        "invoices": len(invoice_docs),
        "extractions": len(extraction_docs),
        "drive_files": len(drive_docs),
        "total_docs": len(context_docs),
        "folders_searched": folders_searched,
    }

    return {
        "answer": payload.get("answer") or "",
        "sources": sources_public,
        "confidence": payload.get("confidence") or 0.0,
        "stats": stats,
    }


# ─────────────────────────────────────────────────────────────────────────────
# DB collectors
# ─────────────────────────────────────────────────────────────────────────────


async def _collect_quotes(
    db: AsyncSession, user_id: str, client: Client
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Quote)
        .where(Quote.user_id == user_id, Quote.client_id == client.id)
        .order_by(Quote.created_at.desc())
        .limit(_MAX_QUOTES)
    )
    out: list[dict[str, Any]] = []
    for q in result.scalars().all():
        snippet_parts: list[str] = []
        if q.description:
            snippet_parts.append(q.description)
        if q.lines:
            lines_txt: list[str] = []
            for line in (q.lines or []):
                label = line.get("label") or ""
                qty = line.get("quantity")
                unit = line.get("unit") or ""
                price = line.get("unit_price_ht")
                total = line.get("total_ht")
                lines_txt.append(
                    f"- {label} ({qty} {unit} × {price}€ HT = {total}€ HT)"
                )
            if lines_txt:
                snippet_parts.append("Lignes :\n" + "\n".join(lines_txt))
        snippet = "\n\n".join(snippet_parts)

        out.append(
            {
                "source_id": f"quote-{q.id}",
                "kind": "quote",
                "id": q.id,
                "title": f"Devis {q.quote_number or '?'} — {q.title or '(sans titre)'}",
                "label": q.quote_number or q.title or "Devis",
                "date": q.created_at.strftime("%Y-%m-%d") if q.created_at else None,
                "metadata": {
                    "quote_number": q.quote_number,
                    "statut": q.status,
                    "montant_ht": float(q.amount_ht) if q.amount_ht is not None else None,
                    "montant_ttc": float(q.amount_ttc) if q.amount_ttc is not None else None,
                },
                "snippet": snippet,
                "url": None,
            }
        )
    return out


async def _collect_emails(
    db: AsyncSession, user_id: str, client: Client
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Email)
        .where(Email.user_id == user_id, Email.related_client_id == client.id)
        .order_by(Email.received_at.desc())
        .limit(_MAX_EMAILS)
    )
    out: list[dict[str, Any]] = []
    for e in result.scalars().all():
        body = (e.body_plain or e.snippet or "").strip()
        out.append(
            {
                "source_id": f"email-{e.id}",
                "kind": "email",
                "id": e.id,
                "title": f"Email : {e.subject or '(sans objet)'}",
                "label": e.subject or f"Email du {e.received_at.strftime('%Y-%m-%d') if e.received_at else '?'}",
                "date": e.received_at.strftime("%Y-%m-%d") if e.received_at else None,
                "metadata": {
                    "de": e.from_email,
                    "categorie": e.category,
                    "important": bool(e.is_important),
                    "related_invoice_id": e.related_invoice_id,
                    "related_quote_id": e.related_quote_id,
                },
                "snippet": body,
                "url": None,
            }
        )
    return out


def _ids_referenced_in_emails(email_docs: list[dict[str, Any]]) -> set[str]:
    ids: set[str] = set()
    for e in email_docs:
        meta = e.get("metadata") or {}
        if meta.get("related_invoice_id"):
            ids.add(str(meta["related_invoice_id"]))
        if meta.get("related_quote_id"):
            ids.add(str(meta["related_quote_id"]))
    return ids


async def _collect_wide_net_invoices(
    db: AsyncSession, user_id: str, client_name: str
) -> list[dict[str, Any]]:
    """Invoices whose raw_text or extracted_data mentions the client's name.

    Useful mostly when the gérant extracts an invoice they emitted to the
    client (and uploaded it like any other doc). Supplier invoices that
    don't mention the client will not surface.
    """
    if not client_name:
        return []

    like_pattern = f"%{client_name}%"
    result = await db.execute(
        select(Invoice, Supplier.name)
        .join(Supplier, Invoice.supplier_id == Supplier.id, isouter=True)
        .where(
            Invoice.user_id == user_id,
            or_(
                Invoice.raw_text.ilike(like_pattern),
                cast(Invoice.extracted_data, String).ilike(like_pattern),
            ),
        )
        .order_by(Invoice.invoice_date.desc().nullslast())
        .limit(_MAX_WIDE_NET_INVOICES)
    )

    out: list[dict[str, Any]] = []
    for row in result.all():
        inv: Invoice = row[0]
        supplier_name: Optional[str] = row[1]
        snippet = (inv.raw_text or "")[:2200]
        out.append(
            {
                "source_id": f"invoice-{inv.id}",
                "kind": "invoice",
                "id": inv.id,
                "title": f"Facture {inv.invoice_number or '?'} — {supplier_name or 'fournisseur inconnu'}",
                "label": inv.invoice_number or "Facture",
                "date": inv.invoice_date.strftime("%Y-%m-%d") if inv.invoice_date else None,
                "metadata": {
                    "fournisseur": supplier_name,
                    "montant_ht": float(inv.amount_ht) if inv.amount_ht is not None else None,
                    "montant_ttc": float(inv.amount_ttc) if inv.amount_ttc is not None else None,
                    "auto_liquidation": bool(inv.auto_liquidation),
                },
                "snippet": snippet,
                "url": None,
            }
        )
    return out


def _extract_question_keywords(question: str, client_name: str) -> list[str]:
    """Pick the significant search terms from the user's question.

    - Lowercased, accent-preserved (ILIKE / substring match are case-blind).
    - Words of 4 chars or more.
    - Tokenises on apostrophes (curly and straight) so an elided article like
      "l'anatomie" yields the bare noun "anatomie" — matches the document no
      matter which apostrophe the user typed.
    - Strips the FR question / stop words (how, why, what, …) and words that
      are part of the client's own name (those are already covered by the
      other collectors).
    - Keeps the 3 longest distinct terms (more specific first).
    """
    if not question:
        return []
    normalized = question.replace("’", "'").replace("‘", "'")
    words = re.findall(r"[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\-]{3,}", normalized)
    client_tokens = set(_tokens_from_client_name(client_name))

    seen: set[str] = set()
    keywords: list[str] = []
    for w in words:
        lw = w.lower().strip("-")
        if len(lw) < 4 or lw in _QUESTION_STOPWORDS or lw in client_tokens:
            continue
        if lw in seen:
            continue
        seen.add(lw)
        keywords.append(lw)

    keywords.sort(key=len, reverse=True)
    return keywords[:_MAX_QUESTION_KEYWORDS]


async def _collect_keyword_matches(
    db: AsyncSession,
    user_id: str,
    question: str,
    client_name: str,
    already_source_ids: set[str],
) -> list[dict[str, Any]]:
    """DB search by keywords lifted from the question.

    Picks up e.g. emails / quotes / invoices / extractions whose text
    mentions terms like "croix rouge" even when they are not linked to
    the selected client. Deduplicates against `already_source_ids`.
    """
    keywords = _extract_question_keywords(question, client_name)
    if not keywords:
        return []

    like_clauses = [f"%{kw}%" for kw in keywords]

    def _or_ilike(col) -> Any:
        return or_(*[col.ilike(lc) for lc in like_clauses])

    out: list[dict[str, Any]] = []

    # Emails
    email_result = await db.execute(
        select(Email)
        .where(
            Email.user_id == user_id,
            or_(
                _or_ilike(Email.body_plain),
                _or_ilike(Email.subject),
                _or_ilike(Email.snippet),
            ),
        )
        .order_by(Email.received_at.desc())
        .limit(_MAX_KEYWORD_EMAILS)
    )
    for e in email_result.scalars().all():
        src = f"email-{e.id}"
        if src in already_source_ids:
            continue
        body = (e.body_plain or e.snippet or "").strip()
        out.append({
            "source_id": src,
            "kind": "email",
            "id": e.id,
            "title": f"Email : {e.subject or '(sans objet)'}",
            "label": e.subject or f"Email du {e.received_at.strftime('%Y-%m-%d') if e.received_at else '?'}",
            "date": e.received_at.strftime("%Y-%m-%d") if e.received_at else None,
            "metadata": {
                "de": e.from_email,
                "categorie": e.category,
                "match": "mot-clé de votre question",
            },
            "snippet": body,
            "url": None,
        })

    # Quotes
    quote_result = await db.execute(
        select(Quote)
        .where(
            Quote.user_id == user_id,
            or_(
                _or_ilike(Quote.title),
                _or_ilike(Quote.description),
                _or_ilike(Quote.source_text),
            ),
        )
        .order_by(Quote.created_at.desc())
        .limit(_MAX_KEYWORD_QUOTES)
    )
    for q in quote_result.scalars().all():
        src = f"quote-{q.id}"
        if src in already_source_ids:
            continue
        snippet = (q.description or q.source_text or "").strip()
        out.append({
            "source_id": src,
            "kind": "quote",
            "id": q.id,
            "title": f"Devis {q.quote_number or '?'} — {q.title or '(sans titre)'}",
            "label": q.quote_number or q.title or "Devis",
            "date": q.created_at.strftime("%Y-%m-%d") if q.created_at else None,
            "metadata": {
                "statut": q.status,
                "montant_ttc": float(q.amount_ttc) if q.amount_ttc is not None else None,
                "match": "mot-clé de votre question",
            },
            "snippet": snippet,
            "url": None,
        })

    # Invoices
    invoice_result = await db.execute(
        select(Invoice, Supplier.name)
        .join(Supplier, Invoice.supplier_id == Supplier.id, isouter=True)
        .where(
            Invoice.user_id == user_id,
            or_(
                _or_ilike(Invoice.raw_text),
                _or_ilike(cast(Invoice.extracted_data, String)),
                _or_ilike(Invoice.invoice_number),
            ),
        )
        .order_by(Invoice.invoice_date.desc().nullslast())
        .limit(_MAX_KEYWORD_INVOICES)
    )
    for row in invoice_result.all():
        inv: Invoice = row[0]
        src = f"invoice-{inv.id}"
        if src in already_source_ids:
            continue
        supplier_name: Optional[str] = row[1]
        snippet = (inv.raw_text or "")[:2200]
        out.append({
            "source_id": src,
            "kind": "invoice",
            "id": inv.id,
            "title": f"Facture {inv.invoice_number or '?'} — {supplier_name or 'fournisseur inconnu'}",
            "label": inv.invoice_number or "Facture",
            "date": inv.invoice_date.strftime("%Y-%m-%d") if inv.invoice_date else None,
            "metadata": {
                "fournisseur": supplier_name,
                "montant_ttc": float(inv.amount_ttc) if inv.amount_ttc is not None else None,
                "match": "mot-clé de votre question",
            },
            "snippet": snippet,
            "url": None,
        })

    # Extractions
    extraction_result = await db.execute(
        select(Extraction)
        .where(
            Extraction.user_id == user_id,
            or_(
                _or_ilike(Extraction.raw_text),
                _or_ilike(cast(Extraction.extracted_data, String)),
                _or_ilike(Extraction.original_filename),
            ),
        )
        .order_by(Extraction.created_at.desc())
        .limit(_MAX_KEYWORD_EXTRACTIONS)
    )
    for extraction in extraction_result.scalars().all():
        src = f"extraction-{extraction.id}"
        if src in already_source_ids:
            continue
        snippet = (extraction.raw_text or "")[:2200]
        out.append({
            "source_id": src,
            "kind": "extraction",
            "id": extraction.id,
            "title": extraction.original_filename or f"Document {extraction.document_type or ''}".strip(),
            "label": extraction.original_filename or "Document extrait",
            "date": extraction.created_at.strftime("%Y-%m-%d") if extraction.created_at else None,
            "metadata": {
                "type": extraction.document_type,
                "match": "mot-clé de votre question",
            },
            "snippet": snippet,
            "url": None,
        })

    return out


async def _collect_wide_net_extractions(
    db: AsyncSession,
    user_id: str,
    client_name: str,
    already_linked_ids: set[str],
) -> list[dict[str, Any]]:
    if not client_name:
        return []

    like_pattern = f"%{client_name}%"
    result = await db.execute(
        select(Extraction)
        .where(
            Extraction.user_id == user_id,
            or_(
                Extraction.raw_text.ilike(like_pattern),
                cast(Extraction.extracted_data, String).ilike(like_pattern),
            ),
        )
        .order_by(Extraction.created_at.desc())
        .limit(_MAX_WIDE_NET_EXTRACTIONS)
    )

    out: list[dict[str, Any]] = []
    for extraction in result.scalars().all():
        if extraction.id in already_linked_ids:
            continue
        snippet = (extraction.raw_text or "")[:2200]
        out.append(
            {
                "source_id": f"extraction-{extraction.id}",
                "kind": "extraction",
                "id": extraction.id,
                "title": extraction.original_filename or f"Document {extraction.document_type or ''}".strip(),
                "label": extraction.original_filename or "Document extrait",
                "date": extraction.created_at.strftime("%Y-%m-%d") if extraction.created_at else None,
                "metadata": {
                    "type": extraction.document_type,
                    "source": extraction.source_type,
                },
                "snippet": snippet,
                "url": None,
            }
        )
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Drive collectors
# ─────────────────────────────────────────────────────────────────────────────


def _tokens_from_client_name(name: str) -> list[str]:
    """Significant tokens to match against filenames.

    Drops stop-words and words shorter than 4 chars so we don't false-positive
    on filenames like "test.pdf" when the client is "M. Martin".
    """
    _STOP = {
        "les", "des", "une", "pour", "dans", "avec", "sur", "par", "est",
        "que", "qui", "pas", "plus", "vous", "nous", "mme", "mr", "mlle",
        "sci", "sarl", "sas", "sasu", "eurl", "copropriete", "residence",
        "the", "and", "for", "mairie", "mairie-de",
    }
    words = re.findall(r"[A-Za-zÀ-ÿ0-9]{4,}", name or "")
    tokens: list[str] = []
    for w in words:
        lw = w.lower()
        if lw in _STOP:
            continue
        tokens.append(lw)
    return tokens


def _filename_mentions_client(filename: str, client_name: str, tokens: list[str]) -> bool:
    f = (filename or "").lower()
    if not f:
        return False
    if client_name and client_name.lower() in f:
        return True
    return any(tok in f for tok in tokens)


_RELEVANCE_CHUNK_CHARS = 800


def _relevant_snippet(text: str, keywords: list[str], limit: int) -> str:
    """Pick the chunks of `text` most relevant to `keywords`, up to `limit` chars.

    Splits `text` on paragraph breaks, packs into ~800-char chunks, scores by
    keyword-hit count, and concatenates the best chunks in original order,
    separated by "…\\n\\n" markers. Falls back to the first `limit` chars if
    there are no keywords or no chunk matches any keyword — this keeps
    behaviour sane for questions like "résume ce dossier".
    """
    text = (text or "").strip()
    if not text or limit <= 0:
        return ""
    if len(text) <= limit or not keywords:
        return text[:limit]

    chunks: list[str] = []
    buf = ""
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        if len(para) > _RELEVANCE_CHUNK_CHARS:
            if buf:
                chunks.append(buf)
                buf = ""
            for i in range(0, len(para), _RELEVANCE_CHUNK_CHARS):
                chunks.append(para[i : i + _RELEVANCE_CHUNK_CHARS])
            continue
        if len(buf) + len(para) + 2 <= _RELEVANCE_CHUNK_CHARS:
            buf = (buf + "\n\n" + para) if buf else para
        else:
            if buf:
                chunks.append(buf)
            buf = para
    if buf:
        chunks.append(buf)

    if not chunks:
        return text[:limit]

    lowered = [k.lower() for k in keywords if k]
    if not lowered:
        return text[:limit]

    scored: list[tuple[int, int, str]] = []
    for idx, chunk in enumerate(chunks):
        low = chunk.lower()
        hits = sum(low.count(k) for k in lowered)
        if hits:
            scored.append((hits, idx, chunk))

    if not scored:
        return text[:limit]

    scored.sort(key=lambda t: (-t[0], t[1]))

    picked: list[tuple[int, str]] = []
    total = 0
    sep = "…\n\n"
    for _, idx, chunk in scored:
        cost = len(chunk) + (len(sep) if picked else 0)
        if total + cost > limit:
            continue
        picked.append((idx, chunk))
        total += cost

    if not picked:
        best = scored[0][2]
        return best[:limit]

    picked.sort(key=lambda t: t[0])
    return sep.join(chunk for _, chunk in picked)[:limit]


async def _collect_drive_docs(
    db: AsyncSession,
    user_id: str,
    client_name: str,
    question_keywords: list[str],
) -> tuple[list[dict[str, Any]], int]:
    """For each enabled ClientReportFolder, list + filter + download + extract.

    Folder listings run concurrently, and within each folder the fetch +
    extract of the matched files also runs concurrently (fetch is sync and
    is wrapped with `asyncio.to_thread`). The snippet kept per file is
    selected by keyword relevance against the user's question when possible.
    """
    folders = (
        await db.execute(
            select(ClientReportFolder).where(
                ClientReportFolder.user_id == user_id,
                ClientReportFolder.is_enabled.is_(True),
                ClientReportFolder.provider == "google_drive",
            )
        )
    ).scalars().all()

    if not folders:
        return [], 0

    connection = (
        await db.execute(
            select(OAuthConnection).where(
                OAuthConnection.user_id == user_id,
                OAuthConnection.provider == "google_drive",
            )
        )
    ).scalar_one_or_none()

    if connection is None:
        logger.info(
            "user=%s has %d ClientReportFolder(s) but no active Drive connection.",
            user_id,
            len(folders),
        )
        return [], 0

    try:
        access_plain = decrypt_token(connection.access_token)
        refresh_plain = (
            decrypt_token(connection.refresh_token)
            if connection.refresh_token
            else None
        )
    except Exception as exc:
        logger.warning("Drive token decrypt failed for user=%s: %s", user_id, exc)
        return [], 0

    scopes = json.loads(connection.scopes) if connection.scopes else []
    tokens = _tokens_from_client_name(client_name)

    logger.warning(
        "[rapport-client] client=%r tokens=%r question_keywords=%r folders=%d",
        client_name,
        tokens,
        question_keywords,
        len(folders),
    )

    # ── Fan out folder listing calls in parallel ───────────────────────────
    list_results = await asyncio.gather(
        *(
            asyncio.to_thread(
                list_folder_files_recursive,
                access_token=access_plain,
                refresh_token=refresh_plain,
                expires_at=connection.expires_at,
                scopes=scopes,
                folder_id=folder.folder_id,
                max_files=_DRIVE_FILES_SCANNED_PER_FOLDER,
                max_depth=3,
            )
            for folder in folders
        ),
        return_exceptions=True,
    )

    # Per-folder selection of files to download, using the two-tier filename
    # match (prioritise names that mention the client, backfill with the rest
    # so questions like "de quoi parle ce dossier" still work).
    per_folder_matches: list[tuple[Any, list[dict[str, Any]]]] = []
    for folder, result in zip(folders, list_results):
        if isinstance(result, Exception):
            logger.warning(
                "Drive list failed for folder=%s user=%s: %s",
                folder.folder_id,
                user_id,
                result,
            )
            continue
        files, refreshed = result
        if refreshed.token and refreshed.token != access_plain:
            access_plain = refreshed.token
            connection.access_token = encrypt_token(refreshed.token)
            if refreshed.expiry:
                connection.expires_at = refreshed.expiry

        named = [
            f for f in files
            if _filename_mentions_client(f.get("name") or "", client_name, tokens)
        ]
        named_ids = {f.get("id") for f in named}
        unnamed = [f for f in files if f.get("id") not in named_ids]
        picked = (named + unnamed)[:_DRIVE_FILES_DOWNLOADED_PER_FOLDER]
        logger.info(
            "[rapport-client] folder=%r listed=%d named=%d picked=%d names=%s",
            folder.folder_name or folder.folder_id,
            len(files),
            len(named),
            len(picked),
            [f.get("name") for f in picked],
        )
        per_folder_matches.append((folder, picked))

    # ── Fan out fetch+extract across all files of all folders in parallel ──
    fetch_tasks = []
    for folder, matches in per_folder_matches:
        for meta in matches:
            fetch_tasks.append(
                _fetch_and_extract_drive_file(
                    access_token=access_plain,
                    refresh_token=refresh_plain,
                    expires_at=connection.expires_at,
                    scopes=scopes,
                    meta=meta,
                    folder_label=folder.folder_name or folder.folder_id,
                    question_keywords=question_keywords,
                )
            )

    out: list[dict[str, Any]] = []
    if fetch_tasks:
        fetch_results = await asyncio.gather(*fetch_tasks)
        for doc, refreshed_token, refreshed_expiry in fetch_results:
            if refreshed_token and refreshed_token != access_plain:
                access_plain = refreshed_token
                connection.access_token = encrypt_token(refreshed_token)
                if refreshed_expiry:
                    connection.expires_at = refreshed_expiry
            if doc is not None:
                out.append(doc)

    # Commit the eventual refreshed access_token.
    await db.commit()

    return out, len(folders)


async def _fetch_and_extract_drive_file(
    *,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Any,
    scopes: list[str],
    meta: dict[str, Any],
    folder_label: str,
    question_keywords: list[str],
) -> tuple[Optional[dict[str, Any]], Optional[str], Any]:
    """Download + extract one Drive file. Safe to run concurrently.

    Returns `(doc_or_None, refreshed_access_token_or_None, refreshed_expiry_or_None)`.
    Failures (fetch error, empty text) return `(None, …)` so the caller can
    still pick up any token refresh that happened along the way.
    """
    file_id = meta["id"]
    name = meta.get("name") or file_id
    mime = meta.get("mimeType")

    try:
        raw_bytes, file_type_hint, creds = await asyncio.to_thread(
            fetch_file_content,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scopes=scopes,
            file_id=file_id,
            mime_type=mime,
        )
    except DriveServiceError as exc:
        logger.warning(
            "Drive fetch failed for file=%s mime=%s: %s",
            file_id,
            mime,
            exc,
        )
        return None, None, None

    refreshed_token = getattr(creds, "token", None)
    refreshed_expiry = getattr(creds, "expiry", None)

    extracted = await extract_file_content.execute(
        {"file_ref": raw_bytes, "file_type": file_type_hint},
        context=None,
    )
    text = ""
    if extracted.success and extracted.data:
        text = extracted.data.get("text") or ""

    full_text = (text or "").strip()
    snippet = _relevant_snippet(full_text, question_keywords, _DRIVE_TEXT_CHARS_MAX)
    low = full_text.lower()
    per_kw_hits = {kw: low.count(kw.lower()) for kw in question_keywords}
    logger.warning(
        "[rapport-client] drive file=%r text_chars=%d snippet_chars=%d kw_hits=%s",
        name,
        len(full_text),
        len(snippet),
        per_kw_hits,
    )
    if not snippet:
        # Scan PDF / image without vision fallback (Sprint 6) — skip
        # to avoid injecting empty context that wastes tokens.
        logger.info(
            "Drive file %s (%s) yielded empty text, skipped.",
            file_id,
            mime,
        )
        return None, refreshed_token, refreshed_expiry

    modified = meta.get("modifiedTime") or ""
    date_str = modified[:10] if modified else None

    doc = {
        "source_id": f"drive-{file_id}",
        "kind": "drive_file",
        "id": file_id,
        "title": f"Drive : {name}",
        "label": name,
        "date": date_str,
        "metadata": {
            "mimeType": meta.get("mimeType"),
            "folder": folder_label,
        },
        "snippet": snippet,
        "url": f"https://drive.google.com/file/d/{file_id}/view",
    }
    return doc, refreshed_token, refreshed_expiry
