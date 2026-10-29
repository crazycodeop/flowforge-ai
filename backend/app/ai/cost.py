from typing import Final

# Pricing in USD per 1,000,000 tokens (input_cost_per_million, output_cost_per_million)
MODEL_PRICING: Final[dict[str, tuple[float, float]]] = {
    # Mock models (zero cost)
    "mock-model-v1": (0.0, 0.0),
    "mock": (0.0, 0.0),
    # OpenAI models
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-2024-08-06": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o-mini-2024-07-18": (0.15, 0.60),
    "gpt-4-turbo": (10.00, 30.00),
    "gpt-3.5-turbo": (0.50, 1.50),
    # Groq / Open Source models
    "llama-3.3-70b-versatile": (0.59, 0.79),
    "llama-3.1-70b-versatile": (0.59, 0.79),
    "llama-3.1-8b-instant": (0.05, 0.08),
    "llama3-70b-8192": (0.59, 0.79),
    "llama3-8b-8192": (0.05, 0.08),
    "mixtral-8x7b-32768": (0.24, 0.24),
    "gemma2-9b-it": (0.20, 0.20),
    # Anthropic models (reference)
    "claude-3-5-sonnet": (3.00, 15.00),
    "claude-3-haiku": (0.25, 1.25),
}

DEFAULT_PRICING: Final[tuple[float, float]] = (1.00, 2.00)


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculates estimated cost in USD based on model pricing per million tokens."""
    model_key = model.lower().strip()
    rates = MODEL_PRICING.get(model_key)
    if rates is None:
        # Match prefix if versioned suffix exists, e.g. 'gpt-4o-mini-...' -> 'gpt-4o-mini'
        for key, val in MODEL_PRICING.items():
            if model_key.startswith(key):
                rates = val
                break
        else:
            rates = DEFAULT_PRICING

    input_cost = (max(0, prompt_tokens) / 1_000_000.0) * rates[0]
    output_cost = (max(0, completion_tokens) / 1_000_000.0) * rates[1]
    return round(input_cost + output_cost, 6)
