# ADR 0004: Modular AI Provider Abstraction with Strict Output Validation

## Context
Tying the application directly to a single proprietary LLM SDK creates vendor lock-in, complicates automated testing in CI, and risks unhandled schema drift from model outputs. Furthermore, AI outputs must never be trusted implicitly.

## Decision
We implement a provider abstraction layer in `app/ai/`:
- Common interface defining `generate_text`, `generate_structured`, `classify`, and `extract`.
- Support for multiple adapters: Mock Provider (built-in for zero-key test runs), Groq, OpenAI-compatible APIs, and Ollama/local models.
- All structured AI node outputs must validate against predefined Pydantic schemas. Invalid or malformed JSON triggers bounded retry or structured error handling.
- Usage metrics (prompt tokens, completion tokens, latency) and estimated costs are captured per invocation.

## Consequences
- Positive: Total flexibility to switch or configure models via environment variables; robust unit and integration testing without network calls or API billing.
- Negative: Need to maintain consistent error normalization across distinct provider SDKs.
