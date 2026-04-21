"""Generate prospect access tokens for the Synthèse test app.

Two sub-commands:

- `create`: mint a single token (useful for Thibaud to test or send manually).
- `from-csv`: bulk-seed from a CSV file, producing an augmented CSV with
  `access_url` appended — ready to import in Instantly.ai.

Run from the `backend/` directory with the venv active:

    python -m scripts.seed_prospects create --name "M. Dupont" \\
        --email contact@dupont-btp.fr --company "Dupont Bâtiment" --days 14

    python -m scripts.seed_prospects from-csv prospects.csv \\
        --output prospects_with_urls.csv --base-url https://synthese.fr

CSV input columns recognised (header names, case-insensitive):
    company_name | company   — required-ish (displayed to the prospect)
    contact_name | name      — optional
    email                    — optional

Other columns are preserved in the output, with `access_url` appended.

This script does **not** seed the BTP demo data (clients, invoices, quotes,
emails). That's Sprint 3's job; until then the prospect's space is empty.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import os
import sys
from pathlib import Path
from typing import Optional

# Make `backend/` importable when running as a module from the backend/ dir.
# `python -m scripts.seed_prospects` already handles this, but running the
# file directly (python scripts/seed_prospects.py) would otherwise fail.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Load .env from backend/ so DATABASE_URL is picked up before importing db.database
try:
    from dotenv import load_dotenv
    load_dotenv(_BACKEND_DIR / ".env")
except ImportError:
    pass

from db.access_tokens import create_token  # noqa: E402
from db.database import async_session_maker, init_db  # noqa: E402


DEFAULT_BASE_URL = os.environ.get("SYNTHESE_BASE_URL", "http://localhost:8000")


async def _ensure_schema() -> None:
    """Create tables if this is the very first run against a fresh DB.

    Safe to call repeatedly — `create_all` is idempotent.
    """
    await init_db()


async def _create_one(
    *,
    prospect_name: Optional[str],
    prospect_email: Optional[str],
    company_name: Optional[str],
    duration_days: int,
    base_url: str,
) -> tuple[str, str]:
    async with async_session_maker() as db:
        token = await create_token(
            db,
            prospect_name=prospect_name,
            prospect_email=prospect_email,
            company_name=company_name,
            duration_days=duration_days,
        )
    url = f"{base_url.rstrip('/')}/app/{token.token}"
    return token.token, url


async def _cmd_create(args: argparse.Namespace) -> None:
    await _ensure_schema()
    token, url = await _create_one(
        prospect_name=args.name,
        prospect_email=args.email,
        company_name=args.company,
        duration_days=args.days,
        base_url=args.base_url,
    )
    label = args.name or args.company or "(anonyme)"
    print(f"Token créé pour {label}")
    print(f"  URL    : {url}")
    print(f"  Jours  : {args.days}")
    print(f"  Token  : {token}")


def _pick(row: dict, *keys: str) -> Optional[str]:
    """Return the first non-empty value among `keys` (case-insensitive)."""
    lower = {k.lower(): v for k, v in row.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v and str(v).strip():
            return str(v).strip()
    return None


async def _cmd_from_csv(args: argparse.Namespace) -> None:
    await _ensure_schema()

    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        raise SystemExit(f"Fichier introuvable : {csv_path}")

    output_rows: list[dict] = []
    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise SystemExit("CSV vide ou sans en-tête.")

        for row in reader:
            company = _pick(row, "company_name", "company", "société", "societe")
            contact = _pick(row, "contact_name", "name", "nom", "contact")
            email = _pick(row, "email", "mail")

            _, url = await _create_one(
                prospect_name=contact,
                prospect_email=email,
                company_name=company,
                duration_days=args.days,
                base_url=args.base_url,
            )
            out_row = dict(row)
            out_row["access_url"] = url
            output_rows.append(out_row)
            print(f"OK {company or contact or email or '(ligne vide)'}  →  {url}")

    if not output_rows:
        print("Aucune ligne à traiter.")
        return

    out_path = Path(args.output) if args.output else csv_path.with_suffix(".with_urls.csv")
    fieldnames = list(output_rows[0].keys())
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    print(f"\n{len(output_rows)} prospects seedés.")
    print(f"Fichier sortie : {out_path}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="seed_prospects",
        description="Mint prospect access tokens for the Synthèse test app.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create", help="Créer un token unique.")
    p_create.add_argument("--name", help="Prénom/Nom du contact", default=None)
    p_create.add_argument("--email", help="Email du prospect", default=None)
    p_create.add_argument("--company", help="Nom de la société", default=None)
    p_create.add_argument(
        "--days", type=int, default=14,
        help="Durée d'accès en jours (défaut : 14)",
    )
    p_create.add_argument(
        "--base-url", default=DEFAULT_BASE_URL,
        help=f"URL de base de l'app (défaut : {DEFAULT_BASE_URL})",
    )
    p_create.set_defaults(func=_cmd_create)

    p_csv = sub.add_parser("from-csv", help="Bulk-seed depuis un CSV.")
    p_csv.add_argument("csv_path", help="Chemin vers le CSV d'entrée.")
    p_csv.add_argument(
        "--output", default=None,
        help="CSV de sortie (défaut : <input>.with_urls.csv)",
    )
    p_csv.add_argument("--days", type=int, default=14)
    p_csv.add_argument("--base-url", default=DEFAULT_BASE_URL)
    p_csv.set_defaults(func=_cmd_from_csv)

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    asyncio.run(args.func(args))


if __name__ == "__main__":
    main()
