from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RunCreateRequest(BaseModel):
    input_payload: dict[str, Any] = Field(default_factory=dict)
    version_number: int | None = Field(
        default=None, description="Optional pinned version number; defaults to latest published"
    )


class StepRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workflow_run_id: str
    node_id: str
    node_type: str
    status: str
    attempt_count: int
    input_data: dict[str, Any] | None
    output_data: dict[str, Any] | None
    error_details: dict[str, Any] | None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    cost_usd: float | None = None
    latency_ms: float | None = None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime


class ExecutionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workflow_run_id: str
    step_run_id: str | None
    event_type: str
    payload: dict[str, Any] | None
    created_at: datetime


class WorkflowRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workflow_id: str
    workflow_version_id: str
    status: str
    input_payload: dict[str, Any]
    output_payload: dict[str, Any] | None
    error_message: str | None
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
