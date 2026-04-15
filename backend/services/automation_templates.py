"""
Phase G — Pre-configured automation templates.
"""
from __future__ import annotations

TEMPLATES: dict[str, dict] = {
    "doc_inbox": {
        "name": "Extraction auto sur dépôt dossier",
        "description": "Surveille C:\\Synthese\\Inbox et extrait automatiquement chaque PDF déposé",
        "trigger_type": "folder_watch",
        "trigger_config": {
            "folder_path": "C:\\Synthese\\Inbox",
            "extensions": [".pdf"],
        },
        "actions": [
            {
                "skill_id": "extract_file_content",
                "args": {"file_path": "$state.file_path"},
                "output_key": "extracted",
            },
            {
                "skill_id": "classify_document_type",
                "args": {
                    "text_content": "$state.extracted.text",
                    "filename": "$state.file_path",
                },
                "output_key": "classification",
            },
            {
                "skill_id": "rename_file",
                "args": {
                    "file_path": "$state.file_path",
                    "new_name": "$state.classification.suggested_filename",
                    "preserve_extension": True,
                },
                "output_key": "renamed",
            },
            {
                "skill_id": "move_file",
                "args": {
                    "source_path": "$state.renamed.new_path",
                    "destination_path": "C:\\Synthese\\Classified\\$state.classification.document_type",
                    "create_destination_dir": True,
                    "overwrite": False,
                },
                "output_key": "moved",
            },
            {
                "skill_id": "send_desktop_notification",
                "args": {
                    "title": "Document traité ✅",
                    "message": "Fichier classé avec succès dans Synthese\\Classified",
                    "timeout": 8,
                },
                "output_key": "notified",
            },
        ],
        "on_error": "stop",
    },
    "morning_briefing": {
        "name": "Briefing matinal 8h",
        "description": "Notifie chaque matin à 8h que le briefing du jour est disponible dans Synthèse",
        "trigger_type": "cron",
        "trigger_config": {"hour": 8, "minute": 0},
        "actions": [
            {
                "skill_id": "send_desktop_notification",
                "args": {
                    "title": "Ton briefing du jour est prêt ☀️",
                    "message": "Ouvre Synthèse → Emails → Briefing du jour pour voir tes priorités",
                    "timeout": 10,
                },
                "output_key": "notified",
            },
        ],
        "on_error": "continue",
    },
    "urgent_emails": {
        "name": "Tri urgents emails",
        "description": "Notifie immédiatement par notification bureau quand un email urgent arrive",
        "trigger_type": "email_new",
        "trigger_config": {"filter_priority": "urgent"},
        "actions": [
            {
                "skill_id": "send_desktop_notification",
                "args": {
                    "title": "Email urgent reçu ⚡",
                    "message": "Ouvre Synthèse → Emails pour le traiter maintenant",
                    "timeout": 15,
                },
                "output_key": "notified",
            },
        ],
        "on_error": "continue",
    },
}


def get_template(template_id: str) -> dict | None:
    return TEMPLATES.get(template_id)


def list_templates() -> list[dict]:
    return [{"id": k, **v} for k, v in TEMPLATES.items()]
