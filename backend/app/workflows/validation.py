from collections import defaultdict, deque
from typing import Any

from app.core.config import get_settings
from app.nodes.base import NodeType
from app.nodes.registry import NODE_REGISTRY, validate_node_configuration
from app.schemas.workflow import (
    ValidationErrorDetail,
    ValidationResult,
    WorkflowDefinition,
)

settings = get_settings()


def validate_workflow_graph(definition: WorkflowDefinition) -> ValidationResult:
    """Validates that a workflow definition is structurally sound, conforms to node schemas,

    contains no cycles, and respects platform limits.
    """
    errors: list[ValidationErrorDetail] = []
    warnings: list[str] = []

    nodes = definition.nodes
    edges = definition.edges

    # 1. Platform limit: maximum nodes
    if len(nodes) > settings.MAX_WORKFLOW_NODES:
        errors.append(
            ValidationErrorDetail(
                code="MAX_NODES_EXCEEDED",
                message=f"Workflow contains {len(nodes)} nodes, exceeding maximum limit of {settings.MAX_WORKFLOW_NODES}",
            )
        )

    # 2. Check for empty graph
    if not nodes:
        errors.append(
            ValidationErrorDetail(
                code="EMPTY_GRAPH",
                message="Workflow must contain at least one start/trigger node",
            )
        )
        return ValidationResult(is_valid=False, errors=errors, warnings=warnings)

    # 3. Check for unique node IDs
    node_map: dict[str, Any] = {}
    duplicate_ids: set[str] = set()
    for node in nodes:
        if node.id in node_map:
            duplicate_ids.add(node.id)
            errors.append(
                ValidationErrorDetail(
                    code="DUPLICATE_NODE_ID",
                    message=f"Duplicate node identifier '{node.id}' detected",
                    node_id=node.id,
                )
            )
        else:
            node_map[node.id] = node

    # 4. Check for at least one start node
    start_nodes = [
        node for node in nodes if NODE_REGISTRY.get(node.type) and NODE_REGISTRY[node.type].is_start
    ]
    if not start_nodes:
        errors.append(
            ValidationErrorDetail(
                code="MISSING_START_NODE",
                message="Workflow must contain at least one start node (e.g. 'trigger' or 'input_data')",
            )
        )

    # 5. Validate individual node configurations against registry
    for node in nodes:
        if node.type not in NODE_REGISTRY:
            errors.append(
                ValidationErrorDetail(
                    code="UNREGISTERED_NODE_TYPE",
                    message=f"Node type '{node.type}' is not registered in the platform",
                    node_id=node.id,
                )
            )
            continue

        is_valid, err_msg, _ = validate_node_configuration(node.type, node.config)
        if not is_valid:
            errors.append(
                ValidationErrorDetail(
                    code="INVALID_NODE_CONFIG",
                    message=f"Node '{node.name}' ({node.id}) configuration invalid: {err_msg}",
                    node_id=node.id,
                )
            )

    # 6. Validate edge references, duplicates, and self-loops
    seen_edges: set[tuple[str, str, str | None]] = set()
    adjacency: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {node.id: 0 for node in nodes}

    for edge in edges:
        # Check source exists
        if edge.source_node_id not in node_map:
            errors.append(
                ValidationErrorDetail(
                    code="INVALID_EDGE_SOURCE",
                    message=f"Edge '{edge.id}' references non-existent source node '{edge.source_node_id}'",
                    edge_id=edge.id,
                )
            )
            continue

        # Check target exists
        if edge.target_node_id not in node_map:
            errors.append(
                ValidationErrorDetail(
                    code="INVALID_EDGE_TARGET",
                    message=f"Edge '{edge.id}' references non-existent target node '{edge.target_node_id}'",
                    edge_id=edge.id,
                )
            )
            continue

        # Check self-loop
        if edge.source_node_id == edge.target_node_id:
            errors.append(
                ValidationErrorDetail(
                    code="SELF_LOOP_DETECTED",
                    message=f"Edge '{edge.id}' creates an invalid self-loop on node '{edge.source_node_id}'",
                    node_id=edge.source_node_id,
                    edge_id=edge.id,
                )
            )
            continue

        edge_key = (edge.source_node_id, edge.target_node_id, edge.source_handle)
        if edge_key in seen_edges:
            warnings.append(
                f"Duplicate edge detected from '{edge.source_node_id}' to '{edge.target_node_id}' with handle '{edge.source_handle}'"
            )
        else:
            seen_edges.add(edge_key)
            adjacency[edge.source_node_id].append(edge.target_node_id)
            in_degree[edge.target_node_id] += 1

    # If basic edge errors occurred, cycle detection may not be safe
    edge_errors = [e for e in errors if e.code in ("INVALID_EDGE_SOURCE", "INVALID_EDGE_TARGET")]
    if edge_errors:
        return ValidationResult(is_valid=False, errors=errors, warnings=warnings)

    # 7. Cycle Detection via Kahn's Algorithm / Topological Sort
    temp_in_degree = in_degree.copy()
    queue = deque([node_id for node_id, deg in temp_in_degree.items() if deg == 0])
    visited_count = 0

    while queue:
        curr = queue.popleft()
        visited_count += 1
        for neighbor in adjacency[curr]:
            temp_in_degree[neighbor] -= 1
            if temp_in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited_count < len(nodes):
        # Remaining nodes with in_degree > 0 are part of or reached from a cycle
        cycle_nodes = [node_id for node_id, deg in temp_in_degree.items() if deg > 0]
        errors.append(
            ValidationErrorDetail(
                code="CYCLE_DETECTED",
                message=f"Workflow contains an unsupported cycle involving nodes: {', '.join(cycle_nodes)}",
            )
        )

    # 8. Reachability from Start Nodes (Orphan detection)
    reachable: set[str] = set()
    bfs_queue = deque([node.id for node in start_nodes if node.id in node_map])
    for s in bfs_queue:
        reachable.add(s)

    while bfs_queue:
        curr = bfs_queue.popleft()
        for nxt in adjacency[curr]:
            if nxt not in reachable:
                reachable.add(nxt)
                bfs_queue.append(nxt)

    unreachable = [node.id for node in nodes if node.id not in reachable]
    if unreachable:
        for unreach_id in unreachable:
            errors.append(
                ValidationErrorDetail(
                    code="UNREACHABLE_NODE",
                    message=f"Node '{node_map[unreach_id].name}' ({unreach_id}) is unreachable from any start node",
                    node_id=unreach_id,
                )
            )

    # 9. Maximum Graph Depth Check
    def calculate_max_depth() -> int:
        depths: dict[str, int] = {node.id: 1 for node in start_nodes if node.id in node_map}
        # Process in topological order
        topo_queue = deque(
            [node.id for node in start_nodes if node.id in node_map and in_degree[node.id] == 0]
        )
        max_d = 1
        while topo_queue:
            curr = topo_queue.popleft()
            curr_depth = depths.get(curr, 1)
            max_d = max(max_d, curr_depth)
            for neighbor in adjacency[curr]:
                if depths.get(neighbor, 0) < curr_depth + 1:
                    depths[neighbor] = curr_depth + 1
                    topo_queue.append(neighbor)
        return max_d

    if not any(e.code == "CYCLE_DETECTED" for e in errors):
        graph_depth = calculate_max_depth()
        if graph_depth > settings.MAX_GRAPH_DEPTH:
            errors.append(
                ValidationErrorDetail(
                    code="MAX_DEPTH_EXCEEDED",
                    message=f"Workflow graph depth of {graph_depth} exceeds platform limit of {settings.MAX_GRAPH_DEPTH}",
                )
            )

    # 10. Conditional Branch Edge Validation
    for node in nodes:
        if node.type == NodeType.CONDITION:
            # Check that branch handles exist in edges
            outgoing_handles = {
                e.source_handle for e in edges if e.source_node_id == node.id and e.source_handle
            }
            branches = node.config.get("branches", [])
            expected_handles = {b.get("branch_name") for b in branches if isinstance(b, dict)}
            default_branch = node.config.get("default_branch", "default")
            expected_handles.add(default_branch)

            missing_handles = expected_handles - outgoing_handles
            if missing_handles:
                warnings.append(
                    f"Conditional node '{node.name}' ({node.id}) has unrouted branch handles: {', '.join(missing_handles)}"
                )

    is_valid = len(errors) == 0
    return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
