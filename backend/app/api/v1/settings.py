import os
import time
from pathlib import Path
from typing import Annotated

import httpx
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


class ProviderDetail(BaseModel):
    id: str
    name: str
    is_active: bool
    is_default: bool = False
    has_key: bool
    masked_key: str | None = None
    default_model: str
    requires_key: bool


class AIProviderStatusResponse(BaseModel):
    provider: str
    model: str
    base_url: str | None = None
    api_key_configured: bool
    api_key_masked: str | None = None
    request_timeout: int
    max_retries: int
    providers: list[ProviderDetail] = Field(default_factory=list)


class AIProviderUpdateRequest(BaseModel):
    provider: str = Field(..., description="Provider name: 'groq', 'gemini', 'openai', or 'mock'")
    model: str = Field(..., description="Default model name")
    api_key: str | None = Field(default=None, description="API Key")
    base_url: str | None = Field(default=None, description="Optional Base URL")
    set_as_active: bool = Field(
        default=True, description="Whether to set as active default workspace runtime"
    )


class AIModelItem(BaseModel):
    id: str
    name: str


class AIModelsRequest(BaseModel):
    provider: str = Field(..., description="Provider name: 'groq', 'gemini', 'openai', or 'mock'")
    api_key: str | None = Field(default=None, description="Optional API key for dynamic fetching")


class AIModelsResponse(BaseModel):
    provider: str
    has_key: bool
    models: list[AIModelItem]
    source: str = "live_api"
    error: str | None = None


class AIConnectionTestRequest(BaseModel):
    provider: str | None = Field(default=None, description="Provider to test")
    model: str | None = Field(default=None, description="Model to test")
    api_key: str | None = Field(default=None, description="Optional test API key")


def _mask_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) > 8:
        return f"{key[:4]}...{key[-4:]}"
    return "****"


def _build_provider_details(settings) -> list[ProviderDetail]:
    active_prov = settings.AI_PROVIDER.lower().strip()

    groq_key = getattr(settings, "GROQ_API_KEY", None) or (
        settings.AI_API_KEY if active_prov == "groq" else None
    )
    openai_key = getattr(settings, "OPENAI_API_KEY", None) or (
        settings.AI_API_KEY if active_prov == "openai" else None
    )
    gemini_key = getattr(settings, "GEMINI_API_KEY", None) or (
        settings.AI_API_KEY if active_prov == "gemini" else None
    )

    return [
        ProviderDetail(
            id="groq",
            name="Groq Cloud LPU",
            is_active=bool(groq_key),
            is_default=(active_prov == "groq"),
            has_key=bool(groq_key),
            masked_key=_mask_key(groq_key),
            default_model=settings.AI_MODEL if active_prov == "groq" else "qwen/qwen3.8-27b",
            requires_key=True,
        ),
        ProviderDetail(
            id="gemini",
            name="Google Gemini",
            is_active=bool(gemini_key),
            is_default=(active_prov == "gemini"),
            has_key=bool(gemini_key),
            masked_key=_mask_key(gemini_key),
            default_model=settings.AI_MODEL if active_prov == "gemini" else "gemini-3.5-flash",
            requires_key=True,
        ),
        ProviderDetail(
            id="openai",
            name="OpenAI",
            is_active=bool(openai_key),
            is_default=(active_prov == "openai"),
            has_key=bool(openai_key),
            masked_key=_mask_key(openai_key),
            default_model=settings.AI_MODEL if active_prov == "openai" else "gpt-4o-mini",
            requires_key=True,
        ),
        ProviderDetail(
            id="mock",
            name="Mock Sandbox",
            is_active=True,
            is_default=(active_prov == "mock"),
            has_key=True,
            masked_key="No Key Needed",
            default_model="mock-model-v1",
            requires_key=False,
        ),
    ]


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
    active_prov = settings.AI_PROVIDER.lower().strip()

    active_key = None
    if active_prov == "groq":
        active_key = getattr(settings, "GROQ_API_KEY", None) or settings.AI_API_KEY
    elif active_prov == "openai":
        active_key = getattr(settings, "OPENAI_API_KEY", None) or (
            settings.AI_API_KEY if settings.AI_PROVIDER == "openai" else None
        )
    elif active_prov == "gemini":
        active_key = getattr(settings, "GEMINI_API_KEY", None) or (
            settings.AI_API_KEY if settings.AI_PROVIDER == "gemini" else None
        )
    elif active_prov == "mock":
        active_key = "mock"

    return AIProviderStatusResponse(
        provider=settings.AI_PROVIDER,
        model=settings.AI_MODEL,
        base_url=settings.AI_BASE_URL,
        api_key_configured=bool(active_key),
        api_key_masked=_mask_key(active_key) if active_prov != "mock" else "No Key Needed",
        request_timeout=settings.AI_REQUEST_TIMEOUT,
        max_retries=settings.AI_MAX_RETRIES,
        providers=_build_provider_details(settings),
    )


