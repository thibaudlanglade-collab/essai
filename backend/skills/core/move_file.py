"""
Skill: move_file
Purpose: Move a file from one location to another using shutil.move.
"""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from skills.base import SkillResult

SKILL_ID = "move_file"
DESCRIPTION = "Déplacer un fichier vers un nouvel emplacement"
TASK_TYPE = "file_operation"

TOOL_SCHEMA = {
    "name": "move_file",
    "description": (
        "Déplace un fichier d'un emplacement source vers une destination. "
        "Fonctionne sur tous les systèmes d'exploitation, y compris les déplacements entre disques."
    ),
    "when_to_use": [
        "Déplacer un fichier vers un dossier d'archive",
        "Classer un document dans le bon répertoire",
        "Déplacer un fichier traité vers un dossier 'done'",
    ],
    "when_not_to_use": [
        "Copier un fichier (conserver l'original) — utiliser copy_file",
        "Renommer un fichier dans le même dossier — utiliser rename_file",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "source_path": {
                "type": "string",
                "description": "Chemin complet du fichier source",
            },
            "destination_path": {
                "type": "string",
                "description": "Chemin complet de destination (incluant le nom du fichier)",
            },
            "create_destination_dir": {
                "type": "boolean",
                "description": "Créer les dossiers parents si manquants (défaut: true)",
                "default": True,
            },
            "overwrite": {
                "type": "boolean",
                "description": "Écraser le fichier destination s'il existe (défaut: false)",
                "default": False,
            },
        },
        "required": ["source_path", "destination_path"],
    },
}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        source = Path(input_data.get("source_path", "")).resolve()
        dest = Path(input_data.get("destination_path", "")).resolve()
        create_dirs: bool = bool(input_data.get("create_destination_dir", True))
        overwrite: bool = bool(input_data.get("overwrite", False))

        if not source:
            return SkillResult(
                success=False, data=None, error="Le chemin source est requis."
            )
        if not dest:
            return SkillResult(
                success=False, data=None, error="Le chemin destination est requis."
            )

        if not source.exists():
            return SkillResult(
                success=False,
                data=None,
                error=f"Le fichier source n'existe pas: {source}",
            )
        if not source.is_file():
            return SkillResult(
                success=False,
                data=None,
                error=f"La source n'est pas un fichier: {source}",
            )

        # If destination is an existing directory, move file INTO it (shutil.move behaviour)
        if dest.exists() and dest.is_dir():
            dest = dest / source.name

        if dest.exists() and not overwrite:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"Le fichier destination existe déjà: {dest}. "
                    "Utilisez overwrite=true pour l'écraser."
                ),
            )

        if create_dirs:
            dest.parent.mkdir(parents=True, exist_ok=True)
        elif not dest.parent.exists():
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"Le dossier destination n'existe pas: {dest.parent}. "
                    "Utilisez create_destination_dir=true pour le créer."
                ),
            )

        size_bytes = source.stat().st_size
        shutil.move(str(source), str(dest))

        return SkillResult(
            success=True,
            data={
                "moved_from": str(source),
                "moved_to": str(dest),
                "size_bytes": size_bytes,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"move_file a échoué: {exc}",
        )
