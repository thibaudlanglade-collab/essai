"""
Skill: fetch_url
Purpose: Fetch the readable text content of a web page via httpx.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from skills.base import SkillResult

SKILL_ID = "fetch_url"
DESCRIPTION = "Récupérer le contenu texte d'une page web"
TASK_TYPE = "web_fetch"

_USER_AGENT = "Mozilla/5.0 (compatible; Synthese/1.0; +https://synthese.app)"

TOOL_SCHEMA = {
    "name": "fetch_url",
    "description": (
        "Récupère le contenu texte lisible d'une URL. "
        "Pour le HTML, extrait le texte principal en supprimant les balises. "
        "Tronque le contenu à max_chars caractères."
    ),
    "when_to_use": [
        "Lire le contenu d'une page web identifiée par une recherche",
        "Récupérer le texte d'un article ou d'une documentation en ligne",
        "Vérifier qu'une URL est accessible",
    ],
    "when_not_to_use": [
        "Rechercher sur le web — utiliser web_search",
        "Télécharger un fichier binaire (PDF, image)",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "URL à récupérer (doit commencer par http:// ou https://)",
            },
            "timeout": {
                "type": "integer",
                "description": "Délai maximum en secondes (défaut: 15)",
                "default": 15,
            },
            "max_chars": {
                "type": "integer",
                "description": "Nombre maximum de caractères dans le contenu retourné (défaut: 10000)",
                "default": 10000,
            },
            "extract_main_content": {
                "type": "boolean",
                "description": "Supprimer scripts/styles/balises pour n'obtenir que le texte (défaut: true)",
                "default": True,
            },
        },
        "required": ["url"],
    },
}


def _extract_title(html: str) -> str | None:
    """Extract <title> content from HTML."""
    match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    return match.group(1).strip() if match else None


def _html_to_text(html: str) -> str:
    """Strip scripts, styles, and HTML tags — return readable text."""
    # Remove <script>...</script>
    text = re.sub(r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    # Remove <style>...</style>
    text = re.sub(r"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    # Remove all remaining HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode common HTML entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&nbsp;", " ").replace("&quot;", '"').replace("&#39;", "'")
    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        import httpx

        url: str = (input_data.get("url") or "").strip()
        timeout: int = int(input_data.get("timeout") or 15)
        max_chars: int = int(input_data.get("max_chars") or 10000)
        extract_main: bool = bool(input_data.get("extract_main_content", True))

        if not url:
            return SkillResult(
                success=False, data=None, error="L'URL est requise."
            )
        if not url.startswith(("http://", "https://")):
            return SkillResult(
                success=False,
                data=None,
                error=f"L'URL doit commencer par http:// ou https:// (reçu: '{url[:50]}').",
            )

        timeout = max(1, min(timeout, 60))
        max_chars = max(100, min(max_chars, 100_000))

        async with httpx.AsyncClient(
            timeout=float(timeout),
            follow_redirects=True,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            resp = await client.get(url)

        status_code = resp.status_code
        content_type = resp.headers.get("content-type", "").lower()
        raw_text = resp.text

        title: str | None = None

        if "html" in content_type and extract_main:
            title = _extract_title(raw_text)
            content = _html_to_text(raw_text)
        else:
            content = raw_text

        truncated = len(content) > max_chars
        content = content[:max_chars]
        if truncated:
            content += "..."

        return SkillResult(
            success=True,
            data={
                "url": url,
                "status_code": status_code,
                "title": title,
                "content": content,
                "content_length": len(content),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"fetch_url a échoué: {exc}",
        )
