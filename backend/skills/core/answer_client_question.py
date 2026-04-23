"""
Skill: answer_client_question
Purpose: Answer a free-form question about one of the prospect's clients,
         grounded exclusively in the documents passed in (devis, emails,
         invoices, notes, Drive files). Returns JSON with the answer and
         the list of sources the answer relies on.

No DB access here — this skill is pure. The caller (services/client_report_service.py)
is responsible for gathering the context and mapping `source_id`s back to
clickable resources.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional

from skills.base import SkillResult

SKILL_ID = "answer_client_question"
DESCRIPTION = (
    "Répondre à une question sur un client donné en utilisant uniquement "
    "les documents fournis en contexte."
)

TOOL_SCHEMA = {
    "name": "answer_client_question",
    "description": (
        "Répond à une question en langage naturel concernant un client précis "
        "du prospect BTP, à partir des documents fournis (devis, emails, "
        "factures, extractions, fichiers Drive). Cite les sources utilisées."
    ),
    "when_to_use": [
        "Page Rapport client : répondre à une question libre sur un client",
        "Assistant Synthèse (Sprint 5) : sous-routine quand la question cible un client",
    ],
    "when_not_to_use": [
        "La question porte sur plusieurs clients ou sur les finances globales",
        "Il n'y a aucun document en contexte (retourner plutôt une réponse vide)",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "client_name": {"type": "string"},
            "client_type": {"type": "string", "description": "particulier|sci|copro|mairie|promoteur|autre"},
            "question": {"type": "string"},
            "context_docs": {
                "type": "array",
                "description": (
                    "Liste des documents en contexte. Chaque entrée doit avoir "
                    "`source_id` (unique), `kind` (quote|email|invoice|extraction|drive_file), "
                    "`title` (court), `date` (YYYY-MM-DD ou null), `metadata` (dict), "
                    "`snippet` (texte tronqué, 1000-2500 chars)."
                ),
                "items": {"type": "object"},
            },
        },
        "required": ["client_name", "question", "context_docs"],
    },
}


_SYSTEM_PROMPT = """\
Vous êtes l'assistant d'un gérant d'entreprise BTP basé en France.

Contexte : le gérant a sélectionné un client précis dans son espace et
vous pose une question. Les documents fournis sont de deux natures
possibles :
- des documents directement liés à ce client (devis, emails, factures
  qui le mentionnent) ;
- des fichiers issus des dossiers Drive que le gérant a demandé à
  consulter, qui peuvent parler du client ou traiter d'un tout autre
  sujet (un livre, une note de chantier, un document technique, etc.).

Votre rôle :
1. Produire un RÉSUMÉ GÉNÉRAL répondant à la question, en vous appuyant
   UNIQUEMENT sur les documents fournis.
2. Produire un MINI-RÉSUMÉ PAR DOCUMENT pertinent, pour que le gérant
   voie en un coup d'œil ce que chaque document apporte à la réponse.

Règles strictes :
1. Répondez en français, vouvoiement, ton professionnel et direct.
2. Aucune extrapolation au-delà des documents fournis. Si aucun
   document ne permet de répondre, dites-le clairement dans `answer`
   et laissez `source_summaries` vide.
3. Dans `source_summaries`, ne listez QUE les documents qui apportent
   quelque chose à la réponse. Aucun source_id inventé : chaque
   source_id doit exister dans le contexte fourni.
4. N'utilisez jamais les mots "IA", "automatisation",
   "intelligence artificielle", "aider".
5. N'utilisez jamais de tirets longs (caractère —). Remplacez-les
   par une virgule ou par des parenthèses.
6. `answer` : 2 à 5 phrases maximum, synthétique.
   Les chiffres (montants, dates) sont précis et en euros.
7. Chaque `summary` de document : 1 à 2 phrases maximum, décrivant
   ce que ce document précis apporte (faits, dates, montants).

