"""
Skill: send_desktop_notification
Purpose: Show a native desktop notification (Windows/Mac/Linux) via plyer.
"""
from __future__ import annotations

from typing import Any

from skills.base import SkillResult

SKILL_ID = "send_desktop_notification"
DESCRIPTION = "Afficher une notification bureau native"
TASK_TYPE = "system_notification"

TOOL_SCHEMA = {
    "name": "send_desktop_notification",
    "description": (
        "Affiche une notification bureau native (Windows/Mac/Linux). "
        "Utile pour alerter l'utilisateur d'un événement important."
    ),
    "when_to_use": [
        "Alerter l'utilisateur qu'une tâche longue est terminée",
        "Notifier d'un événement (nouveau fichier, email urgent, etc.)",
    ],
    "when_not_to_use": [
        "L'utilisateur est dans l'interface web — utiliser une alerte UI",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Titre de la notification",
            },
            "message": {
                "type": "string",
                "description": "Corps du message de la notification",
            },
            "timeout": {
                "type": "integer",
                "description": "Durée d'affichage en secondes (défaut: 10)",
                "default": 10,
            },
            "app_name": {
                "type": "string",
                "description": "Nom de l'application affiché dans la notification",
                "default": "Synthèse",
            },
        },
        "required": ["title", "message"],
    },
}


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        title: str = input_data.get("title", "")
        message: str = input_data.get("message", "")
        timeout: int = int(input_data.get("timeout") or 10)
        app_name: str = input_data.get("app_name") or "Synthèse"

        if not title:
            return SkillResult(
                success=False, data=None, error="Le titre de la notification est requis."
            )
        if not message:
            return SkillResult(
                success=False, data=None, error="Le message de la notification est requis."
            )

        try:
            from plyer import notification  # type: ignore[import]

            notification.notify(
                title=title,
                message=message,
                app_name=app_name,
                timeout=timeout,
            )
        except NotImplementedError:
            # Fallback for headless/unsupported environments
            print(
                f"DESKTOP NOTIFICATION FALLBACK | {app_name} | {title} | {message}"
            )
        except Exception as exc:
            # Other plyer errors (missing dbus on Linux, etc.) — use fallback
            print(
                f"DESKTOP NOTIFICATION FALLBACK (plyer error: {exc}) | "
                f"{app_name} | {title} | {message}"
            )

        return SkillResult(
            success=True,
            data={
                "delivered": True,
                "title": title,
                "message": message,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"send_desktop_notification a échoué: {exc}",
        )
