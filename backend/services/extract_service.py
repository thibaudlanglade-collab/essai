"""Smart Extract orchestrator (brief §5.1).

Thin glue that chains the existing planner-compatible skills:

    extract_file_content
         └── gives us `{text, page_count, needs_vision}` or `{image_bytes}`
    classify_document_type
         └── gives us `{document_type, vendor, date, amount, currency,
                         document_number, suggested_filename, confidence}`
    extract_structured_data   (only when document_type == "facture")
         └── gives us the full BTP invoice payload matching the target schema
    suggest_btp_classement
         └── gives us `{suggested_folder, suggested_filename}` at the brief §6.1 schema

This replaces the former monolithic one-call approach. Benefits:
  * every step is a reusable `skills/core/*` module (same ones the planner
    sees), so new features (Email→Devis, Rapport Client, Agent…) reuse
    exactly these bricks instead of reinventing;
  * each skill is individually loggable, retriable, and replaceable;
  * ~40% token saving vs a single GPT-4o vision call that was asked to
    classify + extract + format all at once.

The caller (api/extract.py) is responsible for persisting the returned
payload and scoping it by `user_id`.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from skills.base import SkillResult
from skills.core import (
    classify_document_type,
    extract_file_content,
    extract_structured_data,
    suggest_btp_classement,
)

logger = logging.getLogger(__name__)


class ExtractError(Exception):
    """Raised when the chain cannot produce a usable payload."""


# BTP invoice schema handed to extract_structured_data. Designed so every
# field the frontend shows in the review panel round-trips cleanly.
_BTP_INVOICE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "supplier_name": {"type": "string"},
        "supplier_siret": {
            "type": "string",
            "description": "14 chiffres, ou null si non visible.",
        },
        "invoice_number": {"type": "string"},
        "invoice_date": {
            "type": "string",
            "description": "YYYY-MM-DD.",
        },
        "amount_ht": {"type": "number"},
        "vat_rate": {
            "type": "number",
            "description": (
                "Taux TVA en décimal (0.20, 0.10, 0.055, 0 pour auto-liquidation)."
            ),
        },
        "amount_vat": {"type": "number"},
        "amount_ttc": {"type": "number"},
        "auto_liquidation": {
            "type": "boolean",
            "description": (
                "True si le document mentionne 'auto-liquidation' ou "
                "'TVA due par le preneur' (sous-traitance BTP, art. 283-2 nonies CGI)."
            ),
        },
        "lines": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "quantity": {"type": "number"},
                    "unit": {"type": "string"},
                    "unit_price_ht": {"type": "number"},
                    "total_ht": {"type": "number"},
                },
            },
        },
        "currency": {"type": "string"},
    },
    "required": ["supplier_name"],
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


async def extract_document(
    *,
    raw_text: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict[str, Any]:
    """Run the Smart Extract chain on either pasted text or a raw file.

    Exactly one of `raw_text` / `file_bytes` must be provided. Returns a
    dict with the shape the router persists on `Extraction`:

        {
          "source_type": "text" | "pdf" | "image",
          "raw_text":        str,
          "document_type":   "invoice" | "contract" | "note" | "other",
          "summary":         str,
          "confidence":      float,
          "extracted_data":  dict,
          "suggested_folder": str,
          "suggested_filename": str,
        }
    """
    if bool(raw_text) == bool(file_bytes):
        raise ExtractError("extract_document: fournir exactement un de raw_text / file_bytes.")

    # ── 1. Read the content ────────────────────────────────────────────────
    source_type, text_for_storage = await _read_content(
        raw_text=raw_text,
        file_bytes=file_bytes,
        mime_type=mime_type,
        filename=filename,
    )

    if not text_for_storage.strip():
        # Scanned PDF without OCR layer, or empty text. We could fall back
        # to vision here — volontairement reporté pour Sprint 3.5 : le
        # classify_document_type skill n'accepte que du texte, donc sans
        # OCR le document sort en 'other' with low confidence.
        raise ExtractError(
            "Aucun texte n'a pu être lu dans ce document. Si c'est un PDF "
            "scanné, ajoutez une couche OCR avant de réessayer."
        )

    # ── 2. Classify the document ───────────────────────────────────────────
    classification = await _run(
        classify_document_type,
        {"text_content": text_for_storage, "filename": filename or ""},
        label="classify_document_type",
    )

    doc_type_fr: str = classification.get("document_type") or "autre"
    vendor: Optional[str] = classification.get("vendor") or None
    document_date: Optional[str] = classification.get("date") or None
    amount_from_clf: Any = classification.get("amount")
    currency: Optional[str] = classification.get("currency") or None
    document_number: Optional[str] = classification.get("document_number") or None
    reasoning: str = classification.get("reasoning") or ""
    confidence: float = float(classification.get("confidence") or 0.0)

    # ── 3. For invoices, extract the full BTP schema ───────────────────────
    extracted_data: dict[str, Any]
    if doc_type_fr == "facture":
        structured = await _run(
            extract_structured_data,
            {
                "content_ref": text_for_storage,
                "content_type": "text",
                "target_schema": _BTP_INVOICE_SCHEMA,
                "context_hint": (
                    "Facture d'un fournisseur BTP français (Point P, SAMSE, Rexel, "
                    "Kiloutou, etc.). Les montants sont en euros. Si le document "
                    "mentionne 'auto-liquidation' ou 'TVA due par le preneur', "
                    "auto_liquidation=true et vat_rate=0."
                ),
            },
            label="extract_structured_data",
        )
        extracted_data = _merge_invoice_data(
            structured,
            classification_fallback={
                "supplier_name": vendor,
                "invoice_number": document_number,
                "invoice_date": document_date,
                "amount_ttc": amount_from_clf,
                "currency": currency,
            },
        )
    else:
        # Non-invoice: keep the classification fields + let the frontend
        # display what is relevant.
        extracted_data = {
            "vendor": vendor,
            "date": document_date,
            "amount": amount_from_clf,
            "currency": currency,
            "document_number": document_number,
            "reasoning": reasoning,
        }

    # ── 4. Compute the suggested classement (deterministic) ────────────────
    classement = await _run(
        suggest_btp_classement,
        {
            "document_type": doc_type_fr,
            "vendor": extracted_data.get("supplier_name") or vendor,
            "document_date": extracted_data.get("invoice_date") or document_date,
            "amount_ttc": extracted_data.get("amount_ttc") or amount_from_clf,
            "currency": extracted_data.get("currency") or currency,
            "document_number": extracted_data.get("invoice_number") or document_number,
            "original_filename": filename or "",
        },
        label="suggest_btp_classement",
    )

    # Canonical UI type comes out of suggest_btp_classement (it maps FR→EN).
    ui_doc_type: str = classement.get("document_type") or "other"

    # ── 5. Build a short human summary ─────────────────────────────────────
    summary = _compose_summary(
        doc_type_fr=doc_type_fr,
        vendor=extracted_data.get("supplier_name") or vendor,
        amount_ttc=extracted_data.get("amount_ttc") or amount_from_clf,
        currency=extracted_data.get("currency") or currency or "EUR",
        reasoning=reasoning,
    )

    return {
        "source_type": source_type,
        "raw_text": text_for_storage,
        "document_type": ui_doc_type,
        "summary": summary,
        "confidence": confidence,
        "extracted_data": extracted_data,
        "suggested_folder": classement.get("suggested_folder") or "Autres/",
        "suggested_filename": (
            classement.get("suggested_filename")
            or (filename or "document.pdf")
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Step helpers
# ─────────────────────────────────────────────────────────────────────────────


async def _run(skill_module, args: dict, *, label: str) -> dict:
    """Call a skill's `execute` and unwrap the `SkillResult`, raising on failure."""
    result: SkillResult = await skill_module.execute(args, context=None)
    if not result.success:
        raise ExtractError(f"{label} a échoué : {result.error}")
    data = result.data or {}
    if not isinstance(data, dict):
        raise ExtractError(
            f"{label} a retourné un type inattendu: {type(data).__name__}"
        )
    return data


