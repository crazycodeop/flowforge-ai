import httpx
import pytest
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.cost import calculate_cost
from app.ai.factory import get_ai_provider
from app.ai.mock import MockAIProvider
from app.ai.providers import OpenAICompatibleProvider
from app.ai.validation import (
    parse_and_clean_json,
    validate_classification_output,
    validate_structured_output,
)
from app.models.execution import ExecutionEvent, StepRun, WorkflowRun
from app.models.workflow import Workflow, WorkflowVersion
from app.workflows.errors import (
    ModelOutputInvalidError,
    PermanentValidationError,
    RateLimitExceededError,
    TransientNetworkError,
)
from app.workflows.executor import execute_workflow_run
from app.workflows.state_machine import RunStatus, StepStatus


def test_cost_calculation():
    # Mock model is zero cost
    assert calculate_cost("mock-model-v1", 1000, 500) == 0.0

    # GPT-4o: $2.50 / M input, $10.00 / M output
    # 1,000,000 input = $2.50, 1,000,000 output = $10.00 -> total $12.50
    assert calculate_cost("gpt-4o", 1_000_000, 1_000_000) == 12.50
    # 1000 input = 0.0025, 500 output = 0.005 -> total 0.0075
    assert calculate_cost("gpt-4o", 1000, 500) == 0.0075

    # Llama 3.3 70B: $0.59 / M input, $0.79 / M output
    assert calculate_cost("llama-3.3-70b-versatile", 1_000_000, 1_000_000) == 1.38

    # Default fallback
    assert calculate_cost("unknown-provider-model", 1_000_000, 1_000_000) == 3.00


def test_clean_and_parse_json():
    # Markdown codeblock stripping
    raw_md = '```json\n{\n  "key": "value",\n  "count": 42\n}\n```'
    parsed = parse_and_clean_json(raw_md)
    assert parsed == {"key": "value", "count": 42}

    # Clean dict input
    assert parse_and_clean_json({"a": 1}) == {"a": 1}

    # Invalid JSON string
    with pytest.raises(ModelOutputInvalidError, match="not valid JSON"):
        parse_and_clean_json("{ invalid json format")


def test_classification_validation():
    allowed = ["billing", "technical", "general"]

    # Exact match
    res = validate_classification_output(
        {"category": "billing", "confidence": 0.95, "reasoning": "User asked for refund"},
        allowed,
    )
    assert res["category"] == "billing"
    assert res["confidence"] == 0.95

    # Case-insensitive normalization
    res = validate_classification_output(
        {"category": "TECHNICAL", "confidence": 1.2, "reasoning": "System error"},
        allowed,
    )
    assert res["category"] == "technical"
    assert res["confidence"] == 1.0  # Clamped to 1.0

    # Hallucinated invalid category rejected
    with pytest.raises(ModelOutputInvalidError, match="not in allowed categories"):
        validate_classification_output(
            {"category": "marketing", "confidence": 0.8},
            allowed,
        )


def test_structured_output_validation():
    schema = {
        "type": "object",
        "properties": {
            "customer_id": {"type": "string"},
            "refund_amount": {"type": "number"},
            "is_urgent": {"type": "boolean"},
        },
        "required": ["customer_id", "refund_amount"],
    }

    # Valid payload
    valid_data = {"customer_id": "cust_123", "refund_amount": 49.99, "is_urgent": True}
    res = validate_structured_output(valid_data, schema)
    assert res["customer_id"] == "cust_123"

    # Missing required field
    with pytest.raises(ModelOutputInvalidError, match="schema validation failed"):
        validate_structured_output({"customer_id": "cust_123"}, schema)

    # Wrong type
    with pytest.raises(ModelOutputInvalidError, match="schema validation failed"):
        validate_structured_output(
            {"customer_id": "cust_123", "refund_amount": "not-a-number"}, schema
        )


