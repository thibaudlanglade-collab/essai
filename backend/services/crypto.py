"""Fernet-based symmetric encryption for OAuth tokens at rest.

Every OAuth access/refresh token we persist in `oauth_connections` goes
through `encrypt_token` before it touches the database. The key lives in
the `SYNTHESE_FERNET_KEY` env var (base64-urlsafe, 32 bytes decoded).

Dev fallback: if the env var is absent and `SYNTHESE_DEV=1`, we derive a
deterministic key so local iteration works without ceremony. That derived
key is clearly marked as dev-only in the logs and must never leak into
prod — refusing to start when both the key is missing and `SYNTHESE_DEV`
is not set is the safety net.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


_DEV_FALLBACK_SEED = "synthese-dev-only-fernet-fallback-do-not-use-in-prod"


class CryptoConfigError(RuntimeError):
    """Raised when the Fernet key is missing in a production context."""


def _resolve_key() -> bytes:
    raw = os.environ.get("SYNTHESE_FERNET_KEY", "").strip()
    if raw:
        try:
            # Fernet keys are already url-safe base64 of 32 bytes.
            Fernet(raw.encode("ascii"))
            return raw.encode("ascii")
        except Exception as exc:
            raise CryptoConfigError(
                "SYNTHESE_FERNET_KEY is set but invalid (expect a Fernet key, "
                "i.e. base64-urlsafe-encoded 32 bytes). "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            ) from exc

    if os.environ.get("SYNTHESE_DEV") != "1":
        raise CryptoConfigError(
            "SYNTHESE_FERNET_KEY is required outside dev mode. "
            "Generate one with Fernet.generate_key() and set it as an env var."
        )

    # Dev fallback — deterministic so restarts don't lose tokens locally,
    # but very clearly marked.
    digest = hashlib.sha256(_DEV_FALLBACK_SEED.encode("utf-8")).digest()
    dev_key = base64.urlsafe_b64encode(digest)
    logger.warning(
        "Using DEV Fernet key (SYNTHESE_DEV=1). Never set this combination in "
        "production — tokens encrypted with this key would be trivial to decrypt."
    )
    return dev_key


_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_resolve_key())
    return _fernet


def encrypt_token(plaintext: str) -> str:
    """Encrypt a secret string to a base64 ciphertext (str, DB-friendly)."""
    if not isinstance(plaintext, str):
        raise TypeError(f"encrypt_token expects str, got {type(plaintext).__name__}")
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a ciphertext previously produced by `encrypt_token`.

    Raises `CryptoConfigError` if the token was encrypted with a different
    key (rotation / misconfiguration) or is otherwise tampered with.
    """
    if not isinstance(ciphertext, str):
        raise TypeError(f"decrypt_token expects str, got {type(ciphertext).__name__}")
    try:
        return _get_fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise CryptoConfigError(
            "Could not decrypt token: it was likely encrypted with a different "
            "Fernet key. Rotate SYNTHESE_FERNET_KEY only with a re-encryption plan."
        ) from exc
