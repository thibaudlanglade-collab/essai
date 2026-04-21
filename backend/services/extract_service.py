"""Smart Extract service (brief §5.1).

Single LLM call that, given a document (image bytes / PDF text / pasted text):
1. Classifies the document (invoice | contract | note | other).
2. Extracts the per-type fields the prospect is most likely to care about.
3. Suggests a target folder and a tidy filename.

Returned payload is validated, portable JSON ready to be stored in
`extractions.extracted_data` and surfaced in the editable side panel.

This is deliberately ONE call rather than a chain of classify→extract
skills: extraction quality is materially better when the same model has
full context, and the latency budget matters on the upload UX.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import re
from datetime import datetime
from typing import Any, Optional

import config as cfg

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Prompt
# ─────────────────────────────────────────────────────────────────────────────


_SYSTEM_PROMPT = """\
Tu analyses un document professionnel français du secteur BTP (bâtiment,
travaux publics). Ton rôle : le classer, en extraire les informations utiles,
et proposer un rangement.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, suivant ce schéma :

{
  "document_type": "invoice" | "contract" | "note" | "other",
  "confidence": 0.0-1.0,
  "summary": "résumé en une phrase, factuel, sans marketing",
  "extracted_data": { ... dépend du type, voir ci-dessous ... },
  "suggested_folder": "chemin/relatif/suggéré",
  "suggested_filename": "nom_de_fichier.ext"
}

Pour `document_type=invoice` (facture fournisseur), `extracted_data` doit contenir :
  - supplier_name  (string)
  - supplier_siret (string ou null si absent, 14 chiffres)
  - invoice_number (string)
  - invoice_date   (YYYY-MM-DD)
  - amount_ht      (number)
  - vat_rate       (number, par ex. 0.20 ou 0.10 ou 0 si auto-liquidation)
  - amount_vat     (number)
  - amount_ttc     (number)
  - auto_liquidation (boolean, true si mention "auto-liquidation" ou "TVA due par le preneur")
  - lines          (liste de {label, quantity, unit, unit_price_ht, total_ht})
  - currency       (string, par défaut "EUR")

Pour `document_type=contract`, `extracted_data` doit contenir :
  - parties        (liste de strings, les co-contractants)
  - object         (string, objet du contrat en une phrase)
  - amount         (number ou null si non chiffré)
  - start_date     (YYYY-MM-DD ou null)
  - end_date       (YYYY-MM-DD ou null)
  - duration       (string, ex. "24 mois", "durée indéterminée")
  - key_obligations  (liste de strings, 3-5 max)
  - penalties      (liste de strings, 0-3 max)

Pour `document_type=note` (note de chantier, compte-rendu), `extracted_data` doit contenir :
  - date           (YYYY-MM-DD ou null)
  - project        (string, chantier / client concerné, ou null)
  - key_points     (liste de strings, 3-6)
  - actions        (liste de {label, owner, due_date (YYYY-MM-DD ou null)})

Pour `document_type=other`, `extracted_data` doit contenir au minimum :
  - reason (string, pourquoi aucun des trois types précédents ne correspond)

Règles de suggestion :
- `suggested_folder` pour une facture : "Factures/<Fournisseur_normalisé>/<Mois_en_lettres>_<Année>/" (ex: "Factures/Point_P/Avril_2026/"). Sinon pour contrat : "Contrats/<Année>/". Pour note : "Notes_chantier/<Projet_ou_date>/". Sinon "Autres/".
- `suggested_filename` pour une facture : "YYYY-MM-DD_<Fournisseur>_FacN<NumeroSansEspaces>_<MontantTTC>EUR.pdf". Remplace les accents et espaces par des underscores. Si une donnée manque, utilise "?" à la place.
- Si un champ demandé n'est pas visible dans le document, mets-le à `null` (jamais une chaîne vide).
- Ne devine pas les montants. Si tu n'es pas sûr, `null`.

