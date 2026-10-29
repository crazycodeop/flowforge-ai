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
    selected_model = model or settings.AI_MODEL
    req_timeout = timeout or float(settings.AI_REQUEST_TIMEOUT)

    if selected_provider == "mock":
        return MockAIProvider(default_model=selected_model)

    if selected_provider == "openai":
        return OpenAICompatibleProvider(
            default_model=selected_model or "gpt-4o-mini",
            api_key=api_key or settings.AI_API_KEY,
            base_url=base_url or settings.AI_BASE_URL or "https://api.openai.com/v1",
            timeout=req_timeout,
            provider_name_override="openai",
        )

    if selected_provider == "groq":
        return OpenAICompatibleProvider(
            default_model=selected_model or "llama-3.3-70b-versatile",
            api_key=api_key or settings.AI_API_KEY,
            base_url=base_url or settings.AI_BASE_URL or "https://api.groq.com/openai/v1",
            timeout=req_timeout,
            provider_name_override="groq",
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
        f"Unsupported AI provider: '{selected_provider}'. Allowed providers: 'mock', 'openai', 'groq', 'ollama'."
    )
