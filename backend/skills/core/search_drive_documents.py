"""
Skill: search_drive_documents
Purpose: Search the files inside the prospect's configured Drive folders
         (ClientReportFolder rows). Multi-tenant: scoped by context["user_id"].
         Requires the user to have (a) connected Google Drive and (b) registered
         at least one folder on the Rapport Client page.

Returns lightweight metadata (id, name, mime_type, folder_name, modified_at,
web_view_link). The actual textual content is NOT returned — fetching a file's
body is deferred to a future `read_drive_document` skill.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from sqlalchemy import select

from skills.base import SkillResult

logger = logging.getLogger(__name__)

SKILL_ID = "search_drive_documents"
DESCRIPTION = "Rechercher dans les fichiers Drive de l'utilisateur"
TASK_TYPE = "drive_query"

MAX_FILES_PER_FOLDER = 50
MAX_RESULTS = 25

TOOL_SCHEMA = {
    "name": "search_drive_documents",
    "description": (
        "Recherche dans les documents Google Drive que l'utilisateur a choisis "
        "d'exposer à Synthèse (via les dossiers configurés sur la page Rapport Client). "
        "Porte sur le nom du fichier. Retourne la liste des fichiers trouvés avec leur "
        "nom, type MIME, dossier d'origine, date de dernière modification et lien Drive. "
        "Le contenu textuel n'est PAS retourné — cette recherche ne fait qu'identifier "
        "les fichiers pertinents. Si aucun dossier n'est configuré ou si Drive n'est pas "
        "connecté, l'outil retourne une erreur explicite à relayer à l'utilisateur."
    ),
    "when_to_use": [
        "Questions sur un document précis : contrat, plan, rapport, scan de chantier",
        "Trouver « le PDF de X » ou « la photo du toit »",
        "Compléter une fiche client avec les documents archivés sur Drive",
    ],
    "when_not_to_use": [
        "Chercher dans les emails — utiliser search_emails",
        "Chercher dans les factures fournisseurs déjà extraites — utiliser search_invoices",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Mots à chercher dans le nom des fichiers (insensible à la casse). "
                    "Laisser vide pour lister tous les fichiers récents."
                ),
            },
            "mime_type_contains": {
                "type": "string",
                "description": (
                    "Filtrer sur le type MIME (ex: 'pdf' pour ne garder que les PDF, "
                    "'image' pour les photos)."
                ),
            },
            "limit": {
                "type": "integer",
                "description": "Nombre maximum de fichiers à retourner (défaut 10, max 25)",
                "minimum": 1,
                "maximum": MAX_RESULTS,
            },
        },
        "required": [],
    },
}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from db.models import ClientReportFolder, OAuthConnection
        from services.crypto import decrypt_token
        from services.drive_service import list_folder_files_recursive

        db = _get_db(context)
        user_id = _get_user_id(context)
        if db is None:
            return SkillResult(success=False, data=None, error="No DB session in context")
        if not user_id:
            return SkillResult(success=False, data=None, error="No user_id in context")

        query_text = (input_data.get("query") or "").strip().lower()
        mime_filter = (input_data.get("mime_type_contains") or "").strip().lower()
        limit = min(int(input_data.get("limit") or 10), MAX_RESULTS)

        # ── Drive connection ────────────────────────────────────────────────
        connection = (
            await db.execute(
                select(OAuthConnection).where(
                    OAuthConnection.user_id == user_id,
                    OAuthConnection.provider == "google_drive",
                )
            )
        ).scalar_one_or_none()

        if connection is None:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    "Google Drive n'est pas connecté sur ce compte. "
                    "L'utilisateur doit aller dans Rapport Client pour connecter son Drive."
                ),
            )

        # ── Configured folders ──────────────────────────────────────────────
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
            return SkillResult(
                success=False,
                data=None,
                error=(
                    "Aucun dossier Drive n'a été configuré. L'utilisateur doit en "
                    "ajouter au moins un sur la page Rapport Client."
                ),
            )

        # ── Decrypt tokens ──────────────────────────────────────────────────
        try:
            access_plain = decrypt_token(connection.access_token)
            refresh_plain = (
                decrypt_token(connection.refresh_token) if connection.refresh_token else None
            )
        except Exception as exc:
            logger.warning("Drive token decrypt failed for user=%s: %s", user_id, exc)
            return SkillResult(
                success=False,
                data=None,
                error="Impossible de déchiffrer les identifiants Drive (reconnecte-toi).",
            )

        scopes = json.loads(connection.scopes) if connection.scopes else []

        # ── Fan out folder listing in parallel ──────────────────────────────
        folder_results = await asyncio.gather(
            *(
                asyncio.to_thread(
                    list_folder_files_recursive,
                    access_token=access_plain,
                    refresh_token=refresh_plain,
                    expires_at=connection.expires_at,
                    scopes=scopes,
                    folder_id=folder.folder_id,
                    max_files=MAX_FILES_PER_FOLDER,
                    max_depth=3,
                )
                for folder in folders
            ),
            return_exceptions=True,
        )

        # ── Flatten + filter + rank ─────────────────────────────────────────
        found: list[dict] = []
        for folder, result in zip(folders, folder_results):
            if isinstance(result, BaseException):
                logger.warning("Drive list failed for folder %s: %s", folder.folder_id, result)
                continue
            files, _creds = result
            for f in files:
                name = (f.get("name") or "").lower()
                mime = (f.get("mimeType") or "").lower()

                if query_text and query_text not in name:
                    continue
                if mime_filter and mime_filter not in mime:
                    continue

                found.append({
                    "id": f.get("id"),
                    "name": f.get("name"),
                    "mime_type": f.get("mimeType"),
                    "folder_name": folder.folder_name or "(dossier)",
                    "modified_at": f.get("modifiedTime"),
                    "web_view_link": f.get("webViewLink"),
                    "size_bytes": int(f.get("size") or 0) if f.get("size") else None,
                })

        # Most recently modified first.
        found.sort(key=lambda x: x.get("modified_at") or "", reverse=True)
        found = found[:limit]

        return SkillResult(
            success=True,
            data={
                "files": found,
                "count": len(found),
                "folders_searched": [f.folder_name for f in folders],
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"search_drive_documents failed: {exc}",
        )


def _get_db(context: Any):
    if context is None:
        return None
    if isinstance(context, dict):
        return context.get("db")
    return getattr(context, "db", None)


def _get_user_id(context: Any) -> str:
    if context is None:
        return ""
    if isinstance(context, dict):
        return context.get("user_id") or ""
    return getattr(context, "user_id", "") or ""
