"""
Skill: generate_team_schedule
Purpose: Generate a weekly team schedule by assigning tasks to employees,
         respecting availability constraints and matching required skills.
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta
from typing import Any

from skills.base import SkillResult

SKILL_ID = "generate_team_schedule"
DESCRIPTION = "Generate a weekly team schedule from parsed tasks and employee lists"
TASK_TYPE = "planning"

TOOL_SCHEMA = {
    "name": "generate_team_schedule",
    "description": (
        "Generate an optimized weekly team schedule. Takes a list of tasks and a list of "
        "employees, then produces a day-by-day assignment plan that respects availability, "
        "working hours, skill matching, deadlines, and priorities. "
        "Call this after parse_production_plan and parse_employee_list."
    ),
    "when_to_use": [
        "Both tasks and employees have been parsed and are available in state",
        "User wants to generate a team schedule or planning",
        "Final step after extracting tasks and employees",
    ],
    "when_not_to_use": [
        "Tasks or employees have not been parsed yet",
        "User only wants to see tasks or employees without scheduling",
    ],
    "input_schema": {
        "type": "object",
        "properties": {
            "tasks_ref": {
                "type": "string",
                "description": (
                    "State key reference to the list of tasks "
                    "(output of parse_production_plan, e.g. $state.tasks)"
                ),
            },
            "employees_ref": {
                "type": "string",
                "description": (
                    "State key reference to the list of employees "
                    "(output of parse_employee_list, e.g. $state.employees)"
                ),
            },
            "week_start": {
                "type": "string",
                "description": (
                    "Week start date as YYYY-MM-DD. "
                    "Use $state.week_start if available, otherwise omit for next Monday."
                ),
            },
            "constraints_text": {
                "type": "string",
                "description": (
                    "Optional free-text scheduling constraints from the user "
                    "(e.g. 'No Friday afternoons', 'Alice must handle client X'). "
                    "Use $state.user_request if available."
                ),
            },
        },
        "required": ["tasks_ref", "employees_ref"],
    },
}

_DAY_NAMES = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
]

_SCHEDULE_SCHEMA = """\
{
  "week_start": "YYYY-MM-DD",
  "week_end": "YYYY-MM-DD",
  "assignments": [
    {
      "task_id": "string",
      "task_name": "string",
      "employee_id": "string",
      "employee_name": "string",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration_hours": number,
      "client": "string or null"
    }
  ],
  "unassigned_tasks": [
    {
      "task_id": "string",
      "task_name": "string",
      "reason": "string"
    }
  ],
  "warnings": ["string"]
}\
"""


def _next_monday() -> str:
    today = date.today()
    days_ahead = -today.weekday()  # Monday = 0
    if days_ahead <= 0:
        days_ahead += 7
    return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def _week_end(week_start_str: str) -> str:
    d = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    return (d + timedelta(days=6)).strftime("%Y-%m-%d")


def _build_system_prompt(
    tasks: list,
    employees: list,
    week_start: str,
    constraints_text: str,
) -> str:
    week_end_str = _week_end(week_start)
    tasks_json = json.dumps(tasks, ensure_ascii=False, indent=2)
    employees_json = json.dumps(employees, ensure_ascii=False, indent=2)

    return (
        "Tu es un expert en planification d'équipe pour cabinets professionnels français. "
        "Tu réponds toujours en français pour toute explication ou commentaire. "
        "Tu retournes du JSON strictement valide selon le schéma demandé.\n\n"
        f"TÂCHES À PLANIFIER:\n{tasks_json}\n\n"
        f"EMPLOYÉS:\n{employees_json}\n\n"
        f"SEMAINE: {week_start} au {week_end_str}\n\n"
        f"CONTRAINTES UTILISATEUR:\n{constraints_text or 'Aucune'}\n\n"
        "RÈGLES DE PLANIFICATION:\n"
        "1. Respecter les jours de travail de chaque employé (working_days) — "
        "ne jamais assigner un employé un jour où il ne travaille pas\n"
        "2. Respecter les dates d'indisponibilité (unavailable_dates) — "
        "ne jamais assigner un employé sur ces dates\n"
        "3. Ne pas dépasser le total d'heures hebdomadaires (hours_per_week) par employé\n"
        "4. Essayer de faire correspondre les compétences requises (required_skills) "
        "aux compétences des employés\n"
        "5. Prioriser les tâches : priorité haute en premier, puis par date limite la plus proche\n"
        "6. Planifier le travail entre 08:00 et 19:00\n"
        "7. Répartir équitablement la charge de travail dans l'équipe\n"
        "8. Si une tâche ne peut pas être assignée (aucun employé disponible ou compétent), "
        "l'ajouter à unassigned_tasks avec une explication claire en français\n"
        "9. Ajouter des avertissements (warnings) en français pour tout problème notable\n\n"
        "Avant de valider ton planning, vérifie qu'AUCUN employé n'a zéro tâche si d'autres "
        "employés ont plusieurs tâches. Répartis équitablement en tenant compte des compétences "
        "et disponibilités.\n\n"
        "RÈGLES STRICTES À NE JAMAIS VIOLER:\n\n"
        "1. Un employé ne peut JAMAIS être assigné un jour qui n'est pas dans son tableau "
        "working_days. Exemple: si working_days=['monday','tuesday','wednesday','thursday',"
        "'friday'], samedi et dimanche sont INTERDITS pour cet employé.\n\n"
        "2. Un employé ne peut JAMAIS être assigné sur une date présente dans son tableau "
        "unavailable_dates.\n\n"
        "3. La somme des duration_hours assignées à un employé sur la semaine ne doit JAMAIS "
        "dépasser son hours_per_week.\n\n"
        "4. Tous les créneaux horaires doivent être entre 08:00 et 19:00.\n\n"
        "5. Si une tâche ne peut pas être assignée en respectant toutes ces règles, place-la "
        "dans unassigned_tasks avec une explication dans warnings. Ne viole JAMAIS une règle "
        "pour forcer une assignation.\n\n"
        "6. Équilibre la charge de travail entre les employés autant que possible. Ne laisse "
        "pas un employé sans tâche si d'autres sont surchargés, sauf si ses compétences ou "
        "disponibilités l'empêchent réellement de prendre les tâches disponibles.\n\n"
        "Retourne UNIQUEMENT du JSON valide correspondant exactement à ce schéma — "
        "sans markdown, sans commentaire:\n"
        f"{_SCHEDULE_SCHEMA}"
    )


def _extract_json(raw: str) -> dict | None:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    return None


def _validate_schedule(schedule: dict, employees: list) -> list[str]:
    """
    Post-LLM validation. Returns a list of violation strings in French.
    Does NOT mutate the schedule structure.
    """
    violations: list[str] = []

    # Build employee lookup
    emp_map: dict[str, dict] = {
        e["id"]: e for e in employees if isinstance(e, dict) and "id" in e
    }

    # Track hours per employee
    hours_by_emp: dict[str, float] = {eid: 0.0 for eid in emp_map}

    for assignment in schedule.get("assignments", []):
        if not isinstance(assignment, dict):
            continue

        eid = assignment.get("employee_id", "")
        emp = emp_map.get(eid)
        if emp is None:
            continue

        # Hours tracking
        duration = assignment.get("duration_hours", 0)
        if isinstance(duration, (int, float)):
            hours_by_emp[eid] = hours_by_emp.get(eid, 0.0) + float(duration)

        # Check unavailable dates
        assign_date = assignment.get("date", "")
        unavailable = emp.get("unavailable_dates", [])
        if assign_date in unavailable:
            violations.append(
                f"Violation: {emp.get('name', eid)} n'est pas disponible le {assign_date} "
                f"mais a été assigné à la tâche '{assignment.get('task_name', '?')}'"
            )

        # Check working days
        try:
            day_index = datetime.strptime(assign_date, "%Y-%m-%d").weekday()
            day_name = _DAY_NAMES[day_index]
            working_days = emp.get("working_days", _DAY_NAMES[:5])
            if day_name not in working_days:
                violations.append(
                    f"Violation: {emp.get('name', eid)} ne travaille pas le "
                    f"{day_name} mais a été assigné à la tâche "
                    f"'{assignment.get('task_name', '?')}' le {assign_date}"
                )
        except (ValueError, IndexError):
            pass

        # Check working hours bounds (08:00 – 19:00)
        start_time = assignment.get("start_time", "")
        end_time = assignment.get("end_time", "")
        if start_time and start_time < "08:00":
            violations.append(
                f"Avertissement: la tâche '{assignment.get('task_name', '?')}' pour "
                f"{emp.get('name', eid)} commence avant 08:00 ({start_time})"
            )
        if end_time and end_time > "19:00":
            violations.append(
                f"Avertissement: la tâche '{assignment.get('task_name', '?')}' pour "
                f"{emp.get('name', eid)} se termine après 19:00 ({end_time})"
            )

    # Check weekly hour caps
    for eid, emp in emp_map.items():
        cap = emp.get("hours_per_week", 35)
        actual = hours_by_emp.get(eid, 0.0)
        if actual > cap:
            violations.append(
                f"Violation: {emp.get('name', eid)} est assigné {actual:.1f}h "
                f"alors que son plafond hebdomadaire est de {cap}h"
            )

    return violations


async def execute(input_data: dict, context: Any) -> SkillResult:
    try:
        from openai import AsyncOpenAI
        from router.model_router import get_model
        import config

        tasks: Any = input_data.get("tasks_ref")
        employees: Any = input_data.get("employees_ref")
        week_start: str = input_data.get("week_start") or _next_monday()
        constraints_text: str = input_data.get("constraints_text") or ""

        if not isinstance(tasks, list):
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"generate_team_schedule: 'tasks_ref' must resolve to a list, "
                    f"got {type(tasks).__name__}"
                ),
            )

        if not isinstance(employees, list):
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"generate_team_schedule: 'employees_ref' must resolve to a list, "
                    f"got {type(employees).__name__}"
                ),
            )

        if not tasks:
            return SkillResult(
                success=False,
                data=None,
                error="generate_team_schedule: tasks list is empty — nothing to schedule",
            )

        if not employees:
            return SkillResult(
                success=False,
                data=None,
                error="generate_team_schedule: employees list is empty — no one to assign to",
            )

        system_prompt = _build_system_prompt(tasks, employees, week_start, constraints_text)

        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        model = get_model(TASK_TYPE)

        # ── First LLM call ────────────────────────────────────────────────────
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Génère le planning hebdomadaire maintenant."},
            ],
            max_tokens=8192,
        )

        raw_output = response.choices[0].message.content or ""
        first_schedule = _extract_json(raw_output)

        if first_schedule is None:
            return SkillResult(
                success=False,
                data=None,
                error=(
                    f"generate_team_schedule: LLM did not return valid JSON. "
                    f"Raw output: {raw_output[:300]}"
                ),
            )

        # Ensure required fields exist
        first_schedule.setdefault("week_start", week_start)
        first_schedule.setdefault("week_end", _week_end(week_start))
        first_schedule.setdefault("assignments", [])
        first_schedule.setdefault("unassigned_tasks", [])
        first_schedule.setdefault("warnings", [])

        # ── Validation + self-correction loop ─────────────────────────────────
        first_violations = _validate_schedule(first_schedule, employees)
        first_violations_count = len(first_violations)

        schedule: dict
        second_violations_count: int | None = None
        correction_applied: bool = False

        if first_violations_count == 0:
            # No violations — use the first schedule as-is
            schedule = first_schedule

        else:
            # Build correction prompt in French
            violations_text = "\n".join(f"- {v}" for v in first_violations)
            correction_prompt = (
                f"Le planning que tu as généré viole {first_violations_count} règle(s) "
                f"stricte(s). Voici les violations détectées:\n\n"
                f"{violations_text}\n\n"
                f"Voici le planning à corriger (JSON):\n"
                f"{json.dumps(first_schedule, ensure_ascii=False, indent=2)}\n\n"
                f"Corrige ce planning pour respecter TOUTES les règles strictes. "
                f"Si une tâche ne peut pas être corrigée, déplace-la dans "
                f"unassigned_tasks. Retourne UNIQUEMENT le JSON corrigé complet, "
                f"sans explication."
            )

            try:
                correction_response = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": correction_prompt},
                    ],
                    max_tokens=8192,
                )
                corrected_raw = correction_response.choices[0].message.content or ""
                corrected_schedule = _extract_json(corrected_raw)

                if corrected_schedule is not None:
                    corrected_schedule.setdefault("week_start", week_start)
                    corrected_schedule.setdefault("week_end", _week_end(week_start))
                    corrected_schedule.setdefault("assignments", [])
                    corrected_schedule.setdefault("unassigned_tasks", [])
                    corrected_schedule.setdefault("warnings", [])

                    second_violations = _validate_schedule(corrected_schedule, employees)
                    second_violations_count = len(second_violations)
                    if second_violations:
                        existing = corrected_schedule.get("warnings") or []
                        corrected_schedule["warnings"] = existing + second_violations

                    # Insert auto-correction notice at the front of warnings
                    corrected_schedule["warnings"].insert(
                        0,
                        f"Le planning a été corrigé automatiquement suite à "
                        f"{first_violations_count} violation(s) détectée(s) lors du premier passage."
                    )

                    schedule = corrected_schedule
                    correction_applied = True

                else:
                    # Corrected schedule JSON is invalid — keep first schedule
                    first_schedule["warnings"].extend(first_violations)
                    first_schedule["warnings"].append(
                        "La tentative de correction automatique a échoué "
                        "(réponse JSON invalide). Le planning original est conservé."
                    )
                    schedule = first_schedule

            except Exception:
                # Second LLM call failed — keep first schedule
                first_schedule["warnings"].extend(first_violations)
                first_schedule["warnings"].append(
                    "La tentative de correction automatique a échoué "
                    "(erreur lors de l'appel au modèle). Le planning original est conservé."
                )
                schedule = first_schedule

        total_assignments = len(schedule["assignments"])
        unassigned_count = len(schedule["unassigned_tasks"])
        warnings_count = len(schedule["warnings"])

        return SkillResult(
            success=True,
            data=schedule,
            debug={
                "total_assignments": total_assignments,
                "unassigned_count": unassigned_count,
                "warnings_count": warnings_count,
                "first_attempt_violations": first_violations_count,
                "second_attempt_violations": second_violations_count,
                "correction_applied": correction_applied,
            },
        )

    except Exception as exc:
        return SkillResult(
            success=False,
            data=None,
            error=f"generate_team_schedule failed: {exc}",
        )