async def _read_content(
    *,
    raw_text: Optional[str],
    file_bytes: Optional[bytes],
    mime_type: Optional[str],
    filename: Optional[str],
) -> tuple[str, str]:
    """Return (source_type, text_for_storage)."""
    if raw_text is not None:
        return "text", raw_text.strip()

    assert file_bytes is not None
    mime = (mime_type or "").lower()
    lower_name = (filename or "").lower()

    if mime == "application/pdf" or lower_name.endswith(".pdf"):
        file_type = "pdf"
    elif mime.startswith("image/") or lower_name.endswith(
        (".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic")
    ):
        file_type = "image"
    else:
        file_type = "auto"

    file_result: SkillResult = await extract_file_content.execute(
        {"file_ref": file_bytes, "file_type": file_type},
        context=None,
    )
    if not file_result.success:
        raise ExtractError(f"extract_file_content a échoué : {file_result.error}")

    data = file_result.data or {}
    resolved_type = (file_result.debug or {}).get("file_type_used") or file_type

    if resolved_type == "pdf":
        return "pdf", str(data.get("text") or "")
    if resolved_type == "image":
        image_bytes = data.get("image_bytes")
        image_format = str(data.get("format") or "jpeg")
        if not isinstance(image_bytes, bytes):
            raise ExtractError("extract_file_content: image_bytes manquant.")
        text = await _ocr_image(image_bytes, image_format)
        if not text.strip():
            raise ExtractError(
                "Aucun texte n'a pu être lu dans cette photo. "
                "Essayez une photo plus nette ou mieux cadrée."
            )
        return "image", text
    # Plain text / docx
    return "text", str(data.get("text") or "")


