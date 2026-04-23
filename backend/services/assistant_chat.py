"""
Assistant chat orchestrator.

Runs a multi-turn tool-calling loop against OpenAI GPT-4o, using the skills
registered in the core skill registry as tools. Persists the full conversation
(user + assistant + tool_call + tool_result messages) in the AssistantMessage
table so a conversation can resume across requests.

Multi-tenant: every call is scoped to the prospect's `user_id`. The service
refuses to run without a user_id (raises RuntimeError). Tool execution context
always carries the user_id so skills filter their DB queries accordingly.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import config
from db.models import AssistantConversation, AssistantMessage
from engine.planner.skill_registry import (
    discover_skills,
    get_skill_module,
    list_skill_names,
)

logger = logging.getLogger(__name__)

# Tools exposed to the assistant. Iteration 1 = emails.
# Iteration 2 adds the native TE-main data: clients, suppliers, quotes, invoices.
# Iteration 3+ will extend to Drive documents.
ASSISTANT_TOOL_NAMES: list[str] = [
    # Emails
    "search_emails",
    "read_email",
    "count_emails",
    # Business entities
    "search_clients",
    "search_suppliers",
    "search_quotes",
    "search_invoices",
    # Drive
    "search_drive_documents",
]

MODEL = "gpt-4o"
MAX_TOOL_ITERATIONS = 6
MAX_TOKENS = 2048

SYSTEM_PROMPT = """\
Tu es l'assistant de Synthèse, un copilote qui aide un dirigeant de PME (secteur BTP / travaux) à gérer son activité au quotidien.

Ta mission: répondre aux questions de l'utilisateur en interrogeant ses données avec les outils à ta disposition.

Tu as accès à 8 outils:
- search_emails / read_email / count_emails : ses emails synchronisés (Gmail)
- search_clients : ses clients (particuliers, SCI, copros, mairies, promoteurs)
- search_suppliers : ses fournisseurs (matériaux, outillage, sous-traitants)
- search_quotes : les devis qu'il a émis (avec statut draft/sent/accepted/refused et totaux par statut)
- search_invoices : les factures fournisseurs qu'il a reçues (avec totaux HT/TTC)
- search_drive_documents : les documents (PDF, photos, docs) dans les dossiers Drive qu'il a ouverts à Synthèse (contrats, plans, scans de chantier, archives)

Règles de comportement:
- Toujours utiliser les outils pour vérifier les faits. Ne jamais inventer de chiffres, de dates, d'interlocuteurs.
- Chaîne les outils quand c'est utile: par exemple pour « quel CA potentiel avec Vallourec ? » → search_clients(name="Vallourec") puis search_quotes(client_name="Vallourec", status="sent").
- Pour les agrégats (totaux, comptes), exploite les champs `summary_by_status` / `total_ht` / `total_ttc` directement renvoyés par les outils, plutôt que de resommer toi-même.
- Si tu ne trouves rien, dis-le clairement plutôt que d'inventer.
- Réponses concises, structurées (listes à puces, chiffres clés), en français, tutoiement.
- Cite systématiquement les sources (ex: « d'après les 3 devis émis ce mois-ci »).
- Si l'utilisateur demande quelque chose qui dépasse ton périmètre actuel (documents libres, drive, calendrier, employés), explique-le brièvement et propose ce que tu peux faire à la place.

Contexte: nous sommes le {today}.
"""


def _build_tool_list() -> list[dict]:
    """Return OpenAI-compatible tool schemas for the assistant's allowed tools."""
    discover_skills()
    tools: list[dict] = []
    for name in ASSISTANT_TOOL_NAMES:
        if name not in list_skill_names():
            logger.warning("Assistant tool %s not found in skill registry", name)
            continue
        mod = get_skill_module(name)
        schema = getattr(mod, "TOOL_SCHEMA", None)
        if schema is None:
            continue
        tools.append({
            "type": "function",
            "function": {
                "name": schema["name"],
                "description": schema["description"],
                "parameters": schema["input_schema"],
            },
        })
    return tools


async def _execute_tool(
    tool_name: str, tool_input: dict, db: AsyncSession, user_id: str
) -> dict:
    """Run a skill and return a JSON-serializable result."""
    try:
        mod = get_skill_module(tool_name)
    except KeyError as exc:
        return {"ok": False, "error": str(exc)}

    result = await mod.execute(tool_input, {"db": db, "user_id": user_id})
    if getattr(result, "success", False):
        return {"ok": True, "data": result.data}
    return {"ok": False, "error": getattr(result, "error", "unknown error")}


async def _load_conversation_messages(
    db: AsyncSession, conversation: AssistantConversation
) -> list[dict]:
    """Reconstruct the OpenAI-format message list from persisted rows."""
    stmt = (
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation.id)
        .order_by(AssistantMessage.id)
    )
    rows = (await db.execute(stmt)).scalars().all()
    messages: list[dict] = []
    for row in rows:
        try:
            messages.append(json.loads(row.content_json or "{}"))
        except json.JSONDecodeError:
            logger.warning("Could not parse AssistantMessage %s", row.id)
    return messages


