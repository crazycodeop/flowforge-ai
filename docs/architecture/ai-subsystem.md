# FlowForge AI — AI Subsystem, Provider Routing & Guardrails

## 1. Provider Adapter Architecture

FlowForge AI abstracts all model inference behind the `BaseAIProvider` interface. This allows seamless switching between ultra-fast cloud LPU inference (Groq), enterprise APIs (OpenAI), self-hosted models (Ollama), and deterministic local mock providers for unit testing.

```mermaid
classDiagram
    class BaseAIProvider {
        <<interface>>
        +complete(prompt, system_prompt, model, temperature, max_tokens) LLMResponse
        +classify(prompt, categories, model, temperature) LLMResponse
        +extract(prompt, schema, model, temperature) LLMResponse
    }

    class GroqProvider {
        -api_key: str
        -default_model: str "qwen/qwen3.8-27b"
        -base_url: str
        +complete() LLMResponse
        +classify() LLMResponse
        +extract() LLMResponse
    }

    class OpenAICompatibleProvider {
        -api_key: str
        -default_model: str "gpt-4o"
        -base_url: str
        +complete() LLMResponse
        +classify() LLMResponse
        +extract() LLMResponse
    }

    class OllamaProvider {
        -base_url: str "http://localhost:11434"
        -default_model: str "llama3"
        +complete() LLMResponse
        +classify() LLMResponse
        +extract() LLMResponse
    }

    class MockAIProvider {
        -error_to_inject: Exception
        +inject_error(e)
        +complete() LLMResponse
        +classify() LLMResponse
        +extract() LLMResponse
    }

    BaseAIProvider <|-- GroqProvider
    BaseAIProvider <|-- OpenAICompatibleProvider
    BaseAIProvider <|-- OllamaProvider
    BaseAIProvider <|-- MockAIProvider
```

---

## 2. Guardrails & Structured Output Enforcement

LLM outputs are strictly validated before being accepted into the workflow execution graph:

1. **Deterministic Parameters**: `temperature=0.0` is enforced by default to minimize output variance across executions.
2. **Markdown Stripping & JSON Recovery**: Markdown code block fences (e.g. ` ```json ... ``` `) and trailing commentary are automatically parsed and cleaned.
3. **Pydantic & JSONSchema Validation**: Extracted structures are validated against node schemas. If required fields are missing or types are mismatched, a `ModelOutputInvalidError` is raised.
4. **Error Categorization**:
   - `RATE_LIMIT` (HTTP 429): Classified as retryable transient error. Schedules bounded exponential backoff.
   - `MODEL_OUTPUT_INVALID`: Classified as validation failure. Triggers bounded re-prompting with schema feedback.
   - `PERMANENT_CONFIG`: Fatal error, fails step fast.

---

## 3. Cost & Token Attribution Formula

Every AI invocation calculates real-time USD cost and token usage:
$$\text{Cost} = \left(\frac{\text{Prompt Tokens}}{1{,}000{,}000} \times \text{Prompt Rate}\right) + \left(\frac{\text{Completion Tokens}}{1{,}000{,}000} \times \text{Completion Rate}\right)$$

Costs are accumulated onto the parent `WorkflowRun` and logged in the `execution_events` audit table.
