"""Orchestrator for the tenant-side file classement (brief §6.1, volet 1).

Chains the existing `move_file` skill (rename + move in one op) with
`invoice_tracker.append_invoice_row`. Returns a list of ordered human
steps that the frontend reveals progressively in a toast.

Best-effort: if the source file is missing (e.g. text-only extraction),
we still update the Excel and skip the move. Exceptions on either branch
are converted into a visible "impossible" step instead of a 500.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from pathlib import Path
from typing import Any, Optional

from skills.core import move_file

from services.invoice_tracker import (
    append_invoice_row,
    invoice_year,
)


logger = logging.getLogger(__name__)


_ATTACHMENTS_ROOT = Path(__file__).resolve().parent.parent / "attachments"


# ─────────────────────────────────────────────────────────────────────────────
# Path helpers
# ─────────────────────────────────────────────────────────────────────────────


_UNSAFE_SEGMENT = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')


def _sanitise_segment(value: str) -> str:
    nfd = unicodedata.normalize("NFD", value)
    ascii_only = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    cleaned = _UNSAFE_SEGMENT.sub("_", ascii_only)
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned.strip("._") or "document"


def _sanitise_relative_folder(folder: str) -> Path:
    """Turn `"Factures/Point_P/Avril_2026/"` into a safe relative `Path`.

    Rejects absolute paths + `..` traversal so a tenant can never write
    outside their own sandbox, even if the LLM suggests a weird folder.
    """
    raw = (folder or "").strip().strip("/").strip("\\")
    if not raw:
        return Path("Autres")
    parts: list[str] = []
    for segment in raw.replace("\\", "/").split("/"):
        if not segment or segment in {".", ".."}:
            continue
        parts.append(_sanitise_segment(segment))
    return Path(*parts) if parts else Path("Autres")


def _unique_destination(dest: Path) -> Path:
    """Append ` (1)`, ` (2)`… to the stem when the exact path already exists."""
    if not dest.exists():
        return dest
    stem, ext, parent = dest.stem, dest.suffix, dest.parent
    for n in range(1, 100):
        candidate = parent / f"{stem} ({n}){ext}"
        if not candidate.exists():
            return candidate
    raise OSError(f"Cannot find a unique filename for {dest} after 100 tries.")


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


async def organize_invoice_file(
    *,
    user_id: str,
    source_path: Optional[Path | str],
    target_folder: str,
    final_filename: str,
    invoice_data: dict[str, Any],
) -> dict[str, Any]:
    """Run the two-step classement chain for one invoice.

    Step 1 — move + rename the stored file via the `move_file` skill.
    Step 2 — append a row to Suivi_Factures_<YYYY>.xlsx via `invoice_tracker`.

    Returns `{steps, final_path, excel_path, ok}` for the toast UI.
    """
    steps: list[str] = []
    user_root = _ATTACHMENTS_ROOT / user_id
    user_root.mkdir(parents=True, exist_ok=True)

    final_path: Optional[Path] = None
    excel_path: Optional[Path] = None

    # ── 1. Move + rename via the move_file skill ───────────────────────────
    if source_path:
        src = Path(source_path)
        if not src.is_absolute():
            src = user_root / "extractions" / src.name

        if not src.exists():
            steps.append(
                f"Fichier introuvable à l'emplacement initial ({src.name}), "
                "étape de déplacement ignorée."
            )
        else:
            rel_folder = _sanitise_relative_folder(target_folder)
            dest_name = _sanitise_filename(final_filename, fallback_ext=src.suffix)
            dest = _unique_destination(user_root / "organized" / rel_folder / dest_name)

            move_result = await move_file.execute(
                {
                    "source_path": str(src),
                    "destination_path": str(dest),
                    "create_destination_dir": True,
                    "overwrite": False,
                },
                context=None,
            )
            if move_result.success and isinstance(move_result.data, dict):
                final_path = Path(move_result.data.get("moved_to") or dest)
                steps.append(f"Renommé en {final_path.name}.")
                steps.append(f"Classé dans {rel_folder.as_posix()}/.")
            else:
                steps.append(
                    f"Déplacement du fichier impossible : {move_result.error or 'erreur inconnue'}."
                )
    else:
        steps.append(
            "Aucun fichier joint (document saisi au format texte), "
            "étape de déplacement sautée."
        )

    # ── 2. Update the Excel via invoice_tracker ────────────────────────────
    try:
        year = invoice_year(invoice_data)
        excel_path = user_root / f"Suivi_Factures_{year}.xlsx"
        added, total_rows = append_invoice_row(
            excel_path=excel_path,
            invoice_data=invoice_data,
            target_folder=target_folder,
            final_filename=(final_path.name if final_path else final_filename),
        )
        if added:
            steps.append(
                f"Suivi_Factures_{year}.xlsx mis à jour "
                f"(+1 ligne, {total_rows} lignes au total)."
            )
        else:
            steps.append(
                f"Suivi_Factures_{year}.xlsx déjà à jour (doublon détecté)."
            )
    except Exception as exc:
        logger.warning(
            "excel update failed for user=%s: %s", user_id, exc, exc_info=True
        )
        steps.append(f"Mise à jour de l'Excel impossible : {exc}.")

    return {
        "steps": steps,
        "final_path": str(final_path) if final_path else None,
        "excel_path": str(excel_path) if excel_path else None,
        "ok": bool(steps) and all("impossible" not in s.lower() for s in steps),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Filename sanitisation (kept here so the frontend never sees sanitised paths)
# ─────────────────────────────────────────────────────────────────────────────


def _sanitise_filename(filename: str, fallback_ext: Optional[str] = None) -> str:
    """Clean a filename; preserve the extension; ensure a `.ext` exists."""
    base = Path(filename or "").name or "document"
    stem = Path(base).stem or "document"
    ext = Path(base).suffix
    if not ext:
        ext = fallback_ext or ".pdf"
    cleaned_stem = _sanitise_segment(stem)
    if not ext.startswith("."):
        ext = "." + ext
    return f"{cleaned_stem}{ext}"
