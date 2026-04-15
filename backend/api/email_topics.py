"""
FastAPI router: /email-topics — CRUD for email classification topics.
Registered with prefix="/api" in main.py → final paths are /api/email-topics/...
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Email, EmailTopic
from db.seed_topics import DEFAULT_TOPICS, seed_default_topics

logger = logging.getLogger(__name__)

email_topics_router = APIRouter(prefix="/email-topics")


@email_topics_router.get("")
async def list_topics(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Return all topics sorted by display_order ASC."""
    result = await db.execute(
        select(EmailTopic).order_by(EmailTopic.display_order.asc())
    )
    topics = result.scalars().all()
    return [t.to_dict() for t in topics]


@email_topics_router.post("")
async def create_topic(
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new user-defined topic."""
    name: str = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Le nom du topic est requis.")

    # Check uniqueness
    existing = (
        await db.execute(select(EmailTopic).where(EmailTopic.name == name))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=409, detail=f"Un topic nommé '{name}' existe déjà."
        )

    topic = EmailTopic(
        name=name,
        description=body.get("description") or None,
        color=body.get("color") or "#6b7280",
        display_order=int(body.get("display_order") or 0),
        is_default=False,
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic.to_dict()


@email_topics_router.put("/{topic_id}")
async def update_topic(
    topic_id: int,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Partial update of a topic (name, description, color, display_order)."""
    topic = await db.get(EmailTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} introuvable.")

    if "name" in body:
        new_name = (body["name"] or "").strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Le nom ne peut pas être vide.")
        # Check uniqueness only if name changes
        if new_name != topic.name:
            conflict = (
                await db.execute(
                    select(EmailTopic).where(EmailTopic.name == new_name)
                )
            ).scalar_one_or_none()
            if conflict is not None:
                raise HTTPException(
                    status_code=409,
                    detail=f"Un topic nommé '{new_name}' existe déjà.",
                )
        topic.name = new_name

    if "description" in body:
        topic.description = body["description"] or None
    if "color" in body:
        topic.color = body["color"] or "#6b7280"
    if "display_order" in body:
        topic.display_order = int(body["display_order"] or 0)

    await db.commit()
    await db.refresh(topic)
    return topic.to_dict()


@email_topics_router.delete("/{topic_id}")
async def delete_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Delete a topic. The 'Autre' fallback topic cannot be deleted."""
    topic = await db.get(EmailTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} introuvable.")

    if topic.name == "Autre":
        raise HTTPException(
            status_code=400,
            detail="Le topic 'Autre' est le topic de repli et ne peut pas être supprimé.",
        )

    # Nullify all emails that had this topic so they become eligible for reclassification
    await db.execute(
        update(Email).where(Email.topic == topic.name).values(topic=None, classified_at=None)
    )

    await db.delete(topic)
    await db.commit()
    return {"deleted": topic_id}


@email_topics_router.post("/reset-defaults")
async def reset_defaults(
    confirm: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Reset to the 8 default topics. Requires ?confirm=true."""
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Ajoutez ?confirm=true pour confirmer la réinitialisation.",
        )

    # Delete all user-created topics
    result = await db.execute(select(EmailTopic))
    all_topics = result.scalars().all()
    for t in all_topics:
        await db.delete(t)

    # Nullify topic on all emails
    await db.execute(update(Email).values(topic=None, classified_at=None))
    await db.commit()

    # Re-seed defaults
    await seed_default_topics(db)

    result2 = await db.execute(select(EmailTopic).order_by(EmailTopic.display_order.asc()))
    topics = result2.scalars().all()
    return {"reset": True, "topics": [t.to_dict() for t in topics]}
