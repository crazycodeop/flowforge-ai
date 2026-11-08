from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.nodes.base import NodeType


class InputFieldType(StrEnum):
    TEXT = "text"
    EMAIL = "email"
    NUMBER = "number"
    MULTILINE = "multiline"
    BOOLEAN = "boolean"
    SELECT = "select"
    FILE = "file"


class InputFieldDefinition(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern="^[a-zA-Z0-9_]+$",
        description="Machine field identifier",
    )
    label: str = Field(..., min_length=1, max_length=100, description="User-facing friendly label")
    type: str = Field(
        default="text",
        description="Field data type: text, email, number, multiline, boolean, select, file",
    )
    description: str | None = Field(default=None, max_length=250)
    required: bool = Field(default=True)
    default_value: Any = None
    placeholder: str | None = Field(default=None, max_length=100)
    options: list[str] | None = Field(
        default=None, description="Select options when type is select"
    )


class InputContract(BaseModel):
    fields: list[InputFieldDefinition] = Field(default_factory=list)
    allow_natural_language: bool = Field(
        default=True,
        description="Whether Portal users can submit unstructured natural language text",
    )
    system_instructions: str | None = Field(
        default=None,
        max_length=500,
        description="Instructions for AI natural language extraction into schema",
    )


class RetryPolicy(BaseModel):
    max_retries: int = Field(default=3, ge=0, le=10)
    backoff_base_seconds: float = Field(default=1.0, ge=0.1, le=60.0)
    backoff_factor: float = Field(default=2.0, ge=1.0, le=5.0)
    max_backoff_seconds: float = Field(default=60.0, ge=1.0, le=300.0)


class NodeDefinition(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern="^[a-zA-Z0-9_-]+$")
    type: NodeType
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    config: dict[str, Any] = Field(default_factory=dict)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)
    timeout_seconds: int = Field(default=60, ge=1, le=1800)
    position: dict[str, float] | None = Field(
        default=None, description="UI canvas coordinates {x, y}"
    )


class EdgeDefinition(BaseModel):
    id: str = Field(..., min_length=1, max_length=64)
    source_node_id: str = Field(..., min_length=1, max_length=64)
    target_node_id: str = Field(..., min_length=1, max_length=64)
    source_handle: str | None = Field(
        default=None, description="Branch handle e.g. 'true', 'false', 'default'"
    )
    label: str | None = Field(default=None, max_length=50)


class WorkflowDefinition(BaseModel):
    schema_version: str = Field(default="1.0.0")
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    input_contract: InputContract = Field(default_factory=InputContract)
    nodes: list[NodeDefinition] = Field(default_factory=list)
    edges: list[EdgeDefinition] = Field(default_factory=list)
    default_timeout_seconds: int = Field(default=3600, ge=10, le=86400)


class ValidationErrorDetail(BaseModel):
    code: str
    message: str
    node_id: str | None = None
    edge_id: str | None = None


class ValidationResult(BaseModel):
    is_valid: bool
    errors: list[ValidationErrorDetail] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    definition: WorkflowDefinition | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    definition: WorkflowDefinition | None = None


class WorkflowVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workflow_id: str
    version_number: int
    definition: dict[str, Any]
    checksum: str
    changelog: str | None
    published_at: datetime


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    draft_definition: dict[str, Any]
    is_active: bool
    latest_version: int | None = None
    created_at: datetime
    updated_at: datetime
