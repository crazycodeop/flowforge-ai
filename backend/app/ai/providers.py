import json
import time
from typing import Any

import httpx

from app.ai.base import BaseAIProvider, LLMResponse, LLMUsage
from app.ai.cost import calculate_cost
from app.ai.validation import (
    parse_and_clean_json,
    validate_classification_output,
    validate_structured_output,
)
from app.workflows.errors import (
    ModelOutputInvalidError,
    PermanentValidationError,
    RateLimitExceededError,
    TransientNetworkError,
)


class OpenAICompatibleProvider(BaseAIProvider):
    """Universal adapter for OpenAI-compatible endpoints (OpenAI, Groq, Ollama, Together, etc.)."""

    def __init__(
        self,
        default_model: str,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        provider_name_override: str = "openai",
        **kwargs: Any,
    ) -> None:
        super().__init__(default_model, **kwargs)
        self._provider_name = provider_name_override
        self.api_key = api_key or ""
        self.base_url = (base_url or "https://api.openai.com/v1").rstrip("/")
        self.timeout = timeout

    @property
    def provider_name(self) -> str:
        return self._provider_name

    def _get_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _handle_http_error(self, err: httpx.HTTPStatusError) -> None:
        status = err.response.status_code
        text = err.response.text
        if status == 429:
            raise RateLimitExceededError(f"AI provider rate limit reached (429): {text}") from err
        if status in (500, 502, 503, 504):
            raise TransientNetworkError(f"AI provider service error ({status}): {text}") from err
        if status in (400, 401, 403, 422):
            raise PermanentValidationError(
                f"AI provider rejected request ({status}): {text}"
            ) from err
        raise TransientNetworkError(f"AI provider HTTP error ({status}): {text}") from err

    def _call_chat_completions(
        self,
        messages: list[dict[str, str]],
        model: str,
        temperature: float = 0.0,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> tuple[str, LLMUsage, dict[str, Any]]:
        start_time = time.perf_counter()
        url = f"{self.base_url}/chat/completions"

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as err:
            self._handle_http_error(err)
            raise  # Unreachable but keeps type checkers happy
        except (httpx.TimeoutException, httpx.NetworkError) as err:
            raise TransientNetworkError(
                f"AI provider communication timed out or failed: {err}"
            ) from err

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # Extract content
        choices = data.get("choices", [])
        if not choices:
            raise ModelOutputInvalidError("AI provider returned empty choices list.")

        content = choices[0].get("message", {}).get("content", "")

        # Extract usage
        raw_usage = data.get("usage", {})
        prompt_tokens = raw_usage.get("prompt_tokens", max(1, len(str(messages)) // 4))
        completion_tokens = raw_usage.get("completion_tokens", max(1, len(content) // 4))
        total_tokens = raw_usage.get("total_tokens", prompt_tokens + completion_tokens)
        cost = calculate_cost(model, prompt_tokens, completion_tokens)

        usage = LLMUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=round(elapsed_ms, 2),
            cost_usd=cost,
        )

        return content, usage, data

    def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        target_model = model or self.default_model
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        content, usage, raw = self._call_chat_completions(
            messages=messages,
            model=target_model,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=False,
        )

        return LLMResponse(
            content=content,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw=raw,
        )

    def classify(
        self,
        prompt: str,
        categories: list[str],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        target_model = model or self.default_model
        system_instruction = (
            "You are a strict text classification system. Analyze the user request and classify it "
            f"into exactly one of these allowed categories: {json.dumps(categories)}.\n"
            "You must return ONLY a JSON object with this exact structure:\n"
            "{\n"
            '  "category": "<one of the allowed categories>",\n'
            '  "confidence": <float between 0.0 and 1.0>,\n'
            '  "reasoning": "<concise explanation>"\n'
            "}"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt},
        ]

        content, usage, raw = self._call_chat_completions(
            messages=messages,
            model=target_model,
            temperature=temperature,
            json_mode=True,
        )

        structured = parse_and_clean_json(content)
        validated = validate_classification_output(structured, categories)

        return LLMResponse(
            content=content,
            structured_data=validated,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw=raw,
        )

    def extract(
        self,
        prompt: str,
        schema: dict[str, Any],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        target_model = model or self.default_model
        system_instruction = (
            "You are a precise data extraction system. Extract structured data from the user input "
            "strictly adhering to the following JSON Schema:\n"
            f"{json.dumps(schema, indent=2)}\n"
            "Return ONLY valid JSON conforming to this schema."
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt},
        ]

        content, usage, raw = self._call_chat_completions(
            messages=messages,
            model=target_model,
            temperature=temperature,
            json_mode=True,
        )

        structured = parse_and_clean_json(content)
        validated = validate_structured_output(structured, schema)

        return LLMResponse(
            content=content,
            structured_data=validated,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw=raw,
        )