def fetch_provider_models(
    provider: str, api_key: str | None = None
) -> tuple[list[AIModelItem], str | None]:
    """Dynamically queries the AI provider's models endpoint to return available active models."""
    prov = provider.lower().strip()
    if prov == "mock":
        return [
            AIModelItem(id="mock-model-v1", name="mock-model-v1 (Deterministic Mock)"),
            AIModelItem(id="mock-instant-v2", name="mock-instant-v2 (Zero-Latency Mock)"),
        ], None

    if not api_key:
        return [], None

    try:
        if prov == "groq":
            res = httpx.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            if res.status_code == 200:
                data = res.json().get("data", [])
                models: list[AIModelItem] = []
                for m in data:
                    mid = m.get("id", "")
                    if any(
                        bad in mid.lower()
                        for bad in ["whisper", "guard", "moderation", "tts", "embedding"]
                    ):
                        continue
                    models.append(AIModelItem(id=mid, name=mid))
                models.sort(key=lambda x: x.id)
                return models, None
            return [], f"Groq API error ({res.status_code}): {res.text[:150]}"

        elif prov == "gemini":
            # 1. Native Gemini models list (returns all active models supporting generateContent)
            try:
                res2 = httpx.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
                    timeout=10.0,
                )
                if res2.status_code == 200:
                    data = res2.json().get("models", [])
                    models = []
                    for m in data:
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            raw_name = m.get("name", "")
                            clean_id = raw_name.replace("models/", "")
                            exclude_keywords = [
                                "tts",
                                "image",
                                "clip",
                                "transcribe",
                                "robotics",
                                "banana",
                                "lyria",
                                "embedding",
                                "aqa",
                                "customtools",
                                "gemini-1.5",
                                "gemini-2.5-flash",
                            ]
                            if not any(bad in clean_id.lower() for bad in exclude_keywords):
                                m.get("displayName", clean_id)
                                tier_badge = (
                                    " [Free Tier]"
                                    if ("flash" in clean_id and "preview" not in clean_id)
                                    else " [Billing Required]"
                                    if "pro" in clean_id
                                    else ""
                                )
                                label = f"{clean_id}{tier_badge}"
                                models.append(AIModelItem(id=clean_id, name=label))

                    # Put recommended models first
                    def gemini_rank(item: AIModelItem):
                        if item.id == "gemini-3.5-flash":
                            return 0
                        if item.id == "gemini-flash-latest":
                            return 1
                        if item.id == "gemini-3.8-flash":
                            return 2
                        if "flash" in item.id:
                            return 3
                        if "pro" in item.id:
                            return 4
                        return 5

                    models.sort(key=lambda x: (gemini_rank(x), x.id))
                    if models:
                        return models, None
            except Exception:
                pass

            # 2. OpenAI compatibility endpoint fallback
            res = httpx.get(
                "https://generativelanguage.googleapis.com/v1beta/openai/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            if res.status_code == 200:
                data = res.json().get("data", [])
                models = []
                for m in data:
                    mid = m.get("id", "")
                    if not any(bad in mid.lower() for bad in ["embedding", "imagen", "aqa"]):
                        models.append(AIModelItem(id=mid, name=mid))
                models.sort(key=lambda x: x.id)
                if models:
                    return models, None
                return [], "No chat-capable Gemini models returned."
            return [], f"Gemini API error ({res.status_code}): {res.text[:150]}"

        elif prov == "openai":
            res = httpx.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            if res.status_code == 200:
                data = res.json().get("data", [])
                models = []
                for m in data:
                    mid = m.get("id", "")
                    if (
                        mid.startswith("gpt-")
                        or mid.startswith("o1")
                        or mid.startswith("o3")
                        or mid.startswith("chatgpt")
                    ) and not any(
                        bad in mid.lower() for bad in ["realtime", "audio", "vision-preview"]
                    ):
                        models.append(AIModelItem(id=mid, name=mid))
                models.sort(key=lambda x: x.id)
                return models, None
            return [], f"OpenAI API error ({res.status_code}): {res.text[:150]}"

    except Exception as e:
        return [], str(e)

    return [], None


@router.post("/ai/models", response_model=AIModelsResponse)
def get_provider_available_models(
    payload: AIModelsRequest,
    user: Annotated[User, Depends(require_user)],
) -> AIModelsResponse:
    """Dynamically fetches active available models directly from the provider API."""
    settings = get_settings()
    prov = payload.provider.lower().strip()
    key = payload.api_key.strip() if payload.api_key and payload.api_key.strip() else None

    if not key and prov != "mock":
        if prov == "groq":
            key = getattr(settings, "GROQ_API_KEY", None) or (
                settings.AI_API_KEY if settings.AI_PROVIDER == "groq" else None
            )
        elif prov == "openai":
            key = getattr(settings, "OPENAI_API_KEY", None) or (
                settings.AI_API_KEY if settings.AI_PROVIDER == "openai" else None
            )
        elif prov == "gemini":
            key = getattr(settings, "GEMINI_API_KEY", None) or (
                settings.AI_API_KEY if settings.AI_PROVIDER == "gemini" else None
            )

    if prov != "mock" and not key:
        return AIModelsResponse(
            provider=prov,
            has_key=False,
            models=[],
            source="no_key",
            error=f"No API key configured for {prov.upper()}. Enter your API key to fetch available models.",
        )

    models, err = fetch_provider_models(prov, key)
    return AIModelsResponse(
        provider=prov,
        has_key=bool(key or prov == "mock"),
        models=models,
        source="live_api" if prov != "mock" else "mock",
        error=err,
    )


@router.post("/ai/test")
def test_ai_connection(
    payload: AIConnectionTestRequest | None = None,
    user: Annotated[User, Depends(require_user)] = None,
):
    """Executes a live test ping against the specified or active AI provider."""
    settings = get_settings()
    target_prov = (
        (payload.provider if payload and payload.provider else settings.AI_PROVIDER).lower().strip()
    )
    target_model = payload.model if payload and payload.model else None
    target_key = payload.api_key if payload and payload.api_key else None

    # Check key requirements
    if target_prov != "mock":
        resolved_key = target_key
        if not resolved_key:
            if target_prov == "groq":
                resolved_key = getattr(settings, "GROQ_API_KEY", None) or (
                    settings.AI_API_KEY if settings.AI_PROVIDER == "groq" else None
                )
            elif target_prov == "openai":
                resolved_key = getattr(settings, "OPENAI_API_KEY", None) or (
                    settings.AI_API_KEY if settings.AI_PROVIDER == "openai" else None
                )
            elif target_prov == "gemini":
                resolved_key = getattr(settings, "GEMINI_API_KEY", None) or (
                    settings.AI_API_KEY if settings.AI_PROVIDER == "gemini" else None
                )

        if not resolved_key:
            prefix_hint = (
                "sk-..."
                if target_prov == "openai"
                else "AIza..."
                if target_prov == "gemini"
                else "gsk_..."
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{target_prov.upper()} API key is missing. Please enter your API key ({prefix_hint}) and save configuration before testing.",
            )

    try:
        provider = get_ai_provider(
            provider_name=target_prov,
            model=target_model,
            api_key=target_key,
        )
        start = time.perf_counter()
        resp = provider.complete("Respond with only: PONG")
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
            detail=f"{target_prov.upper()} connection test failed: {str(e)}",
        ) from e