def test_mock_provider_classification_and_extraction():
    provider = MockAIProvider(default_model="mock-model-v1")

    # Classification keyword detection
    res_billing = provider.classify(
        prompt="I demand a refund for last month's charge on my credit card",
        categories=["billing", "technical", "general"],
    )
    assert res_billing.structured_data["category"] == "billing"
    assert res_billing.structured_data["confidence"] > 0.9
    assert res_billing.usage.prompt_tokens > 0
    assert res_billing.usage.total_tokens > 0

    res_tech = provider.classify(
        prompt="The server is crashing with fatal segmentation fault",
        categories=["billing", "technical", "general"],
    )
    assert res_tech.structured_data["category"] == "technical"

    # Extraction conforming to schema
    schema = {
        "type": "object",
        "properties": {
            "email": {"type": "string", "format": "email"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
            "count": {"type": "integer"},
        },
        "required": ["email", "priority"],
    }
    extracted_res = provider.extract(
        prompt="Urgent issue from customer user@test.com",
        schema=schema,
    )
    assert "email" in extracted_res.structured_data
    assert extracted_res.structured_data["email"] == "customer@example.com"
    assert extracted_res.structured_data["priority"] == "low"
    assert extracted_res.structured_data["count"] == 1


def test_mock_provider_error_injection():
    provider = MockAIProvider()
    provider.inject_error(RateLimitExceededError("Simulated 429 rate limit"))

    with pytest.raises(RateLimitExceededError):
        provider.complete("Test prompt")

    # Next call should succeed normally
    resp = provider.complete("Test prompt 2")
    assert "Synthesized" in resp.content


def test_provider_factory():
    mock_p = get_ai_provider("mock")
    assert isinstance(mock_p, MockAIProvider)

    openai_p = get_ai_provider("openai", api_key="sk-test", model="gpt-4o")
    assert isinstance(openai_p, OpenAICompatibleProvider)
    assert openai_p.provider_name == "openai"
    assert openai_p.default_model == "gpt-4o"

    groq_p = get_ai_provider("groq")
    assert isinstance(groq_p, OpenAICompatibleProvider)
    assert groq_p.provider_name == "groq"

    ollama_p = get_ai_provider("ollama")
    assert isinstance(ollama_p, OpenAICompatibleProvider)
    assert ollama_p.provider_name == "ollama"

    with pytest.raises(ValueError, match="Unsupported AI provider"):
        get_ai_provider("nonexistent_provider")


def test_openai_compatible_provider_mocked(monkeypatch):
    provider = OpenAICompatibleProvider(
        default_model="gpt-4o-mini",
        api_key="test-key",
        base_url="https://api.openai.com/v1",
    )

    # 1. Mock 200 OK Success
    mock_response_data = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": '{"category": "billing", "confidence": 0.98, "reasoning": "Invoice inquiry"}',
                }
            }
        ],
        "usage": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70},
    }

    def mock_post(client, url, **kwargs):
        req = httpx.Request("POST", str(url))
        return Response(200, json=mock_response_data, request=req)

    monkeypatch.setattr("httpx.Client.post", mock_post)

    classified = provider.classify(
        prompt="Where is my invoice?",
        categories=["billing", "support"],
    )
    assert classified.structured_data["category"] == "billing"
    assert classified.usage.prompt_tokens == 50
    assert classified.usage.cost_usd > 0.0

    # 2. Mock 429 Rate Limit
    def mock_429(client, url, **kwargs):
        req = httpx.Request("POST", str(url))
        return Response(429, text="Rate limit exceeded", request=req)

    monkeypatch.setattr("httpx.Client.post", mock_429)

    with pytest.raises(RateLimitExceededError):
        provider.classify(prompt="Test", categories=["billing"])

    # 3. Mock 503 Service Unavailable
    def mock_503(client, url, **kwargs):
        req = httpx.Request("POST", str(url))
        return Response(503, text="Service Overloaded", request=req)

    monkeypatch.setattr("httpx.Client.post", mock_503)

    with pytest.raises(TransientNetworkError):
        provider.classify(prompt="Test", categories=["billing"])

    # 4. Mock 401 Unauthorized
    def mock_401(client, url, **kwargs):
        req = httpx.Request("POST", str(url))
        return Response(401, text="Invalid API key", request=req)

    monkeypatch.setattr("httpx.Client.post", mock_401)

    with pytest.raises(PermanentValidationError):
        provider.classify(prompt="Test", categories=["billing"])


