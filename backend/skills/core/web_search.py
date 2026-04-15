"""
Skill: web_search
Purpose: Perform a web search via DuckDuckGo (no API key required).
"""
from __future__ import annotations

import asyncio
from typing import Any

from skills.base import SkillResult

SKILL_ID = "web_search"
DESCRIPTION = "Effectuer une recherche web via DuckDuckGo"
TASK_TYPE = "web_search"

TOOL_SCHEMA = {
    "name": "web_search",
    "description": (
        "Effectue une recherche web via DuckDuckGo. "
        "Retourne les titres, URLs et extraits des premiers résultats. "
        "Aucune clé API requise."
    ),
    "when_to_use": [
        "Rechercher des informations en ligne sur une entreprise ou un sujet",
        "Trouver des actualités récentes",
        "Valider des informations via des sources externes",
    ],
    "when_not_to_use": [
        "Récupérer le contenu complet d'une page spécifique — utiliser fetch_url",
        "Rechercher dans la base de données interne",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Requête de recherche",
            },
            "max_results": {
                "type": "integer",
                "description": "Nombre maximum de résultats (défaut: 5)",
                "default": 5,
            },
            "region": {
                "type": "string",
                "description": "Code région DuckDuckGo (défaut: 'fr-fr')",
                "default": "fr-fr",
            },
        },
        "required": ["query"],
    },
}


def _run_search(query: str, region: str, max_results: int) -> list[dict]:
    """Synchronous DuckDuckGo search — run in thread executor."""
    from duckduckgo_search import DDGS  # type: ignore[import]

    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, region=region, max_results=max_results):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("href", ""),
                "snippet": r.get("body", ""),
            })
    return results


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        query: str = (input_data.get("query") or "").strip()
        max_results: int = int(input_data.get("max_results") or 5)
        region: str = input_data.get("region") or "fr-fr"

        if not query:
            return SkillResult(
                success=False, data=None, error="La requête de recherche est requise."
            )

        max_results = max(1, min(max_results, 20))

        results = await asyncio.to_thread(_run_search, query, region, max_results)

        return SkillResult(
            success=True,
            data={
                "query": query,
                "results": results,
                "count": len(results),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"web_search a échoué: {exc}",
        )
