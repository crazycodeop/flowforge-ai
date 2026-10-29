from abc import ABC, abstractmethod
from typing import Any

from app.nodes.base import NodeType
from app.workflows.context import ExecutionContext


class BaseNodeExecutor(ABC):
    @abstractmethod
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        """Executes the node logic and returns structured output dictionary."""
        pass


class TriggerExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        # Webhook / API trigger outputs validated run input
        return {"payload": context.run_input}


class InputDataExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        default_payload = context.node_config.get("default_payload", {})
        merged = {**default_payload, **context.run_input}
        return {"data": merged}


class TransformExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        mapping_rules = context.node_config.get("mapping_rules", {})
        result: dict[str, Any] = {}
        for target_key, source_expr in mapping_rules.items():
            # If source_expr contains template braces, render template
            if "{" in source_expr and "}" in source_expr:
                result[target_key] = context.render_template(source_expr)
            else:
                resolved = context.resolve_path(source_expr)
                result[target_key] = resolved if resolved is not None else source_expr
        return {"transformed": result}


class ConditionExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        branches = context.node_config.get("branches", [])
        default_branch = context.node_config.get("default_branch", "default")

        for branch in branches:
            branch_name = branch.get("branch_name")
            operator = branch.get("operator")
            field_path = branch.get("field_path")
            target_value = branch.get("value")

            actual_value = context.resolve_path(field_path)

            match = False
            if operator == "equals":
                match = str(actual_value).lower() == str(target_value).lower()
            elif operator == "not_equals":
                match = str(actual_value).lower() != str(target_value).lower()
            elif operator == "contains":
                match = (
                    target_value is not None
                    and str(target_value).lower() in str(actual_value or "").lower()
                )
            elif operator == "greater_than":
                try:
                    match = float(actual_value) > float(target_value)
                except (ValueError, TypeError):
                    match = False
            elif operator == "less_than":
                try:
                    match = float(actual_value) < float(target_value)
                except (ValueError, TypeError):
                    match = False
            elif operator == "is_empty":
                match = (
                    actual_value is None
                    or actual_value == ""
                    or actual_value == []
                    or actual_value == {}
                )
            elif operator == "is_not_empty":
                match = (
                    actual_value is not None
                    and actual_value != ""
                    and actual_value != []
                    and actual_value != {}
                )

            if match:
                return {
                    "selected_branch": branch_name,
                    "matched": True,
                    "field_path": field_path,
                    "value": actual_value,
                }

        return {
            "selected_branch": default_branch,
            "matched": False,
            "fallback": True,
        }


class OutputExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        response_template = context.node_config.get("response_template", {})
        if not response_template:
            # Fallback to combining all upstream outputs
            return {"result": context.upstream_outputs}

        assembled: dict[str, Any] = {}
        for key, val_expr in response_template.items():
            if isinstance(val_expr, str):
                if "{" in val_expr and "}" in val_expr:
                    assembled[key] = context.render_template(val_expr)
                else:
                    resolved = context.resolve_path(val_expr)
                    assembled[key] = resolved if resolved is not None else val_expr
            else:
                assembled[key] = val_expr

        return {"result": assembled}


# Fallback executors for Milestone 3 (AI and Approval nodes will be completed in M5 & M7)
class AIClassifyFallbackExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        categories = context.node_config.get("categories", ["general"])
        # Deterministic default classification
        return {
            "category": categories[0],
            "confidence": 0.95,
            "reasoning": "Deterministic classification fallback",
        }


class StructuredExtractFallbackExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        return {
            "extracted": context.run_input,
            "validation": "schema_conforming",
        }


class RetrievalFallbackExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        return {
            "passages": [
                "FlowForge standard refund policy passage: refunds permitted within 30 days."
            ],
            "source_ids": ["doc-policy-101"],
        }


class HumanApprovalFallbackExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        # In Milestone 3, mark approval requirement
        return {
            "requires_review": True,
            "title": context.node_config.get("title", "Review Required"),
        }


EXECUTOR_MAP: dict[NodeType, type[BaseNodeExecutor]] = {
    NodeType.TRIGGER: TriggerExecutor,
    NodeType.INPUT_DATA: InputDataExecutor,
    NodeType.TRANSFORM: TransformExecutor,
    NodeType.CONDITION: ConditionExecutor,
    NodeType.OUTPUT: OutputExecutor,
    NodeType.AI_CLASSIFY: AIClassifyFallbackExecutor,
    NodeType.STRUCTURED_EXTRACT: StructuredExtractFallbackExecutor,
    NodeType.RETRIEVAL: RetrievalFallbackExecutor,
    NodeType.HUMAN_APPROVAL: HumanApprovalFallbackExecutor,
}


def get_node_executor(node_type: str) -> BaseNodeExecutor:
    """Factory returning the registered executor instance for a node type."""
    enum_type = NodeType(node_type)
    cls = EXECUTOR_MAP.get(enum_type, TransformExecutor)
    return cls()
