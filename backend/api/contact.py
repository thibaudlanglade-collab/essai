import logging
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

import config

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactPayload(BaseModel):
    nom: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=254)
    entreprise: Optional[str] = Field(default=None, max_length=200)
    telephone: Optional[str] = Field(default=None, max_length=50)
    message: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v or "." not in v.rsplit("@", 1)[-1]:
            raise ValueError("invalid email")
        return v


def _encode_idna(address: str) -> str:
    """Convert the domain part of an email to IDNA/punycode (SMTP-safe)."""
    if "@" not in address:
        return address
    local, domain = address.rsplit("@", 1)
    try:
        domain_ascii = domain.encode("idna").decode("ascii")
    except UnicodeError:
        domain_ascii = domain
    return f"{local}@{domain_ascii}"


@router.post("/contact")
async def submit_contact(payload: ContactPayload):
    if not config.SMTP_USER or not config.SMTP_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Email service not configured (SMTP_USER / SMTP_PASSWORD missing).",
        )

    subject = f"Nouveau contact — {payload.nom}"
    if payload.entreprise:
        subject += f" ({payload.entreprise})"

    body = (
        f"Nom        : {payload.nom}\n"
        f"Entreprise : {payload.entreprise or '—'}\n"
        f"Email      : {payload.email}\n"
        f"Téléphone  : {payload.telephone or '—'}\n"
        f"\nMessage :\n{payload.message or '—'}\n"
    )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = _encode_idna(config.SMTP_USER)
    msg["To"] = _encode_idna(config.CONTACT_TO_EMAIL)
    msg["Reply-To"] = payload.email
    msg.set_content(body)

    try:
        context = ssl.create_default_context()
        if config.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(
                config.SMTP_HOST, config.SMTP_PORT, context=context, timeout=15
            ) as server:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as server:
                server.starttls(context=context)
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.send_message(msg)
    except smtplib.SMTPException as exc:
        logger.exception(
            "Contact SMTP failure host=%s port=%s user=%s to=%s",
            config.SMTP_HOST, config.SMTP_PORT, config.SMTP_USER, config.CONTACT_TO_EMAIL,
        )
        raise HTTPException(status_code=502, detail=f"SMTP error: {exc}")
    except OSError as exc:
        logger.exception(
            "Contact network failure host=%s port=%s",
            config.SMTP_HOST, config.SMTP_PORT,
        )
        raise HTTPException(status_code=502, detail=f"Network error: {exc}")

    return {"ok": True}
