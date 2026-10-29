from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Any

from app.workflows.state_machine import StepStatus


def find_ready_nodes(definition: dict[str, Any], step_runs: dict[str, Any]) -> list[str]:
    """Identifies nodes in the DAG that are currently eligible for execution.

    A node is eligible if:
    1. Its status is PENDING (not yet queued, running, succeeded, failed, or skipped).
    2. All of its incoming dependencies have finished:
       - Every parent node must be SUCCEEDED or SKIPPED.
       - At least one incoming path must be active (not all skipped).
    """
    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])

    # Map node IDs to nodes
    node_map = {n["id"]: n for n in nodes}

    # Map incoming edges per node: target_id -> list[edge]
    incoming_edges: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        incoming_edges[edge["target_node_id"]].append(edge)

    ready_node_ids: list[str] = []

    for node in nodes:
        node_id = node["id"]
        step = step_runs.get(node_id)
        if not step:
            continue

        if step.status == StepStatus.RETRY_WAIT.value:
            if step.lease_expires_at and datetime.now(UTC) < step.lease_expires_at:
                continue
        elif step.status != StepStatus.PENDING.value:
            continue

        in_edges = incoming_edges.get(node_id, [])

        # Start node with no parents is immediately ready
        if not in_edges:
            ready_node_ids.append(node_id)
            continue

        # Check all parent nodes
        all_parents_done = True
        has_active_parent = False

        for edge in in_edges:
            parent_id = edge["source_node_id"]
            parent_step = step_runs.get(parent_id)
            if not parent_step:
                all_parents_done = False
                break

            parent_status = parent_step.status
            if parent_status not in (StepStatus.SUCCEEDED.value, StepStatus.SKIPPED.value):
                all_parents_done = False
                break

            # If parent succeeded, check if it was a condition node
            if parent_status == StepStatus.SUCCEEDED.value:
                parent_node = node_map.get(parent_id, {})
                if parent_node.get("type") == "condition":
                    selected_branch = (parent_step.output_data or {}).get("selected_branch")
                    required_handle = edge.get("source_handle")
                    # If this edge handle matches the branch selected by the condition node, or is unconstrained
                    if not required_handle or required_handle == selected_branch:
                        has_active_parent = True
                else:
                    has_active_parent = True

        if all_parents_done and has_active_parent:
            ready_node_ids.append(node_id)

    return ready_node_ids


def identify_skipped_nodes(
    definition: dict[str, Any],
    step_runs: dict[str, Any],
    condition_node_id: str,
    selected_branch: str,
) -> list[str]:
    """Finds downstream nodes that should be marked SKIPPED because they belong to unselected branches."""
    edges = definition.get("edges", [])

    # Outgoing edges from condition node
    outgoing = [e for e in edges if e["source_node_id"] == condition_node_id]

    skipped_target_ids: set[str] = set()
    for edge in outgoing:
        handle = edge.get("source_handle")
        # Only branch-specific handles that differ from the selected branch are skipped
        if handle and handle != selected_branch:
            skipped_target_ids.add(edge["target_node_id"])

    # Traverse downstream to cascade skips if all paths to a node are skipped
    incoming_edges: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for edge in edges:
        incoming_edges[edge["target_node_id"]].append(edge)

    cascaded_skips: list[str] = []
    queue = deque(list(skipped_target_ids))

    while queue:
        curr_id = queue.popleft()
        step = step_runs.get(curr_id)
        if step and step.status != StepStatus.PENDING.value:
            continue

        in_edges = incoming_edges.get(curr_id, [])
        # Check if all incoming edges lead from skipped nodes or inactive branch handles
        all_incoming_inactive = True
        for e in in_edges:
            src_id = e["source_node_id"]
            if src_id == condition_node_id:
                handle = e.get("source_handle")
                if not handle or handle == selected_branch:
                    all_incoming_inactive = False
                    break
                else:
                    continue

            src_step = step_runs.get(src_id)
            if src_step and src_step.status != StepStatus.SKIPPED.value:
                # Another path might be active
                if src_id not in skipped_target_ids and src_id not in cascaded_skips:
                    all_incoming_inactive = False
                    break

        if all_incoming_inactive:
            cascaded_skips.append(curr_id)
            # Find downstream children
            children = [e["target_node_id"] for e in edges if e["source_node_id"] == curr_id]
            for child in children:
                if child not in cascaded_skips and child not in queue:
                    queue.append(child)

    return cascaded_skips


def check_execution_completion(
    definition: dict[str, Any],
    step_runs: dict[str, Any],
) -> tuple[bool, bool, str | None]:
    """Checks whether the workflow execution has concluded.

    Returns:
      (is_completed, is_failed, final_output_node_id)
    """
    nodes = definition.get("nodes", [])

    has_failed = False
    all_terminal = True
    output_node_id: str | None = None

    for node in nodes:
        node_id = node["id"]
        step = step_runs.get(node_id)
        if not step:
            all_terminal = False
            continue

        if step.status == StepStatus.FAILED.value:
            has_failed = True

        if step.status not in (
            StepStatus.SUCCEEDED.value,
            StepStatus.FAILED.value,
            StepStatus.CANCELLED.value,
            StepStatus.SKIPPED.value,
        ):
            all_terminal = False

        if node.get("type") == "output" and step.status == StepStatus.SUCCEEDED.value:
            output_node_id = node_id

    return all_terminal, has_failed, output_node_id
