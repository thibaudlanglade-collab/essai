"""
FastAPI router: /api/employees — CRUD + CSV import for persistent employee records.
"""
from __future__ import annotations

import csv
import io
import json
import re
import unicodedata
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Employee

employees_router = APIRouter(prefix="/employees")

# ── Column name normalization ─────────────────────────────────────────────────

# Accent-insensitive normaliser for CSV header mapping
_COL_ALIASES: dict[str, str] = {
    "nom": "name",
    "name": "name",
    "heures_par_semaine": "hours_per_week",
    "heures": "hours_per_week",
    "hours_per_week": "hours_per_week",
    "jours_travailles": "working_days",
    "jours": "working_days",
    "working_days": "working_days",
    "competences": "skills",
    "skills": "skills",
    "indisponibilites": "unavailable_dates",
    "indisponible": "unavailable_dates",
    "unavailable_dates": "unavailable_dates",
    "email": "email",
    "telephone": "phone",
    "tel": "phone",
    "phone": "phone",
    "poste": "position",
    "position": "position",
    "date_embauche": "hire_date",
    "hire_date": "hire_date",
    "notes": "notes",
    "remarques": "notes",
}

# French day names → English lowercase
_FR_DAY_MAP: dict[str, str] = {
    "lundi": "monday", "monday": "monday", "lun": "monday", "mon": "monday",
    "mardi": "tuesday", "tuesday": "tuesday", "mar": "tuesday", "tue": "tuesday",
    "mercredi": "wednesday", "wednesday": "wednesday", "mer": "wednesday", "wed": "wednesday",
    "jeudi": "thursday", "thursday": "thursday", "jeu": "thursday", "thu": "thursday",
    "vendredi": "friday", "friday": "friday", "ven": "friday", "fri": "friday",
    "samedi": "saturday", "saturday": "saturday", "sam": "saturday", "sat": "saturday",
    "dimanche": "sunday", "sunday": "sunday", "dim": "sunday", "sun": "sunday",
}


def _strip_accents(s: str) -> str:
    nfd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _normalise_col(raw: str) -> str:
    return _strip_accents(raw.strip().lower()).replace(" ", "_").replace("-", "_")


def _map_col(raw: str) -> str | None:
    return _COL_ALIASES.get(_normalise_col(raw))


def _parse_days(raw: str) -> list[str]:
    """Parse a comma/semicolon/space-separated list of day names to English lowercase."""
    parts = re.split(r"[,;\s]+", raw.strip())
    result = []
    for p in parts:
        key = _strip_accents(p.strip().lower())
        if key in _FR_DAY_MAP:
            result.append(_FR_DAY_MAP[key])
    return result


def _parse_list(raw: str) -> list[str]:
    """Split on comma or pipe, strip each element."""
    return [x.strip() for x in re.split(r"[,|]", raw) if x.strip()]


def _parse_dates(raw: str) -> list[str]:
    """Extract YYYY-MM-DD dates from a raw string."""
    return re.findall(r"\d{4}-\d{2}-\d{2}", raw)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@employees_router.get("")
async def list_employees(db: AsyncSession = Depends(get_db)):
    """Return all employees sorted by name."""
    result = await db.execute(select(Employee).order_by(Employee.name))
    employees = result.scalars().all()
    return [e.to_dict() for e in employees]


@employees_router.post("")
async def create_employee(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee. Validates that name is non-empty."""
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Le champ 'name' est obligatoire.")

    body["name"] = name
    employee = Employee.from_dict(body)
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee.to_dict()


@employees_router.get("/{employee_id}")
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    """Return a single employee by id."""
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail=f"Employé {employee_id} introuvable.")
    return employee.to_dict()


@employees_router.put("/{employee_id}")
async def update_employee(
    employee_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """Partial update of an employee. Returns the updated record."""
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail=f"Employé {employee_id} introuvable.")

    # Apply provided fields
    if "name" in body:
        name = (body["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=422, detail="Le champ 'name' ne peut pas être vide.")
        employee.name = name

    if "hours_per_week" in body:
        employee.hours_per_week = float(body["hours_per_week"])

    if "working_days" in body:
        wd = body["working_days"]
        employee.working_days = json.dumps(wd if isinstance(wd, list) else [])

    if "skills" in body:
        sk = body["skills"]
        employee.skills = json.dumps(sk if isinstance(sk, list) else [])

    if "unavailable_dates" in body:
        ud = body["unavailable_dates"]
        employee.unavailable_dates = json.dumps(ud if isinstance(ud, list) else [])

    for field in ("email", "phone", "position", "hire_date", "notes"):
        if field in body:
            setattr(employee, field, body[field] or None)

    await db.commit()
    await db.refresh(employee)
    return employee.to_dict()


@employees_router.delete("/{employee_id}")
async def delete_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a single employee."""
    employee = await db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=404, detail=f"Employé {employee_id} introuvable.")
    await db.delete(employee)
    await db.commit()
    return {"success": True, "deleted_id": employee_id}


@employees_router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Import employees from a CSV file.
    Supports comma and semicolon separators; handles UTF-8 BOM.
    """
    raw_bytes = await file.read()
    # utf-8-sig handles BOM automatically
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw_bytes.decode("latin-1")

    # Auto-detect separator
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(text[:2048], delimiters=",;")
    except csv.Error:
        dialect = csv.excel  # type: ignore[assignment]

    reader = csv.DictReader(io.StringIO(text), dialect=dialect)

    imported_count = 0
    skipped_count = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 = header
        # Map column names
        mapped: dict[str, str] = {}
        for raw_col, value in row.items():
            canonical = _map_col(raw_col or "")
            if canonical:
                mapped[canonical] = (value or "").strip()

        name = mapped.get("name", "").strip()
        if not name:
            errors.append(f"Ligne {row_num}: nom manquant — ligne ignorée.")
            skipped_count += 1
            continue

        # Parse fields
        hours_raw = mapped.get("hours_per_week", "35")
        try:
            hours = float(hours_raw) if hours_raw else 35.0
        except ValueError:
            hours = 35.0

        days_raw = mapped.get("working_days", "")
        working_days = _parse_days(days_raw) if days_raw else [
            "monday", "tuesday", "wednesday", "thursday", "friday"
        ]

        skills_raw = mapped.get("skills", "")
        skills = _parse_list(skills_raw) if skills_raw else []

        dates_raw = mapped.get("unavailable_dates", "")
        unavailable_dates = _parse_dates(dates_raw) if dates_raw else []

        try:
            employee = Employee(
                name=name,
                hours_per_week=hours,
                working_days=json.dumps(working_days),
                skills=json.dumps(skills),
                unavailable_dates=json.dumps(unavailable_dates),
                email=mapped.get("email") or None,
                phone=mapped.get("phone") or None,
                position=mapped.get("position") or None,
                hire_date=mapped.get("hire_date") or None,
                notes=mapped.get("notes") or None,
            )
            db.add(employee)
            imported_count += 1
        except Exception as exc:
            errors.append(f"Ligne {row_num}: erreur lors de l'import — {exc}")
            skipped_count += 1

    await db.commit()

    return {
        "success": True,
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors,
    }


@employees_router.post("/bulk-delete")
async def bulk_delete(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple employees by id."""
    ids: list[int] = body.get("ids", [])
    if not ids:
        return {"deleted_count": 0}

    result = await db.execute(select(Employee).where(Employee.id.in_(ids)))
    employees = result.scalars().all()
    for e in employees:
        await db.delete(e)
    await db.commit()
    return {"deleted_count": len(employees)}