def test_end_to_end_ai_workflow_execution(db_session: Session):
    """Executes a full AI pipeline: Trigger -> AI Classify -> Condition -> Extract -> Output."""
    definition = {
        "version": "1.0",
        "nodes": [
            {"id": "node_trigger", "type": "trigger", "config": {}},
            {
                "id": "node_classify",
                "type": "ai_classify",
                "config": {
                    "prompt_template": "Classify the support ticket: {run_input.ticket_text}",
                    "categories": ["billing", "technical", "general"],
                },
            },
            {
                "id": "node_condition",
                "type": "condition",
                "config": {
                    "branches": [
                        {
                            "branch_name": "billing_branch",
                            "operator": "equals",
                            "field_path": "upstream_outputs.node_classify.category",
                            "value": "billing",
                        }
                    ],
                    "default_branch": "default_branch",
                },
            },
            {
                "id": "node_extract",
                "type": "structured_extract",
                "config": {
                    "prompt_template": "Extract customer details from: {run_input.ticket_text}",
                    "schema_definition": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "priority": {"type": "string"},
                        },
                        "required": ["email", "priority"],
                    },
                },
            },
            {
                "id": "node_output",
                "type": "output",
                "config": {
                    "response_template": {
                        "status": "classified_and_extracted",
                        "category": "{upstream_outputs.node_classify.category}",
                        "details": "{upstream_outputs.node_extract.extracted}",
                    }
                },
            },
        ],
        "edges": [
            {"id": "e1", "source_node_id": "node_trigger", "target_node_id": "node_classify"},
            {"id": "e2", "source_node_id": "node_classify", "target_node_id": "node_condition"},
            {
                "id": "e3",
                "source_node_id": "node_condition",
                "target_node_id": "node_extract",
                "source_handle": "billing_branch",
            },
            {"id": "e4", "source_node_id": "node_extract", "target_node_id": "node_output"},
        ],
    }

    workflow = Workflow(
        name="AI Support Pipeline",
        description="Triage and extraction",
        draft_definition=definition,
    )
    db_session.add(workflow)
    db_session.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=1,
        definition=definition,
        checksum="checksum-ai-pipeline",
    )
    db_session.add(version)
    db_session.flush()

    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=version.id,
        input_payload={"ticket_text": "I was charged twice on my credit card billing statement"},
    )
    db_session.add(run)
    db_session.commit()

    # Execute workflow run
    execute_workflow_run(run.id, db_session)

    # Verify run succeeded
    db_session.refresh(run)
    assert run.status == RunStatus.SUCCEEDED.value
    assert run.output_payload is not None
    assert run.output_payload["result"]["category"] == "billing"

    # Verify aggregated AI usage metrics on workflow run
    assert run.total_tokens > 0

    # Verify step runs
    steps = db_session.scalars(select(StepRun).where(StepRun.workflow_run_id == run.id)).all()
    step_dict = {s.node_id: s for s in steps}

    # Verify AI Classify step
    classify_step = step_dict["node_classify"]
    assert classify_step.status == StepStatus.SUCCEEDED.value
    assert classify_step.output_data["category"] == "billing"
    assert classify_step.prompt_tokens > 0
    assert classify_step.completion_tokens > 0
    assert classify_step.total_tokens > 0
    assert classify_step.latency_ms > 0

    # Verify AI Extract step
    extract_step = step_dict["node_extract"]
    assert extract_step.status == StepStatus.SUCCEEDED.value
    assert "email" in extract_step.output_data["extracted"]
    assert extract_step.prompt_tokens > 0

    # Verify AI_INFERENCE_COMPLETED events logged in audit trail
    events = db_session.scalars(
        select(ExecutionEvent).where(
            ExecutionEvent.workflow_run_id == run.id,
            ExecutionEvent.event_type == "AI_INFERENCE_COMPLETED",
        )
    ).all()
    assert len(events) == 2  # One for classify, one for extract
    for ev in events:
        assert ev.payload["total_tokens"] > 0


def test_ai_classification_retry_on_injected_rate_limit(db_session: Session, monkeypatch):
    """Verifies that an AI node encountering a 429 Rate Limit transitions to RETRY_WAIT and succeeds on retry."""
    from datetime import UTC, datetime, timedelta

    mock_provider = MockAIProvider()
    # Inject one rate limit error
    mock_provider.inject_error(RateLimitExceededError("Simulated 429 upstream rate limit"))

    monkeypatch.setattr(
        "app.nodes.executors.get_ai_provider", lambda *args, **kwargs: mock_provider
    )

    definition = {
        "version": "1.0",
        "nodes": [
            {"id": "node_trigger", "type": "trigger", "config": {}},
            {
                "id": "node_classify",
                "type": "ai_classify",
                "retry_policy": {"max_retries": 2, "backoff_base_seconds": 0.01},
                "config": {
                    "prompt_template": "Classify: {run_input.text}",
                    "categories": ["sales", "support"],
                },
            },
        ],
        "edges": [
            {"id": "e1", "source_node_id": "node_trigger", "target_node_id": "node_classify"}
        ],
    }

    workflow = Workflow(name="Retry Workflow", draft_definition=definition)
    db_session.add(workflow)
    db_session.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=1,
        definition=definition,
        checksum="checksum-retry-test",
    )
    db_session.add(version)
    db_session.flush()

    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=version.id,
        input_payload={"text": "I want to buy your enterprise plan"},
    )
    db_session.add(run)
    db_session.commit()

    # Pass 1: Should encounter rate limit and schedule RETRY_WAIT
    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    classify_step = db_session.scalar(
        select(StepRun).where(StepRun.workflow_run_id == run.id, StepRun.node_id == "node_classify")
    )
    assert classify_step.status == StepStatus.RETRY_WAIT.value
    assert classify_step.attempt_count == 1
    assert classify_step.error_details["category"] == "RATE_LIMIT"

    # Fast-forward lease expiry to simulate backoff elapsing
    classify_step.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.commit()

    # Pass 2: Re-executing resumes the step; mock provider now succeeds
    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    db_session.refresh(classify_step)
    assert classify_step.status == StepStatus.SUCCEEDED.value
    assert classify_step.attempt_count == 2
    assert classify_step.output_data["category"] == "sales"
    assert run.status == RunStatus.SUCCEEDED.value
