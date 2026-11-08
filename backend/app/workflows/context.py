import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ExecutionContext(BaseModel):
    """Immutable context provided to each executing node."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    run_id: str
    node_id: str
    node_type: str
    step_id: str | None = None
    node_config: dict[str, Any] = Field(default_factory=dict)
    run_input: dict[str, Any] = Field(default_factory=dict)
    upstream_outputs: dict[str, Any] = Field(default_factory=dict)
    workflow_version: int
    db: Any | None = None

    def resolve_path(self, path: str) -> Any:
        """Resolves a dot-delimited path across run_input and upstream_outputs.

        Supports standard path patterns:
          - 'customer_email' -> looks directly in run_input['customer_email']
          - 'input.ticket_message' -> looks in run_input['ticket_message']
          - 'steps.classify_node.category' -> looks in upstream_outputs['classify_node']['category']
          - 'classify_node.category' -> looks in upstream_outputs['classify_node']['category']
          - 'upstream_outputs.node_extract.amount' -> looks in upstream_outputs['node_extract']['amount']
        """
        if not path or not isinstance(path, str):
            return None

        parts = path.strip().split(".")
        if not parts:
            return None

        # Allow explicit namespace prefixes 'upstream_outputs', 'steps', 'run_input', 'input'
        if parts[0] in ("upstream_outputs", "steps") and len(parts) > 1:
            parts = parts[1:]
        elif parts[0] in ("run_input", "input") and len(parts) > 1:
            parts = parts[1:]

        first_key = parts[0]

        # 1. Check in upstream_outputs (node outputs)
        if first_key in self.upstream_outputs:
            current = self.upstream_outputs[first_key]
            parts = parts[1:]
        # 2. Check in run_input (workflow input fields)
        elif first_key in self.run_input:
            current = self.run_input[first_key]
            parts = parts[1:]
        else:
            # Check if any upstream node output contains this key directly (e.g. 'category' or 'amount')
            found = False
            for node_out in self.upstream_outputs.values():
                if isinstance(node_out, dict):
                    if first_key in node_out:
                        current = node_out[first_key]
                        parts = parts[1:]
                        found = True
                        break
                    for wrapper in (
                        "transformed",
                        "extracted",
                        "result",
                        "payload",
                        "output_data",
                        "data",
                    ):
                        if (
                            wrapper in node_out
                            and isinstance(node_out[wrapper], dict)
                            and first_key in node_out[wrapper]
                        ):
                            current = node_out[wrapper][first_key]
                            parts = parts[1:]
                            found = True
                            break
                    if found:
                        break
            if not found:
                return None

        for part in parts:
            if isinstance(current, dict):
                if part in current:
                    current = current[part]
                elif (
                    "transformed" in current
                    and isinstance(current["transformed"], dict)
                    and part in current["transformed"]
                ):
                    current = current["transformed"][part]
                elif (
                    "extracted" in current
                    and isinstance(current["extracted"], dict)
                    and part in current["extracted"]
                ):
                    current = current["extracted"][part]
                elif (
                    "result" in current
                    and isinstance(current["result"], dict)
                    and part in current["result"]
                ):
                    current = current["result"][part]
                elif (
                    "payload" in current
                    and isinstance(current["payload"], dict)
                    and part in current["payload"]
                ):
                    current = current["payload"][part]
                elif (
                    "output_data" in current
                    and isinstance(current["output_data"], dict)
                    and part in current["output_data"]
                ):
                    current = current["output_data"][part]
                elif (
                    "data" in current
                    and isinstance(current["data"], dict)
                    and part in current["data"]
                ):
                    current = current["data"][part]
                else:
                    return None
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
