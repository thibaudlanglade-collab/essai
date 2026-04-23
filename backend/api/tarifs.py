"""Grille tarifaire router (Sprint 3).

Each prospect has a grid of unit prices (`tarif_grids`) used as reference by
the devis generator. A BTP seed is inserted at tenant creation; the prospect
can then list, create, update and delete entries. All endpoints are strictly
scoped by `user_id`.

Endpoints:
  GET    /api/tarifs            → list the prospect's tarifs
  POST   /api/tarifs            → create a new tarif
  PUT    /api/tarifs/{id}       → update a tarif
  DELETE /api/tarifs/{id}       → delete a tarif
"""
from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import AccessToken, TarifGrid

logger = logging.getLogger(__name__)

tarifs_router = APIRouter(prefix="/tarifs")


_KEY_RE = re.compile(r"^[a-z0-9_]+$")
_VALID_UNITS = {"m²", "m2", "m³", "m3", "ml", "u", "h", "j", "forfait"}


def _sanitize_tarif_payload(body: dict[str, Any], *, require_key: bool = True) -> dict[str, Any]:
    """Normalise and validate fields for a create/update payload.

    When `require_key=False`, the `key` field is optional and only validated
    if present (used by PUT where the client may keep the original key).
    """
    key = (body.get("key") or "").strip().lower() if body.get("key") is not None else None
    if require_key and not key:
        raise HTTPException(400, "Le code (key) du tarif est requis.")
    if key is not None:
        if len(key) > 100:
            raise HTTPException(400, "Le code doit faire moins de 100 caractères.")
        if not _KEY_RE.match(key):
            raise HTTPException(
                400,
                "Le code ne peut contenir que des lettres minuscules, chiffres et underscores.",
            )

    label = (body.get("label") or "").strip()
    if not label:
        raise HTTPException(400, "Le libellé est requis.")
    if len(label) > 255:
        raise HTTPException(400, "Le libellé doit faire moins de 255 caractères.")

    unit = (body.get("unit") or "").strip()
    if not unit:
        raise HTTPException(400, "L'unité est requise.")
    if unit.lower() not in {u.lower() for u in _VALID_UNITS}:
        raise HTTPException(
            400,
            "Unité non reconnue. Unités acceptées : m², m³, ml, u, h, j, forfait.",
        )

    try:
        unit_price_ht = float(body.get("unit_price_ht"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Le prix unitaire HT est requis (nombre).")
    if unit_price_ht < 0:
        raise HTTPException(400, "Le prix unitaire HT ne peut pas être négatif.")
    if unit_price_ht > 99999999.99:
        raise HTTPException(400, "Le prix unitaire HT dépasse la limite autorisée.")

    vat_rate_raw = body.get("vat_rate")
    if vat_rate_raw is None:
        vat_rate = 0.20
    else:
        try:
            vat_rate = float(vat_rate_raw)
        except (TypeError, ValueError):
            raise HTTPException(400, "Le taux de TVA doit être un nombre entre 0 et 1.")
    if not 0 <= vat_rate <= 1:
        raise HTTPException(400, "Le taux de TVA doit être compris entre 0 et 1 (ex : 0.20 pour 20 %).")

    category_raw = body.get("category")
    category = str(category_raw).strip() if category_raw is not None else None
    if category == "":
        category = None
    if category is not None and len(category) > 100:
        raise HTTPException(400, "La catégorie doit faire moins de 100 caractères.")

    payload = {
        "label": label,
        "unit": unit,
        "unit_price_ht": unit_price_ht,
        "vat_rate": vat_rate,
        "category": category,
    }
    if key is not None:
        payload["key"] = key
    return payload


async def _get_owned_tarif(db: AsyncSession, user_id: str, tarif_id: str) -> TarifGrid | None:
    res = await db.execute(
        select(TarifGrid).where(
            TarifGrid.id == tarif_id,
            TarifGrid.user_id == user_id,
        )
    )
    return res.scalar_one_or_none()


@tarifs_router.get("")
async def list_tarifs(
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> list[dict[str, Any]]:
    res = await db.execute(
        select(TarifGrid)
        .where(TarifGrid.user_id == user.id)
        .order_by(TarifGrid.category.asc().nulls_last(), TarifGrid.label.asc())
    )
    return [t.to_dict() for t in res.scalars().all()]


@tarifs_router.post("")
async def create_tarif(
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    payload = _sanitize_tarif_payload(body, require_key=True)
    tarif = TarifGrid(user_id=user.id, is_seed=False, **payload)
    db.add(tarif)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Un tarif avec ce code existe déjà.")
    await db.refresh(tarif)
    return tarif.to_dict()


@tarifs_router.put("/{tarif_id}")
async def update_tarif(
    tarif_id: str,
    body: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, Any]:
    tarif = await _get_owned_tarif(db, user.id, tarif_id)
    if tarif is None:
        raise HTTPException(404, "Tarif introuvable.")

    # The key is optional on update — only validated if supplied.
    payload = _sanitize_tarif_payload(body, require_key=False)
    for field, value in payload.items():
        setattr(tarif, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Un tarif avec ce code existe déjà.")
    await db.refresh(tarif)
    return tarif.to_dict()


@tarifs_router.delete("/{tarif_id}")
async def delete_tarif(
    tarif_id: str,
    db: AsyncSession = Depends(get_db),
    user: AccessToken = Depends(get_current_user),
) -> dict[str, bool]:
    tarif = await _get_owned_tarif(db, user.id, tarif_id)
    if tarif is None:
        raise HTTPException(404, "Tarif introuvable.")
    await db.delete(tarif)
    await db.commit()
    return {"success": True}
