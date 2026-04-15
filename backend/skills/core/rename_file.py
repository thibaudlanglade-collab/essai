"""
Skill: rename_file
Purpose: Rename a file in place (same directory), sanitizing the new name.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from skills.base import SkillResult

SKILL_ID = "rename_file"
DESCRIPTION = "Renommer un fichier dans son répertoire courant"
TASK_TYPE = "file_operation"

TOOL_SCHEMA = {
    "name": "rename_file",
    "description": (
        "Renomme un fichier dans son répertoire courant. "
        "Les caractères invalides dans le nouveau nom sont remplacés par des underscores."
    ),
    "when_to_use": [
        "Renommer un fichier selon des métadonnées extraites",
        "Normaliser le nom d'un document (ex: Facture_ACME_2026-04-09.pdf)",
    ],
    "when_not_to_use": [
        "Déplacer un fichier vers un autre dossier — utiliser move_file",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Chemin complet du fichier à renommer",
            },
            "new_name": {
                "type": "string",
                "description": "Nouveau nom du fichier (sans chemin, avec ou sans extension)",
            },
            "preserve_extension": {
                "type": "boolean",
                "description": (
                    "Si true et que new_name n'a pas d'extension, "
                    "conserver l'extension originale (défaut: true)"
                ),
                "default": True,
            },
        },
        "required": ["file_path", "new_name"],
    },
}

# Invalid characters on Windows (and generally unsafe)
_INVALID_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def _sanitize_name(name: str) -> str:
    """Replace invalid filename characters with underscores."""
    sanitized = _INVALID_CHARS.sub("_", name)
    # Collapse multiple underscores
    sanitized = re.sub(r"_+", "_", sanitized)
    # Strip leading/trailing dots and spaces (Windows reserved)
    return sanitized.strip(". ")


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        file_path = Path(input_data.get("file_path", "")).resolve()
        new_name: str = (input_data.get("new_name") or "").strip()
        preserve_ext: bool = bool(input_data.get("preserve_extension", True))

        if not new_name:
            return SkillResult(
                success=False, data=None, error="Le nouveau nom est requis."
            )

        # Reject names that try to include path separators
        if "/" in new_name or "\\" in new_name:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    "Le nouveau nom ne doit pas contenir de séparateurs de chemin "
                    "(/ ou \\). Utilisez move_file pour changer de dossier."
                ),
            )

        if not file_path.exists():
            return SkillResult(
                success=False,
                data=None,
                error=f"Le fichier n'existe pas: {file_path}",
            )
        if not file_path.is_file():
            return SkillResult(
                success=False,
                data=None,
                error=f"La cible n'est pas un fichier: {file_path}",
            )

        # Handle extension preservation
        new_name_path = Path(new_name)
        if preserve_ext and not new_name_path.suffix:
            new_name = new_name + file_path.suffix

        # Sanitize
        new_name = _sanitize_name(new_name)
        if not new_name:
            return SkillResult(
                success=False,
                data=None,
                error="Le nouveau nom est vide après suppression des caractères invalides.",
            )

        new_path = file_path.parent / new_name

        if new_path.exists() and new_path != file_path:
            return SkillResult(
                success=False,
                data=None,
                error=f"Un fichier avec ce nom existe déjà: {new_path}",
            )

        old_path_str = str(file_path)
        file_path.rename(new_path)

        return SkillResult(
            success=True,
            data={
                "old_path": old_path_str,
                "new_path": str(new_path),
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"rename_file a échoué: {exc}",
        )
