import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExecutionContext(BaseModel):
    """Immutable context provided to each executing node."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    run_id: str
    node_id: str
    node_type: str
    node_config: dict[str, Any] = Field(default_factory=dict)
    run_input: dict[str, Any] = Field(default_factory=dict)
    upstream_outputs: dict[str, Any] = Field(default_factory=dict)
    workflow_version: int

    def resolve_path(self, path: str) -> Any:
        """Resolves a dot-delimited path across run_input and upstream_outputs.

        Examples:
          - 'ticket.issue' -> looks in run_input['ticket']['issue']
          - 'classify_node.category' -> looks in upstream_outputs['classify_node']['category']
        """
        parts = path.strip().split(".")
        if not parts:
            return None

        # Allow explicit namespace prefixes 'upstream_outputs' and 'run_input'
        if parts[0] == "upstream_outputs" and len(parts) > 1:
            parts = parts[1:]
        elif parts[0] == "run_input" and len(parts) > 1:
            parts = parts[1:]

        first_key = parts[0]
        # 1. Check in upstream_outputs
        if first_key in self.upstream_outputs:
            current = self.upstream_outputs[first_key]
            parts = parts[1:]
        # 2. Check in run_input
        elif first_key in self.run_input:
            current = self.run_input[first_key]
            parts = parts[1:]
        else:
            return None

        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
            if current is None:
                return None

        return current

    def render_template(self, template: str) -> str:
        """Interpolates variables formatted as {field.path} using resolve_path."""
        pattern = re.compile(r"\{([a-zA-Z0-9_.-]+)\}")

        def replace_match(match: re.Match) -> str:
            path = match.group(1)
            val = self.resolve_path(path)
            return str(val) if val is not None else ""

        return pattern.sub(replace_match, template)
