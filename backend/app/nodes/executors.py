from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy import select

from app.ai.factory import get_ai_provider
from app.ai.validation import validate_classification_output, validate_structured_output
from app.core.database import SessionLocal
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.nodes.base import NodeType
from app.retrieval.engine import search_knowledge_base
from app.workflows.context import ExecutionContext
from app.workflows.errors import PermanentValidationError


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
            if isinstance(source_expr, str):
                if (
                    source_expr.startswith("{")
                    and source_expr.endswith("}")
                    and source_expr.count("{") == 1
                ):
                    resolved = context.resolve_path(source_expr[1:-1])
                    result[target_key] = resolved if resolved is not None else source_expr
                elif "{" in source_expr and "}" in source_expr:
                    result[target_key] = context.render_template(source_expr)
                else:
                    resolved = context.resolve_path(source_expr)
                    result[target_key] = resolved if resolved is not None else source_expr
            else:
                result[target_key] = source_expr
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
                if val_expr.startswith("{") and val_expr.endswith("}") and val_expr.count("{") == 1:
                    resolved = context.resolve_path(val_expr[1:-1])
                    assembled[key] = resolved if resolved is not None else val_expr
                elif "{" in val_expr and "}" in val_expr:
                    assembled[key] = context.render_template(val_expr)
                else:
                    resolved = context.resolve_path(val_expr)
                    assembled[key] = resolved if resolved is not None else val_expr
            else:
                assembled[key] = val_expr

        return {"result": assembled}


def resolve_provider_for_model(
    provider_name: str | None, model_name: str | None
) -> tuple[str | None, str | None]:
    """Infers the appropriate AI provider from the model name if not explicitly specified."""
    if provider_name and provider_name.strip():
        return provider_name.lower().strip(), model_name

    if not model_name:
        return None, None

    m_lower = model_name.lower().strip()
    if "gemini" in m_lower:
        return "gemini", model_name
    if any(m_lower.startswith(prefix) for prefix in ["gpt", "o1", "o3", "chatgpt"]):
        return "openai", model_name
    if any(keyword in m_lower for keyword in ["qwen", "llama", "deepseek", "allam", "orpheus"]):
        return "groq", model_name
    if "mock" in m_lower:
        return "mock", model_name

    return None, model_name


class AIClassifyExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        prompt_template = context.node_config.get("prompt_template", "")
        rendered_prompt = context.render_template(prompt_template)
        categories = context.node_config.get("categories", ["general"])
        model_override = context.node_config.get("model")
        temperature = float(context.node_config.get("temperature", 0.0))

        target_prov, target_model = resolve_provider_for_model(
            context.node_config.get("provider"),
            model_override,
        )
        provider = get_ai_provider(provider_name=target_prov, model=target_model)
        response = provider.classify(
            prompt=rendered_prompt,
            categories=categories,
            model=target_model,
            temperature=temperature,
        )

        validated = validate_classification_output(
            response.structured_data or response.content, categories
        )

        return {
            "category": validated["category"],
            "confidence": validated["confidence"],
            "reasoning": validated["reasoning"],
            "usage": response.usage.model_dump(),
        }


class StructuredExtractExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        prompt_template = context.node_config.get("prompt_template", "")
        rendered_prompt = context.render_template(prompt_template)
        schema_definition = context.node_config.get("schema_definition", {})
        model_override = context.node_config.get("model")
        temperature = float(context.node_config.get("temperature", 0.0))

        target_prov, target_model = resolve_provider_for_model(
            context.node_config.get("provider"),
            model_override,
        )
        provider = get_ai_provider(provider_name=target_prov, model=target_model)
        response = provider.extract(
            prompt=rendered_prompt,
            schema=schema_definition,
            model=target_model,
            temperature=temperature,
        )

        validated = validate_structured_output(
            response.structured_data or response.content, schema_definition
        )

        return {
            "extracted": validated,
            "validation": "valid",
            "usage": response.usage.model_dump(),
        }


class RetrievalExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        collection_name = context.node_config.get("collection_name", "support_policies")
        query_template = context.node_config.get("query_template", "")
        rendered_query = context.render_template(query_template)
        top_k = int(context.node_config.get("top_k", 3))
        score_threshold = float(context.node_config.get("score_threshold", 0.2))

        db = context.db
        if db is not None:
            return search_knowledge_base(
                db=db,
                collection_name=collection_name,
                query=rendered_query,
                top_k=top_k,
                score_threshold=score_threshold,
            )
        else:
            with SessionLocal() as session:
                return search_knowledge_base(
                    db=session,
                    collection_name=collection_name,
                    query=rendered_query,
                    top_k=top_k,
                    score_threshold=score_threshold,
                )


class HumanApprovalExecutor(BaseNodeExecutor):
    def execute(self, context: ExecutionContext) -> dict[str, Any]:
        title = context.node_config.get("title", "Review Required")
        description_template = context.node_config.get("description_template", "")
        rendered_desc = (
            context.render_template(description_template) if description_template else ""
        )
        required_role = context.node_config.get("required_role", "reviewer")
        timeout_hours = int(context.node_config.get("timeout_hours", 24))

        db = context.db
        if db is None or not context.step_id:
            return {"approved": True, "comment": "Auto-approved"}

        stmt = select(ApprovalRequest).where(
            ApprovalRequest.workflow_run_id == context.run_id,
            ApprovalRequest.step_run_id == context.step_id,
        )
        existing = db.scalar(stmt)

        if existing:
            if existing.status == ApprovalStatus.APPROVED.value:
                return {
                    "approved": True,
                    "comment": existing.decision_comment,
                    "decided_by": existing.decided_by,
                }
            elif existing.status == ApprovalStatus.REJECTED.value:
                raise PermanentValidationError(
                    f"Human approval rejected: {existing.decision_comment or 'Request denied by reviewer'}"
                )
            else:
                return {
                    "requires_approval": True,
                    "approval_id": existing.id,
                    "status": existing.status,
                }

        new_req = ApprovalRequest(
            workflow_run_id=context.run_id,
            step_run_id=context.step_id,
            title=title,
            description=rendered_desc,
            required_role=required_role,
            timeout_hours=timeout_hours,
            status=ApprovalStatus.PENDING.value,
        )
        db.add(new_req)
        db.flush()

        return {
            "requires_approval": True,
            "approval_id": new_req.id,
            "status": ApprovalStatus.PENDING.value,
        }


EXECUTOR_MAP: dict[NodeType, type[BaseNodeExecutor]] = {
    NodeType.TRIGGER: TriggerExecutor,
    NodeType.INPUT_DATA: InputDataExecutor,
    NodeType.TRANSFORM: TransformExecutor,
    NodeType.CONDITION: ConditionExecutor,
    NodeType.OUTPUT: OutputExecutor,
    NodeType.AI_CLASSIFY: AIClassifyExecutor,
    NodeType.STRUCTURED_EXTRACT: StructuredExtractExecutor,
    NodeType.RETRIEVAL: RetrievalExecutor,
    NodeType.HUMAN_APPROVAL: HumanApprovalExecutor,
}


def get_node_executor(node_type: str) -> BaseNodeExecutor:
    """Factory returning the registered executor instance for a node type."""
    enum_type = NodeType(node_type)
    cls = EXECUTOR_MAP.get(enum_type, TransformExecutor)
    return cls()