async def _ocr_image(image_bytes: bytes, image_format: str) -> str:
    """Transcribe all visible text in a photo via GPT-4o vision."""
    import base64 as _b64
    import re as _re

    from openai import AsyncOpenAI

    import config as _config

    mime = "image/jpeg" if image_format in ("jpeg", "jpg") else "image/png"
    b64 = _b64.b64encode(image_bytes).decode("ascii")
    client = AsyncOpenAI(api_key=_config.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model="gpt-4o",
        temperature=0.0,
        max_tokens=4096,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un outil d'OCR haute fidélité. Tu lis une photo "
                    "(note manuscrite, ticket, tableau, formulaire, facture) "
                    "et tu retournes TOUT le texte lisible en respectant la mise "
                    "en page d'origine.\n\n"
                    "RÈGLES STRICTES :\n"
                    "1. Jamais de markdown, jamais de ``` ni de **gras** ni de titres ##.\n"
                    "2. Pour un tableau : UNE ligne par rangée, colonnes séparées "
                    "par une tabulation (\\t). Inclure la ligne d'en-tête en premier.\n"
                    "3. Pour du texte courant : sauts de ligne conservés.\n"
                    "4. Pour les listes : tiret - en début de ligne.\n"
                    "5. Ne jamais inventer un contenu illisible. Si un mot est "
                    "ambigu, retourne la graphie la plus probable sans annotation.\n"
                    "6. N'ajoute aucun commentaire, aucun 'voici le texte'."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Transcris tout le texte visible dans cette image."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"},
                    },
                ],
            },
        ],
    )
    raw = (response.choices[0].message.content or "").strip()
    # Strip any lingering markdown code fences just in case.
    raw = _re.sub(r"^```[a-zA-Z]*\s*\n?", "", raw)
    raw = _re.sub(r"\n?```\s*$", "", raw)
    return raw.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Payload shaping
# ─────────────────────────────────────────────────────────────────────────────


def _merge_invoice_data(
    structured: dict[str, Any],
    *,
    classification_fallback: dict[str, Any],
) -> dict[str, Any]:
    """Merge the detailed extract_structured_data output with the lighter
    classification result, preferring the structured values and falling
    back to classification when a field is missing.
    """
    merged = dict(structured) if isinstance(structured, dict) else {}
    for key, fallback in classification_fallback.items():
        if merged.get(key) in (None, "", []):
            merged[key] = fallback
    merged.setdefault("currency", "EUR")
    merged.setdefault("auto_liquidation", False)
    merged.setdefault("lines", [])
    return merged


def _compose_summary(
    *,
    doc_type_fr: str,
    vendor: Optional[str],
    amount_ttc: Any,
    currency: str,
    reasoning: str,
) -> str:
    if doc_type_fr == "facture" and vendor:
        if amount_ttc is not None:
            try:
                amt = float(amount_ttc)
                return (
                    f"Facture de {vendor} pour un montant TTC de {amt:.2f} {currency}."
                )
            except (TypeError, ValueError):
                pass
        return f"Facture de {vendor}."

    if doc_type_fr == "contrat" and vendor:
        return f"Contrat avec {vendor}."

    if reasoning:
        return reasoning[:200]

    return f"Document identifié comme {doc_type_fr}."