Format de sortie : JSON strict, rien avant, rien après.
{
  "answer": "résumé général en français, 2 à 5 phrases",
  "source_summaries": [
    {"source_id": "src-id-X", "summary": "ce que ce document dit, 1 à 2 phrases"},
    {"source_id": "src-id-Y", "summary": "ce que celui-ci apporte, 1 à 2 phrases"}
  ],
  "confidence": 0.0
}
"""


_MAX_SNIPPET_CHARS = 2200
_MAX_CONTEXT_DOCS = 40


def _truncate(text: Optional[str], limit: int) -> str:
    if not text:
        return ""
    text = str(text).strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def _format_doc(doc: dict[str, Any]) -> str:
    source_id = str(doc.get("source_id") or "src-unknown")
    kind = str(doc.get("kind") or "doc")
    title = _truncate(doc.get("title"), 180) or "(sans titre)"
    date = doc.get("date") or "date inconnue"
    metadata = doc.get("metadata") or {}
    snippet = _truncate(doc.get("snippet"), _MAX_SNIPPET_CHARS)

    meta_lines: list[str] = []
    for key, value in metadata.items():
        if value in (None, "", [], {}):
            continue
        meta_lines.append(f"    {key}: {value}")

    lines = [
        f"[{source_id}] ({kind}) — {date}",
        f"  Titre : {title}",
    ]
    if meta_lines:
        lines.append("  Champs :")
        lines.extend(meta_lines)
    if snippet:
        lines.append(f"  Extrait : {snippet}")
    return "\n".join(lines)


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        import config

        client_name: str = (input_data.get("client_name") or "").strip()
        client_type: str = (input_data.get("client_type") or "").strip() or "inconnu"
        question: str = (input_data.get("question") or "").strip()
        context_docs: list[dict[str, Any]] = list(input_data.get("context_docs") or [])

        if not client_name:
            return SkillResult(success=False, data=None, error="client_name est requis.")
        if not question:
            return SkillResult(success=False, data=None, error="question est requise.")

        if not context_docs:
            return SkillResult(
                success=True,
                data={
                    "answer": (
                        "Votre espace ne contient pour le moment aucun document "
                        "exploitable pour répondre : ni devis ni email rattaché "
                        "à ce client, et aucun fichier dans vos dossiers Drive "
                        "sélectionnés. Ajoutez des documents via Smart Extract, "
                        "ou configurez un dossier Drive contenant vos pièces."
                    ),
                    "sources": [],
                    "confidence": 0.0,
                },
                debug={"context_doc_count": 0},
            )

        if len(context_docs) > _MAX_CONTEXT_DOCS:
            context_docs = context_docs[:_MAX_CONTEXT_DOCS]

        valid_source_ids = {str(doc.get("source_id")) for doc in context_docs if doc.get("source_id")}

        doc_blocks = "\n\n".join(_format_doc(doc) for doc in context_docs)

        user_message = (
            f"Question du gérant :\n{question}\n\n"
            f"Client concerné : {client_name} (type : {client_type})\n\n"
            f"Documents fournis (n={len(context_docs)}) :\n\n{doc_blocks}\n\n"
            "Rappel : vous ne citez que les `source_id` présents ci-dessus. "
            "JSON strict en sortie."
        )

        llm = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        response = await llm.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=1400,
        )

        raw = response.choices[0].message.content or ""
        parsed = _extract_json(raw)

        answer = (parsed.get("answer") or "").strip()
        raw_summaries = parsed.get("source_summaries") or []
        confidence = parsed.get("confidence", 0.0)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.0

        # Drop hallucinated sources; keep per-source summaries aligned.
        cleaned_summaries: list[dict[str, str]] = []
        cleaned_sources: list[str] = []
        seen_ids: set[str] = set()
        for entry in raw_summaries:
            if not isinstance(entry, dict):
                continue
            src = str(entry.get("source_id") or "").strip()
            summary = str(entry.get("summary") or "").strip()
            if not src or src not in valid_source_ids or src in seen_ids:
                continue
            if not summary:
                continue
            cleaned_summaries.append({"source_id": src, "summary": summary})
            cleaned_sources.append(src)
            seen_ids.add(src)

        if not answer:
            answer = (
                "Les documents fournis ne permettent pas de répondre précisément "
                "à cette question."
            )

        return SkillResult(
            success=True,
            data={
                "answer": answer,
                "sources": cleaned_sources,
                "source_summaries": cleaned_summaries,
                "confidence": confidence,
            },
            debug={
                "context_doc_count": len(context_docs),
                "model": "gpt-4o",
                "raw_len": len(raw),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"answer_client_question a échoué: {exc}",
        )
