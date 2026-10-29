from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NodeType(StrEnum):
    TRIGGER = "trigger"
    INPUT_DATA = "input_data"
    AI_CLASSIFY = "ai_classify"
    STRUCTURED_EXTRACT = "structured_extract"
    RETRIEVAL = "retrieval"
    CONDITION = "condition"
    TRANSFORM = "transform"
    HUMAN_APPROVAL = "human_approval"
    OUTPUT = "output"


class BaseNodeConfig(BaseModel):
    """Base configuration model for all workflow nodes."""

    model_config = ConfigDict(extra="forbid")


class TriggerConfig(BaseNodeConfig):
    trigger_type: str = Field(
        default="api", description="Type of trigger: 'api', 'manual', or 'scheduled'"
    )
    input_schema: dict[str, Any] = Field(
        default_factory=dict, description="Expected payload schema"
    )


class InputDataConfig(BaseNodeConfig):
    default_payload: dict[str, Any] = Field(
        default_factory=dict, description="Default or fallback data"
    )


class AIClassifyConfig(BaseNodeConfig):
    prompt_template: str = Field(
        ..., min_length=1, description="Prompt instruction for classification"
    )
    categories: list[str] = Field(..., min_length=2, description="Target classification categories")
    temperature: float = Field(default=0.0, ge=0.0, le=2.0)
    model: str | None = Field(default=None, description="Optional model override")


class StructuredExtractConfig(BaseNodeConfig):
    prompt_template: str = Field(..., min_length=1, description="Instruction for extraction")
    schema_definition: dict[str, Any] = Field(..., description="JSON Schema for extracted fields")
    temperature: float = Field(default=0.0, ge=0.0, le=1.0)
    model: str | None = Field(default=None)


class RetrievalConfig(BaseNodeConfig):
    collection_name: str = Field(..., min_length=1, description="Target knowledge base collection")
    query_template: str = Field(
        ..., min_length=1, description="Query template with variable interpolation"
    )
    top_k: int = Field(default=3, ge=1, le=20, description="Max passages to retrieve")
    score_threshold: float = Field(default=0.6, ge=0.0, le=1.0)


class ConditionBranch(BaseModel):
    branch_name: str = Field(..., min_length=1)
    operator: str = Field(
        ...,
        pattern="^(equals|not_equals|contains|greater_than|less_than|is_empty|is_not_empty)$",
    )
    field_path: str = Field(
        ..., min_length=1, description="Path in upstream context, e.g. 'classification.category'"
    )
    value: Any = Field(default=None)


class ConditionConfig(BaseNodeConfig):
    branches: list[ConditionBranch] = Field(
        ..., min_length=1, description="List of conditional branches"
    )
    default_branch: str = Field(default="default", description="Fallback branch handle")


class TransformConfig(BaseNodeConfig):
    mapping_rules: dict[str, str] = Field(
        ..., min_length=1, description="Key-value mapping expressions or field projections"
    )


class HumanApprovalConfig(BaseNodeConfig):
    title: str = Field(..., min_length=1, description="Title of the approval action")
    description_template: str = Field(
        default="", description="Summary of action requiring approval"
    )
    timeout_hours: int = Field(default=24, ge=1, le=168, description="Time until request expires")
    required_role: str = Field(default="reviewer", description="Role required to decide approval")


class OutputConfig(BaseNodeConfig):
    response_template: dict[str, Any] = Field(
        default_factory=dict, description="Output payload assembly structure"
    )
