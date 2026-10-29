import hashlib
import json
import time
from typing import Any

from app.ai.base import BaseAIProvider, LLMResponse, LLMUsage
from app.ai.cost import calculate_cost


class MockAIProvider(BaseAIProvider):
    """High-fidelity deterministic AI provider for zero-credential testing, offline development, and CI."""

    def __init__(self, default_model: str = "mock-model-v1", **kwargs: Any) -> None:
        super().__init__(default_model, **kwargs)
        self.simulated_errors: list[Exception] = []

    @property
    def provider_name(self) -> str:
        return "mock"

    def inject_error(self, exc: Exception) -> None:
        """Injects an exception to be raised on the next invocation."""
        self.simulated_errors.append(exc)

    def _check_injected_error(self) -> None:
        if self.simulated_errors:
            raise self.simulated_errors.pop(0)

    def _build_usage(self, prompt: str, content: str, start_time: float, model: str) -> LLMUsage:
        elapsed_ms = max(1.0, (time.perf_counter() - start_time) * 1000.0)
        prompt_tokens = max(1, len(prompt) // 4)
        completion_tokens = max(1, len(content) // 4)
        total_tokens = prompt_tokens + completion_tokens
        cost = calculate_cost(model, prompt_tokens, completion_tokens)
        return LLMUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=round(elapsed_ms, 2),
            cost_usd=cost,
        )

    def complete(
        self,
        prompt: str,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        self._check_injected_error()
        start_time = time.perf_counter()
        target_model = model or self.default_model

        content = f"Synthesized response for prompt: {prompt[:100]}..."
        usage = self._build_usage(prompt, content, start_time, target_model)

        return LLMResponse(
            content=content,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw={"simulated": True},
        )

    def classify(
        self,
        prompt: str,
        categories: list[str],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        self._check_injected_error()
        start_time = time.perf_counter()
        target_model = model or self.default_model

        if not categories:
            categories = ["general"]

        # Deterministic category selection based on keyword presence
        prompt_lower = prompt.lower()
        selected_cat: str | None = None
        for cat in categories:
            if cat.lower() in prompt_lower:
                selected_cat = cat
                break

        # Keyword heuristics for common support scenarios
        if not selected_cat:
            if any(
                w in prompt_lower
                for w in ("refund", "charge", "invoice", "billing", "payment", "card")
            ):
                for cat in categories:
                    if any(b in cat.lower() for b in ("billing", "finance", "payment")):
                        selected_cat = cat
                        break
            elif any(
                w in prompt_lower for w in ("bug", "crash", "exception", "error", "fail", "broken")
            ):
                for cat in categories:
                    if any(t in cat.lower() for t in ("tech", "bug", "support")):
                        selected_cat = cat
                        break
            elif any(w in prompt_lower for w in ("urgent", "down", "outage", "security", "breach")):
                for cat in categories:
                    if any(u in cat.lower() for u in ("urgent", "critical", "incident")):
                        selected_cat = cat
                        break

        # Fallback to deterministic hash of the prompt modulo categories
        if not selected_cat:
            digest = int(hashlib.md5(prompt.encode("utf-8")).hexdigest(), 16)
            selected_cat = categories[digest % len(categories)]

        structured = {
            "category": selected_cat,
            "confidence": 0.94,
            "reasoning": f"Deterministic mock classification matched intent for '{selected_cat}'.",
        }
        content = json.dumps(structured)
        usage = self._build_usage(prompt, content, start_time, target_model)

        return LLMResponse(
            content=content,
            structured_data=structured,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw={"simulated": True},
        )

    def extract(
        self,
        prompt: str,
        schema: dict[str, Any],
        model: str | None = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        self._check_injected_error()
        start_time = time.perf_counter()
        target_model = model or self.default_model

        # Generate schema-compliant mock structured data
        structured = self._generate_mock_instance_for_schema(schema, prompt)
        content = json.dumps(structured)
        usage = self._build_usage(prompt, content, start_time, target_model)

        return LLMResponse(
            content=content,
            structured_data=structured,
            usage=usage,
            model=target_model,
            provider=self.provider_name,
            raw={"simulated": True},
        )

    def _generate_mock_instance_for_schema(
        self, schema: dict[str, Any], prompt: str
    ) -> dict[str, Any]:
        """Generates realistic values satisfying the JSON schema definitions."""
        properties = schema.get("properties", {})
        result: dict[str, Any] = {}
        prompt_lower = prompt.lower()

        for key, prop in properties.items():
            prop_type = prop.get("type", "string")

            # Check for enum values
            if "enum" in prop and prop["enum"]:
                result[key] = prop["enum"][0]
                continue

            if prop_type == "string":
                if "email" in key.lower() or prop.get("format") == "email":
                    result[key] = "customer@example.com"
                elif "id" in key.lower():
                    result[key] = "cust_98231"
                elif "priority" in key.lower():
                    result[key] = "high" if "urgent" in prompt_lower else "medium"
                elif "summary" in key.lower() or "description" in key.lower():
                    result[key] = prompt[:60] if prompt else "Extracted incident summary"
                else:
                    result[key] = f"extracted_{key}_val"
            elif prop_type == "integer":
                result[key] = 1
            elif prop_type == "number":
                result[key] = 100.0
            elif prop_type == "boolean":
                result[key] = True
            elif prop_type == "array":
                item_schema = prop.get("items", {})
                if item_schema.get("type") == "string":
                    result[key] = ["item_1", "item_2"]
                else:
                    result[key] = []
            elif prop_type == "object":
                result[key] = self._generate_mock_instance_for_schema(prop, prompt)
            else:
                result[key] = None

        return result
