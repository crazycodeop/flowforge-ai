import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2 with HMAC-SHA256 and a random 16-byte salt."""
    salt = os.urandom(16).hex()
    iterations = 100_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"{salt}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt$hash using timing-safe comparison."""
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, expected_hash = hashed_password.split("$", 1)
        iterations = 100_000
        dk = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations
        )
        return hmac.compare_digest(dk.hex(), expected_hash)
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Encodes a signed JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodes and verifies a JWT token. Returns payload dict or None if invalid/expired."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