async def _persist_message(
    db: AsyncSession, conversation_id: int, message: dict
) -> None:
    db.add(
        AssistantMessage(
            conversation_id=conversation_id,
            role=message.get("role", "user"),
            content_json=json.dumps(message, ensure_ascii=False, default=str),
        )
    )
    await db.commit()


def _extract_sources(messages: list[dict]) -> list[dict]:
    """Build a source list from assistant messages that made tool_calls."""
    sources: list[dict] = []
    for msg in messages:
        tool_calls = msg.get("tool_calls") or []
        for tc in tool_calls:
            fn = tc.get("function") or {}
            raw_args = fn.get("arguments") or "{}"
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except (TypeError, ValueError):
                args = {}
            sources.append({
                "type": "tool_call",
                "tool": fn.get("name"),
                "input": args,
            })
    return sources


def _assistant_message_to_dict(msg: Any) -> dict:
    """Convert an OpenAI ChatCompletionMessage to a JSON-serializable dict."""
    result: dict = {"role": "assistant", "content": msg.content}
    if getattr(msg, "tool_calls", None):
        result["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in msg.tool_calls
        ]
    return result


async def chat(
    db: AsyncSession,
    user_id: str,
    user_message: str,
    conversation_id: Optional[int] = None,
) -> dict:
    """
    Run one turn of the assistant. Creates the conversation if needed.
    Returns { conversation_id, answer, sources }.

    `user_id` is the AccessToken id of the current prospect; it scopes
    conversation lookup + tool execution.
    """
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    if not user_id:
        raise RuntimeError("user_id is required")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
    tools = _build_tool_list()

    # ── Load or create conversation (scoped to user_id) ─────────────────────
    conversation: Optional[AssistantConversation] = None
    if conversation_id is not None:
        conversation = await db.get(AssistantConversation, conversation_id)
        if conversation is not None and conversation.user_id != user_id:
            # Don't leak another user's conversation — start fresh.
            logger.warning(
                "user %s attempted to resume conversation %s owned by %s",
                user_id, conversation_id, conversation.user_id,
            )
            conversation = None
    if conversation is None:
        conversation = AssistantConversation(
            user_id=user_id,
            title=user_message[:60],
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    today = datetime.now().strftime("%A %d %B %Y")
    system_message = {
        "role": "system",
        "content": SYSTEM_PROMPT.format(today=today),
    }

    history = await _load_conversation_messages(db, conversation)
    user_turn = {"role": "user", "content": user_message}
    api_messages: list[dict] = [system_message] + history + [user_turn]

    # Persist the incoming user message immediately so we don't lose it on crash.
    await _persist_message(db, conversation.id, user_turn)

    new_messages: list[dict] = []
    final_text = ""

    for _ in range(MAX_TOOL_ITERATIONS):
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=0.3,
            messages=api_messages,
            tools=tools,
            tool_choice="auto",
        )
        choice = response.choices[0]
        assistant_dict = _assistant_message_to_dict(choice.message)

        api_messages.append(assistant_dict)
        new_messages.append(assistant_dict)
        await _persist_message(db, conversation.id, assistant_dict)

        if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
            final_text = choice.message.content or ""
            break

        # Execute each tool_call and append a tool-role message per result.
        for tc in choice.message.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except (TypeError, ValueError):
                args = {}
            result_payload = await _execute_tool(tc.function.name, args, db, user_id)
            tool_message = {
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result_payload, ensure_ascii=False),
            }
            api_messages.append(tool_message)
            new_messages.append(tool_message)
            await _persist_message(db, conversation.id, tool_message)
    else:
        final_text = (
            "Je n'ai pas réussi à finaliser ma réponse (trop d'itérations outils)."
        )

    return {
        "conversation_id": conversation.id,
        "answer": final_text,
        "sources": _extract_sources(new_messages),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Streaming variant
# ─────────────────────────────────────────────────────────────────────────────


def _summarise_tool_result(tool_name: str, payload: dict) -> dict:
    """Extract a short, JSON-serialisable summary to emit on the stream."""
    if not payload.get("ok"):
        return {"ok": False, "error": payload.get("error")}
    data = payload.get("data") or {}
    summary: dict = {"ok": True}
    for key in (
        "count", "total_ht", "total_ttc",
        "emails", "clients", "suppliers", "quotes", "invoices",
        "summary_by_status",
    ):
        if key in data:
            value = data[key]
            if isinstance(value, list):
                summary[key] = len(value)
            else:
                summary[key] = value
    return summary


async def chat_stream(
    db: AsyncSession,
    user_id: str,
    user_message: str,
    conversation_id: Optional[int] = None,
):
    """Async generator yielding SSE-shaped dicts as the turn unfolds.

    Event types:
      - {"type": "conversation", "conversation_id": N}
      - {"type": "tool_call", "tool": "...", "input": {...}}
      - {"type": "tool_result", "tool": "...", "summary": {...}}
      - {"type": "answer", "text": "..."}              # final assistant text
      - {"type": "error", "detail": "..."}
      - {"type": "done"}

    Yields plain dicts; the HTTP layer serialises to SSE `data: {json}\\n\\n`.
    """
    if not config.OPENAI_API_KEY:
        yield {"type": "error", "detail": "OPENAI_API_KEY is not configured"}
        return
    if not user_id:
        yield {"type": "error", "detail": "user_id is required"}
        return

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
    tools = _build_tool_list()

    conversation: Optional[AssistantConversation] = None
    if conversation_id is not None:
        conversation = await db.get(AssistantConversation, conversation_id)
        if conversation is not None and conversation.user_id != user_id:
            conversation = None
    if conversation is None:
        conversation = AssistantConversation(
            user_id=user_id,
            title=user_message[:60],
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    yield {"type": "conversation", "conversation_id": conversation.id}

    today = datetime.now().strftime("%A %d %B %Y")
    system_message = {
        "role": "system",
        "content": SYSTEM_PROMPT.format(today=today),
    }

    history = await _load_conversation_messages(db, conversation)
    user_turn = {"role": "user", "content": user_message}
    api_messages: list[dict] = [system_message] + history + [user_turn]
    await _persist_message(db, conversation.id, user_turn)

    final_text = ""

    for _ in range(MAX_TOOL_ITERATIONS):
        try:
            response = await client.chat.completions.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                temperature=0.3,
                messages=api_messages,
                tools=tools,
                tool_choice="auto",
            )
        except Exception as exc:
            logger.exception("streaming chat failed at model call")
            yield {"type": "error", "detail": str(exc)}
            return

        choice = response.choices[0]
        assistant_dict = _assistant_message_to_dict(choice.message)
        api_messages.append(assistant_dict)
        await _persist_message(db, conversation.id, assistant_dict)

        if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
            final_text = choice.message.content or ""
            break

        for tc in choice.message.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except (TypeError, ValueError):
                args = {}
            yield {"type": "tool_call", "tool": tc.function.name, "input": args}

            result_payload = await _execute_tool(tc.function.name, args, db, user_id)

            yield {
                "type": "tool_result",
                "tool": tc.function.name,
                "summary": _summarise_tool_result(tc.function.name, result_payload),
            }

            tool_message = {
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result_payload, ensure_ascii=False),
            }
            api_messages.append(tool_message)
            await _persist_message(db, conversation.id, tool_message)
    else:
        final_text = (
            "Je n'ai pas réussi à finaliser ma réponse (trop d'itérations outils)."
        )

    yield {"type": "answer", "text": final_text}
    yield {"type": "done"}
