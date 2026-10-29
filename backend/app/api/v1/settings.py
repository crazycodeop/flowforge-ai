import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.factory import get_ai_provider
from app.api.deps import require_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["Settings"])


class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8)


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    role: str
    created_at: str


class AIProviderStatusResponse(BaseModel):
    provider: str
    model: str
    base_url: str | None = None
    api_key_configured: bool
    api_key_masked: str | None = None
    request_timeout: int
    max_retries: int


@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(user: Annotated[User, Depends(require_user)]) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at.isoformat(),
    )


@router.put("/profile", response_model=UserProfileResponse)
def update_user_profile(
    payload: ProfileUpdate,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    user.full_name = payload.full_name
    db.commit()
    db.refresh(user)
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at.isoformat(),
    )


@router.post("/password")
def change_password(
    payload: PasswordChange,
    user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.get("/ai", response_model=AIProviderStatusResponse)
def get_ai_status(user: Annotated[User, Depends(require_user)]) -> AIProviderStatusResponse:
    settings = get_settings()
    raw_key = settings.AI_API_KEY
    masked = None
    if raw_key and len(raw_key) > 8:
        masked = f"{raw_key[:4]}...{raw_key[-4:]}"
    elif raw_key:
        masked = "****"

    return AIProviderStatusResponse(
        provider=settings.AI_PROVIDER,
        model=settings.AI_MODEL,
        base_url=settings.AI_BASE_URL,
        api_key_configured=bool(raw_key),
        api_key_masked=masked,
        request_timeout=settings.AI_REQUEST_TIMEOUT,
        max_retries=settings.AI_MAX_RETRIES,
    )


@router.post("/ai/test")
def test_ai_connection(user: Annotated[User, Depends(require_user)]):
    """Executes a live test ping against the active AI provider."""
    try:
        provider = get_ai_provider()
        start = time.perf_counter()
        resp = provider.complete([{"role": "user", "content": "Respond with only: PONG"}])
        latency = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "connected",
            "provider": provider.provider_name,
            "model": resp.model,
            "latency_ms": latency,
            "response": resp.content.strip(),
            "tokens": resp.usage.total_tokens,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI connection test failed: {str(e)}",
        ) from e