@router.put("/ai", response_model=AIProviderStatusResponse)
def update_ai_settings(
    payload: AIProviderUpdateRequest,
    user: Annotated[User, Depends(require_user)],
) -> AIProviderStatusResponse:
    valid_providers = {"groq", "gemini", "openai", "mock", "ollama"}
    prov = payload.provider.lower().strip()
    if prov not in valid_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider '{payload.provider}'. Must be one of: {', '.join(valid_providers)}",
        )

    if payload.set_as_active:
        os.environ["AI_PROVIDER"] = prov
        os.environ["AI_MODEL"] = payload.model

    key_var_name = (
        "GROQ_API_KEY"
        if prov == "groq"
        else "OPENAI_API_KEY"
        if prov == "openai"
        else "GEMINI_API_KEY"
        if prov == "gemini"
        else None
    )

    if payload.api_key is not None and payload.api_key.strip():
        if payload.set_as_active:
            os.environ["AI_API_KEY"] = payload.api_key.strip()
        if key_var_name:
            os.environ[key_var_name] = payload.api_key.strip()
    if payload.base_url is not None and payload.set_as_active:
        os.environ["AI_BASE_URL"] = payload.base_url

    # Persist to .env file
    try:
        env_path = Path("backend/.env")
        if not env_path.exists():
            env_path = Path(".env")
        if env_path.exists():
            lines = env_path.read_text(encoding="utf-8").splitlines()
            new_lines = []
            seen_prov = False
            seen_model = False
            seen_key = False
            seen_specific = False

            for line in lines:
                if line.startswith("AI_PROVIDER="):
                    if payload.set_as_active:
                        new_lines.append(f"AI_PROVIDER={prov}")
                    else:
                        new_lines.append(line)
                    seen_prov = True
                elif line.startswith("AI_MODEL="):
                    if payload.set_as_active:
                        new_lines.append(f"AI_MODEL={payload.model}")
                    else:
                        new_lines.append(line)
                    seen_model = True
                elif line.startswith("AI_API_KEY=") and payload.api_key and payload.api_key.strip():
                    if payload.set_as_active:
                        new_lines.append(f"AI_API_KEY={payload.api_key.strip()}")
                    else:
                        new_lines.append(line)
                    seen_key = True
                elif (
                    key_var_name
                    and line.startswith(f"{key_var_name}=")
                    and payload.api_key
                    and payload.api_key.strip()
                ):
                    new_lines.append(f"{key_var_name}={payload.api_key.strip()}")
                    seen_specific = True
                else:
                    new_lines.append(line)

            if payload.set_as_active and not seen_prov:
                new_lines.append(f"AI_PROVIDER={prov}")
            if payload.set_as_active and not seen_model:
                new_lines.append(f"AI_MODEL={payload.model}")
            if payload.set_as_active and not seen_key and payload.api_key and payload.api_key.strip():
                new_lines.append(f"AI_API_KEY={payload.api_key.strip()}")
            if key_var_name and not seen_specific and payload.api_key and payload.api_key.strip():
                new_lines.append(f"{key_var_name}={payload.api_key.strip()}")

            env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception:
        pass

    get_settings.cache_clear()
    refreshed = get_settings()

    active_key = None
    if prov == "groq":
        active_key = getattr(refreshed, "GROQ_API_KEY", None) or refreshed.AI_API_KEY
    elif prov == "openai":
        active_key = getattr(refreshed, "OPENAI_API_KEY", None) or (
            refreshed.AI_API_KEY if refreshed.AI_PROVIDER == "openai" else None
        )
    elif prov == "gemini":
        active_key = getattr(refreshed, "GEMINI_API_KEY", None) or (
            refreshed.AI_API_KEY if refreshed.AI_PROVIDER == "gemini" else None
        )
    elif prov == "mock":
        active_key = "mock"

    return AIProviderStatusResponse(
        provider=refreshed.AI_PROVIDER,
        model=refreshed.AI_MODEL,
        base_url=refreshed.AI_BASE_URL,
        api_key_configured=bool(active_key),
        api_key_masked=_mask_key(active_key) if prov != "mock" else "No Key Needed",
        request_timeout=refreshed.AI_REQUEST_TIMEOUT,
        max_retries=refreshed.AI_MAX_RETRIES,
        providers=_build_provider_details(refreshed),
    )
