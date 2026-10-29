from typing import Any

from pydantic import BaseModel, ValidationError

from app.nodes.base import (
    AIClassifyConfig,
    BaseNodeConfig,
    ConditionConfig,
    HumanApprovalConfig,
    InputDataConfig,
    NodeType,
    OutputConfig,
    RetrievalConfig,
    StructuredExtractConfig,
    TransformConfig,
    TriggerConfig,
)


class NodeMetadata(BaseModel):
    node_type: NodeType
    display_name: str
    description: str
    config_schema: type[BaseNodeConfig]
    is_terminal: bool = False
    is_start: bool = False


NODE_REGISTRY: dict[NodeType, NodeMetadata] = {
    NodeType.TRIGGER: NodeMetadata(
        node_type=NodeType.TRIGGER,
        display_name="Trigger / Webhook",
        description="Entry point for workflow execution triggered via API or event.",
        config_schema=TriggerConfig,
        is_start=True,
    ),
    NodeType.INPUT_DATA: NodeMetadata(
        node_type=NodeType.INPUT_DATA,
        display_name="Input Data",
        description="Static or external input payload injection.",
        config_schema=InputDataConfig,
        is_start=True,
    ),
    NodeType.AI_CLASSIFY: NodeMetadata(
        node_type=NodeType.AI_CLASSIFY,
        display_name="AI Classification",
        description="Classifies input text into predefined categories using structured LLM output.",
        config_schema=AIClassifyConfig,
    ),
    NodeType.STRUCTURED_EXTRACT: NodeMetadata(
        node_type=NodeType.STRUCTURED_EXTRACT,
        display_name="Structured Extraction",
        description="Extracts strongly typed entities and fields conforming to a JSON Schema.",
        config_schema=StructuredExtractConfig,
    ),
    NodeType.RETRIEVAL: NodeMetadata(
        node_type=NodeType.RETRIEVAL,
        display_name="Knowledge Retrieval",
        description="Retrieves relevant knowledge passages from an authorized document collection.",
        config_schema=RetrievalConfig,
    ),
    NodeType.CONDITION: NodeMetadata(
        node_type=NodeType.CONDITION,
        display_name="Conditional Branch",
        description="Evaluates deterministic rules and routes execution along specific branch edges.",
        config_schema=ConditionConfig,
    ),
    NodeType.TRANSFORM: NodeMetadata(
        node_type=NodeType.TRANSFORM,
        display_name="Data Transform",
        description="Deterministic mapping and restructuring of upstream outputs without code execution.",
        config_schema=TransformConfig,
    ),
    NodeType.HUMAN_APPROVAL: NodeMetadata(
        node_type=NodeType.HUMAN_APPROVAL,
        display_name="Human Approval Gate",
        description="Pauses workflow execution pending authorized human review and decision.",
        config_schema=HumanApprovalConfig,
    ),
    NodeType.OUTPUT: NodeMetadata(
        node_type=NodeType.OUTPUT,
        display_name="Workflow Result",
        description="Final output assembler and result boundary.",
        config_schema=OutputConfig,
        is_terminal=True,
    ),
}


def validate_node_configuration(
    node_type: NodeType, raw_config: dict[str, Any]
) -> tuple[bool, str | None, dict[str, Any] | None]:
    """Validates raw JSON configuration against the registered node schema."""
    if node_type not in NODE_REGISTRY:
        return False, f"Unknown node type '{node_type}'", None

    metadata = NODE_REGISTRY[node_type]
    schema_cls = metadata.config_schema

    try:
        validated_model = schema_cls.model_validate(raw_config)
        return True, None, validated_model.model_dump()
    except ValidationError as e:
        error_msgs = "; ".join(f"{err['loc']}: {err['msg']}" for err in e.errors())
        return False, f"Configuration validation failed: {error_msgs}", None


def get_available_node_types() -> list[dict[str, Any]]:
    """Returns catalog of registered nodes for frontend palette consumption."""
    return [
        {
            "type": meta.node_type.value,
            "displayName": meta.display_name,
            "description": meta.description,
            "isStart": meta.is_start,
            "isTerminal": meta.is_terminal,
            "schema": meta.config_schema.model_json_schema(),
        }
        for meta in NODE_REGISTRY.values()
    ]
