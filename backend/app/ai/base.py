from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class LLMMessage(BaseModel):
    """Chat message representation."""

    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class LLMUsage(BaseModel):
    """Token consumption, execution latency, and estimated cost."""

    model_config = ConfigDict(extra="ignore")

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    cost_usd: float = 0.0


class LLMResponse(BaseModel):
    """Unified response envelope from any AI provider."""

    model_config = ConfigDict(extra="ignore")

    content: str
    structured_data: dict[str, Any] | None = None
    usage: LLMUsage = Field(default_factory=LLMUsage)
    model: str
    provider: str
    raw: dict[str, Any] | None = None


class BaseAIProvider(ABC):
    """Abstract interface that all FlowForge AI model adapters must implement."""

    def __init__(self, default_model: str, **kwargs: Any) -> None:
        self.default_model = default_model
        self.kwargs = kwargs

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider, e.g. 'mock', 'groq', 'openai', 'ollama'."""
        pass

    @abstractmethod
    def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate raw text completion."""
        pass

    @abstractmethod
    def classify(
        self,
        prompt: str,
        categories: list[str],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        """Classify input text into one of the designated categories with confidence and reasoning."""
        pass

    @abstractmethod
    def extract(
        self,
        prompt: str,
        schema: dict[str, Any],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        """Extract structured JSON fields according to a JSON Schema."""
        pass