IMPORTANT : tu réponds en JSON uniquement, strict. Pas de ```json, pas de commentaires, pas de texte avant ou après l'objet.
"""


# Client lazy-init so `import` doesn't fail when OPENAI_API_KEY is absent.
_openai_client = None


def _client():
    global _openai_client
    if _openai_client is None:
        from openai import AsyncOpenAI

        _openai_client = AsyncOpenAI(api_key=cfg.OPENAI_API_KEY)
    return _openai_client


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


class ExtractError(Exception):
    """Raised when the document cannot be read or the model returns garbage."""


async def extract_document(
    *,
    raw_text: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict[str, Any]:
    """Classify + extract a single document in one OpenAI call.

    Exactly one of `raw_text` and `file_bytes` must be provided.
    Returns the parsed JSON payload described by `_SYSTEM_PROMPT`, augmented
    with a `raw_text` field containing whatever we fed the model so the
    caller can store it in `extractions.raw_text`.
    """
    if bool(raw_text) == bool(file_bytes):
        raise ExtractError("extract_document: pass exactly one of raw_text or file_bytes.")

    source_type: str
    text_for_storage: str
    user_content: list[dict[str, Any]]

    if raw_text is not None:
        source_type = "text"
        text_for_storage = raw_text.strip()
        if not text_for_storage:
            raise ExtractError("Le texte fourni est vide.")
        user_content = [
            {
                "type": "text",
                "text": (
                    "Document à analyser (texte brut). "
                    f"Nom de fichier : {filename or '(aucun)'}\n\n"
                    f"{text_for_storage}"
                ),
            }
        ]
    else:
        assert file_bytes is not None
        mime = (mime_type or "").lower()
        filename = filename or "document"

        if mime == "application/pdf" or filename.lower().endswith(".pdf"):
            source_type = "pdf"
            text_for_storage = _pdf_to_text(file_bytes)
            user_content = [
                {
                    "type": "text",
                    "text": (
                        "Document à analyser (PDF, texte extrait automatiquement). "
                        f"Nom de fichier : {filename}\n\n"
                        f"{text_for_storage[:30000]}"
                    ),
                }
            ]
        elif mime.startswith("image/") or filename.lower().endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic")
        ):
            source_type = "image"
            text_for_storage = ""  # OCR-d by the model in the same call
            image_format = mime.split("/")[-1] if mime.startswith("image/") else "jpeg"
            b64 = base64.b64encode(file_bytes).decode("ascii")
            user_content = [
                {
                    "type": "text",
                    "text": (
                        "Document à analyser (image). Lis le contenu visible puis "
                        "applique le schéma JSON.\n"
                        f"Nom de fichier : {filename}"
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/{image_format};base64,{b64}",
                        "detail": "high",
                    },
                },
            ]
        else:
            raise ExtractError(
                f"Type de fichier non supporté : {mime or filename}. "
                "Formats acceptés : PDF, JPG, PNG, WEBP, HEIC, texte brut."
            )

    # One LLM call. gpt-4o handles vision + structured output reliably.
    response = await _client().chat.completions.create(
        model="gpt-4o",
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=2000,
    )

    raw = (response.choices[0].message.content or "").strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("extract_document: invalid JSON from model: %r", raw[:500])
        raise ExtractError(f"Le modèle a retourné un JSON invalide : {exc}") from exc

    _validate_and_normalise(payload, fallback_filename=filename)

    # Keep track of what we actually fed the model for audit / re-processing.
    payload["raw_text"] = text_for_storage
    payload["source_type"] = source_type
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _pdf_to_text(data: bytes) -> str:
    """Extract text from a PDF. Falls back to empty string on failure.

    For scanned PDFs (no embedded text), we return "" and let the caller
    decide whether to fall back to vision — for Sprint 2 we accept reduced
    quality on scans rather than shipping a second OCR path.
    """
    try:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n\n".join(pages).strip()
        if text:
            return text
    except Exception as exc:
        logger.warning("pypdf failed, trying pymupdf: %s", exc)

    try:
        import fitz  # pymupdf

        with fitz.open(stream=data, filetype="pdf") as pdf:
            pages = [page.get_text("text") for page in pdf]
        return "\n\n".join(pages).strip()
    except Exception as exc:
        logger.warning("pymupdf also failed: %s", exc)

    return ""


def _slugify(value: str) -> str:
    """Filesystem-safe slug: keep alphanum/underscore/dash, collapse the rest."""
    import unicodedata

    nfd = unicodedata.normalize("NFD", value)
    ascii_only = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    cleaned = re.sub(r"[^\w.-]+", "_", ascii_only, flags=re.UNICODE)
    return cleaned.strip("._-") or "document"


def _validate_and_normalise(
    payload: dict[str, Any],
    *,
    fallback_filename: Optional[str],
) -> None:
    """Enforce minimum shape + patch obvious omissions in-place.

    The model is usually correct but can omit `suggested_folder` or
    `suggested_filename`, and returns dates in various formats. We:
    - Ensure `document_type` is one of the 4 values, else coerce to "other".
    - Ensure `extracted_data` is a dict.
    - Compute sane defaults for `suggested_folder` / `suggested_filename`
      when they are missing or obviously wrong.
    """
    doc_type = payload.get("document_type")
    if doc_type not in {"invoice", "contract", "note", "other"}:
        payload["document_type"] = "other"
        doc_type = "other"

    data = payload.get("extracted_data")
    if not isinstance(data, dict):
        data = {}
        payload["extracted_data"] = data

    folder = payload.get("suggested_folder")
    filename = payload.get("suggested_filename")

    if not folder or not isinstance(folder, str):
        folder = _default_folder(doc_type, data)
        payload["suggested_folder"] = folder

    if not filename or not isinstance(filename, str):
        filename = _default_filename(doc_type, data, fallback_filename)
        payload["suggested_filename"] = filename


def _default_folder(doc_type: str, data: dict[str, Any]) -> str:
    if doc_type == "invoice":
        supplier = _slugify(str(data.get("supplier_name") or "Fournisseur"))
        date_s = str(data.get("invoice_date") or "")
        month_label = _month_label(date_s) or "?"
        return f"Factures/{supplier}/{month_label}/"
    if doc_type == "contract":
        year = (str(data.get("start_date") or "")[:4]) or str(datetime.utcnow().year)
        return f"Contrats/{year}/"
    if doc_type == "note":
        project = _slugify(str(data.get("project") or "Chantier"))
        return f"Notes_chantier/{project}/"
    return "Autres/"


def _default_filename(
    doc_type: str,
    data: dict[str, Any],
    original: Optional[str],
) -> str:
    if doc_type == "invoice":
        date_s = str(data.get("invoice_date") or "?")
        supplier = _slugify(str(data.get("supplier_name") or "Fournisseur"))
        number = _slugify(str(data.get("invoice_number") or "?")).replace("_", "")
        amount = data.get("amount_ttc")
        amount_str = (
            f"{float(amount):.2f}".replace(".", "-") + "EUR" if amount is not None else "?EUR"
        )
        return f"{date_s}_{supplier}_FacN{number}_{amount_str}.pdf"

    if doc_type == "contract":
        first_party = _slugify(
            str((data.get("parties") or ["?"])[0]) if isinstance(data.get("parties"), list) else "?"
        )
        start = str(data.get("start_date") or "?")
        return f"{start}_Contrat_{first_party}.pdf"

    if doc_type == "note":
        date_s = str(data.get("date") or datetime.utcnow().strftime("%Y-%m-%d"))
        project = _slugify(str(data.get("project") or "Note"))
        return f"{date_s}_{project}.txt"

    # Fallback: preserve the original basename if we have one.
    base = _slugify(original or "document")
    return base if "." in base else f"{base}.txt"


_MONTHS_FR = [
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
]


def _month_label(iso_date: str) -> Optional[str]:
    try:
        dt = datetime.strptime(iso_date[:10], "%Y-%m-%d")
    except (ValueError, TypeError):
        return None
    return f"{_MONTHS_FR[dt.month - 1]}_{dt.year}"
