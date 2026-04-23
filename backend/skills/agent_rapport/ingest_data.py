"""
Skill: agent_rapport.ingest_data

First step of the agent rapport wizard. Takes whatever the prospect has
to share about a client (free text, CSV, or one or more PDFs) and turns
it into a normalised ClientContext that downstream skills consume.

Input shape (dict):
    {
        "source_type": "text" | "csv" | "pdf",
        "text":        str          # when source_type == "text"
        "csv":         str          # when source_type == "csv" (raw text content)
        "pdf_chunks":  list[str]    # when source_type == "pdf" (already-extracted text per file)
        "client_hint": Optional[str]   # name typed by the user, used as a fallback
    }

Output (dict): {
    "client_name":  str,
    "raw_text":     str,             # cleaned/concatenated source — kept for next skills
    "summary":      str,             # 1-2 sentences shown to the user before intent capture
    "entities":     {
        "client":      {name, type?, sector?, city?, contact?},
        "metrics":     [{label, value, unit?}],
        "documents":   [{kind, ref?, label?, amount?, date?, status?}],
        "exchanges":   [{date?, channel?, contact?, summary}],
    }
}

The skill calls the LLM once to extract structured entities — it doesn't
hallucinate fields, just lifts what's actually in the text. If extraction
fails, the raw_text + a generic summary are still returned so the user
can proceed.
"""
from __future__ import annotations

import json
from typing import Any

from skills.base import SkillResult

SKILL_ID = "ingest_data"
DESCRIPTION = "Lecture des données fournies"
TASK_TYPE = "structuring"

_MAX_RAW_CHARS = 16_000


_SYSTEM_PROMPT = """\
Tu es un analyste qui prépare un dossier client pour un dirigeant de PME.
On te donne du texte libre, un export CSV ou le contenu OCR de PDFs
décrivant un client. Tu dois en extraire UNIQUEMENT ce qui est
explicitement présent — pas d'invention, pas d'extrapolation.

Réponds avec un objet JSON strictement de cette forme :
{
  "client_name": "nom du client (string, obligatoire)",
  "summary": "1-2 phrases en français qui résument ce qu'on sait sur ce client",
  "entities": {
    "client":    {"name": str, "type": str|null, "sector": str|null, "city": str|null, "contact": str|null},
    "metrics":   [{"label": str, "value": str, "unit": str|null}],
    "documents": [{"kind": "devis"|"facture"|"commande"|"contrat"|"autre", "ref": str|null, "label": str|null, "amount": number|null, "date": str|null, "status": str|null}],
    "exchanges": [{"date": str|null, "channel": "Email"|"Téléphone"|"Réunion"|"Autre"|null, "contact": str|null, "summary": str}]
  }
}

Règles :
- "client_name" est obligatoire. Si rien d'explicite, prends le mot le plus probable (nom propre, raison sociale).
- Listes vides si rien à mettre — JAMAIS d'éléments inventés.
- Les montants sont des nombres bruts (sans symbole). 1 850.50 et pas "1 850,50 €".
- Pas de commentaire en dehors du JSON.
"""


def _normalise_input(input_data: dict) -> str:
    """Concatenate the user-provided sources into a single text blob."""
    source_type = input_data.get("source_type")
    if source_type == "text":
        return (input_data.get("text") or "").strip()
    if source_type == "csv":
        # Plain text already — the LLM is fine with raw CSV
        return (input_data.get("csv") or "").strip()
    if source_type == "pdf":
        chunks = input_data.get("pdf_chunks") or []
        return "\n\n--- Document suivant ---\n\n".join(c.strip() for c in chunks if c.strip())
    return ""


def _fallback_extraction(raw_text: str, client_hint: str | None) -> dict:
    """When the LLM is unavailable, return a minimal valid ClientContext."""
    name = (client_hint or "").strip() or "Client sans nom"
    summary = (
        "Données importées. Pas d'extraction structurée disponible "
        "— vous pouvez quand même demander un rapport, l'IA s'appuiera "
        "sur le texte brut."
    )
    return {
        "client_name": name,
        "summary": summary,
        "entities": {
            "client": {"name": name, "type": None, "sector": None, "city": None, "contact": None},
            "metrics": [],
            "documents": [],
            "exchanges": [],
        },
    }


async def _llm_extract(raw_text: str, client_hint: str | None) -> dict | None:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        if not config.OPENAI_API_KEY:
            return None

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        user_msg = raw_text[:_MAX_RAW_CHARS]
        if client_hint:
            user_msg = f"Le prospect indique que le nom du client est : « {client_hint} ».\n\n{user_msg}"

        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        if not isinstance(parsed, dict) or not parsed.get("client_name"):
            return None
        # Ensure every required nested key exists so downstream skills are simple
        ent = parsed.setdefault("entities", {})
        ent.setdefault("client", {"name": parsed["client_name"]})
        ent.setdefault("metrics", [])
        ent.setdefault("documents", [])
        ent.setdefault("exchanges", [])
        parsed.setdefault("summary", "Données importées avec succès.")
        return parsed
    except Exception:
        return None


async def execute(input_data: dict, context) -> SkillResult:
    raw_text = _normalise_input(input_data)
    client_hint = input_data.get("client_hint")

    if not raw_text:
        return SkillResult(
            success=False,
            data=None,
            error="Aucune donnée fournie (text, csv ou pdf attendus).",
        )

    extracted = await _llm_extract(raw_text, client_hint)
    used_llm = extracted is not None
    if extracted is None:
        extracted = _fallback_extraction(raw_text, client_hint)

    output: dict[str, Any] = {
        "client_name": extracted["client_name"],
        "raw_text": raw_text,
        "summary": extracted["summary"],
        "entities": extracted["entities"],
    }

    return SkillResult(
        success=True,
        data=output,
        debug={
            "used_llm": used_llm,
            "raw_chars": len(raw_text),
            "documents_extracted": len(extracted["entities"].get("documents", [])),
        },
    )
