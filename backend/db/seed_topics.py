"""
Seed the email_topics table with 8 default topics on first startup.
"""
from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import EmailTopic

logger = logging.getLogger(__name__)

DEFAULT_TOPICS = [
    {
        "name": "Travail-Interne",
        "description": "Emails de collègues, communications internes à l'entreprise, messages d'équipe.",
        "color": "#3b82f6",
        "display_order": 1,
    },
    {
        "name": "Travail-Client",
        "description": "Emails de clients externes, demandes, questions professionnelles venant de l'extérieur.",
        "color": "#8b5cf6",
        "display_order": 2,
    },
    {
        "name": "Personnel",
        "description": "Emails d'amis, de famille, communications personnelles non liées au travail.",
        "color": "#ec4899",
        "display_order": 3,
    },
    {
        "name": "Newsletter",
        "description": "Newsletters, bulletins d'information, emails d'abonnements (blogs, podcasts, médias).",
        "color": "#10b981",
        "display_order": 4,
    },
    {
        "name": "Admin-Factures",
        "description": "Factures reçues, devis, relances de paiement, documents administratifs, URSSAF, impôts.",
        "color": "#f59e0b",
        "display_order": 5,
    },
    {
        "name": "Promo-Marketing",
        "description": "Offres commerciales, promotions, publicités, emails marketing non sollicités.",
        "color": "#ef4444",
        "display_order": 6,
    },
    {
        "name": "Notifications-Système",
        "description": "Notifications automatiques de services (GitHub, Slack, Google, etc.), alertes système, confirmations de compte.",
        "color": "#6b7280",
        "display_order": 7,
    },
    {
        "name": "Autre",
        "description": "Emails qui ne correspondent à aucune autre catégorie.",
        "color": "#52525b",
        "display_order": 99,
    },
]


async def seed_default_topics(db: AsyncSession) -> None:
    """Insert the 8 default topics if the table is empty."""
    count = (await db.execute(select(func.count(EmailTopic.id)))).scalar_one()
    if count > 0:
        logger.info("email_topics already seeded (%d topics), skipping.", count)
        return

    for topic_data in DEFAULT_TOPICS:
        topic = EmailTopic(
            name=topic_data["name"],
            description=topic_data["description"],
            color=topic_data["color"],
            display_order=topic_data["display_order"],
            is_default=True,
        )
        db.add(topic)

    await db.commit()
    logger.info("Seeded %d default email topics.", len(DEFAULT_TOPICS))
