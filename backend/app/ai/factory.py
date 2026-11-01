from app.ai.base import BaseAIProvider
from app.ai.mock import MockAIProvider
from app.ai.providers import OpenAICompatibleProvider
from app.core.config import get_settings


def get_ai_provider(
    provider_name: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    timeout: float | None = None,
) -> BaseAIProvider:
    """Factory creating configured AI provider instances."""
    settings = get_settings()
    selected_provider = (provider_name or settings.AI_PROVIDER).lower().strip()
    selected_model = model or (
        settings.AI_MODEL if (not provider_name or provider_name == settings.AI_PROVIDER) else None
    )
    req_timeout = timeout or float(settings.AI_REQUEST_TIMEOUT)

    if selected_provider == "mock":
        return MockAIProvider(default_model=selected_model or "mock-model-v1")

    if selected_provider == "groq":
        key = api_key or getattr(settings, "GROQ_API_KEY", None) or settings.AI_API_KEY
        return OpenAICompatibleProvider(
            default_model=selected_model or "qwen/qwen3.8-27b",
            api_key=key,
            base_url=base_url or settings.AI_BASE_URL or "https://api.groq.com/openai/v1",
            timeout=req_timeout,
            provider_name_override="groq",
        )

    if selected_provider == "openai":
        key = (
            api_key
            or getattr(settings, "OPENAI_API_KEY", None)
            or (settings.AI_API_KEY if settings.AI_PROVIDER == "openai" else None)
        )
        return OpenAICompatibleProvider(
            default_model=selected_model or "gpt-4o-mini",
            api_key=key,
            base_url=base_url or settings.AI_BASE_URL or "https://api.openai.com/v1",
            timeout=req_timeout,
            provider_name_override="openai",
        )

    if selected_provider == "gemini":
        key = (
            api_key
            or getattr(settings, "GEMINI_API_KEY", None)
            or (settings.AI_API_KEY if settings.AI_PROVIDER == "gemini" else None)
        )
        return OpenAICompatibleProvider(
            default_model=selected_model or "gemini-3.5-flash",
            api_key=key,
            base_url=base_url or "https://generativelanguage.googleapis.com/v1beta/openai",
            timeout=req_timeout,
            provider_name_override="gemini",
        )

    if selected_provider == "ollama":
        return OpenAICompatibleProvider(
            default_model=selected_model or "llama3.2",
            api_key=api_key or "ollama",
            base_url=base_url or settings.AI_BASE_URL or "http://localhost:11434/v1",
            timeout=req_timeout,
            provider_name_override="ollama",
        )

    raise ValueError(
        f"Unsupported AI provider: '{selected_provider}'. Allowed providers: 'groq', 'gemini', 'openai', 'mock', 'ollama'."
    )
