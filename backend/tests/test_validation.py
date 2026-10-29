from app.nodes.base import NodeType
from app.schemas.workflow import (
    EdgeDefinition,
    NodeDefinition,
    WorkflowDefinition,
)
from app.workflows.validation import validate_workflow_graph


def test_valid_linear_workflow():
    definition = WorkflowDefinition(
        name="Linear Support Flow",
        nodes=[
            NodeDefinition(
                id="start-node",
                type=NodeType.TRIGGER,
                name="API Webhook Trigger",
                config={"trigger_type": "api"},
            ),
            NodeDefinition(
                id="classify-node",
                type=NodeType.AI_CLASSIFY,
                name="Ticket Classifier",
                config={
                    "prompt_template": "Classify the following ticket into categories: {ticket}",
                    "categories": ["billing", "technical", "general"],
                },
            ),
            NodeDefinition(
                id="output-node",
                type=NodeType.OUTPUT,
                name="Result Assembler",
                config={"response_template": {"status": "processed"}},
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start-node", target_node_id="classify-node"),
            EdgeDefinition(id="e2", source_node_id="classify-node", target_node_id="output-node"),
        ],
    )

    result = validate_workflow_graph(definition)
    assert result.is_valid is True
    assert len(result.errors) == 0


def test_valid_branching_workflow():
    definition = WorkflowDefinition(
        name="Branching Flow",
        nodes=[
            NodeDefinition(
                id="start",
                type=NodeType.TRIGGER,
                name="Trigger",
                config={"trigger_type": "api"},
            ),
            NodeDefinition(
                id="cond",
                type=NodeType.CONDITION,
                name="Route Branch",
                config={
                    "branches": [
                        {
                            "branch_name": "high_priority",
                            "operator": "equals",
                            "field_path": "urgency",
                            "value": "high",
                        },
                    ],
                    "default_branch": "default",
                },
            ),
            NodeDefinition(
                id="approval",
                type=NodeType.HUMAN_APPROVAL,
                name="Human Review",
                config={"title": "Review High Urgency", "timeout_hours": 12},
            ),
            NodeDefinition(
                id="output",
                type=NodeType.OUTPUT,
                name="Final Output",
                config={},
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="cond"),
            EdgeDefinition(
                id="e2",
                source_node_id="cond",
                target_node_id="approval",
                source_handle="high_priority",
            ),
            EdgeDefinition(
                id="e3", source_node_id="cond", target_node_id="output", source_handle="default"
            ),
            EdgeDefinition(id="e4", source_node_id="approval", target_node_id="output"),
        ],
    )

    result = validate_workflow_graph(definition)
    assert result.is_valid is True
    assert len(result.errors) == 0


def test_reject_empty_workflow():
    definition = WorkflowDefinition(name="Empty", nodes=[], edges=[])
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "EMPTY_GRAPH" for err in result.errors)


def test_reject_duplicate_node_ids():
    definition = WorkflowDefinition(
        name="Duplicate IDs",
        nodes=[
            NodeDefinition(
                id="node-1", type=NodeType.TRIGGER, name="Trigger 1", config={"trigger_type": "api"}
            ),
            NodeDefinition(id="node-1", type=NodeType.OUTPUT, name="Trigger 2", config={}),
        ],
        edges=[],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "DUPLICATE_NODE_ID" for err in result.errors)


def test_reject_missing_start_node():
    definition = WorkflowDefinition(
        name="No Trigger",
        nodes=[
            NodeDefinition(
                id="output-only",
                type=NodeType.OUTPUT,
                name="Output",
                config={},
            ),
        ],
        edges=[],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "MISSING_START_NODE" for err in result.errors)


def test_reject_direct_cycle():
    definition = WorkflowDefinition(
        name="Direct Cycle",
        nodes=[
            NodeDefinition(
                id="start", type=NodeType.TRIGGER, name="Start", config={"trigger_type": "api"}
            ),
            NodeDefinition(
                id="step-a",
                type=NodeType.TRANSFORM,
                name="Step A",
                config={"mapping_rules": {"a": "b"}},
            ),
            NodeDefinition(
                id="step-b",
                type=NodeType.TRANSFORM,
                name="Step B",
                config={"mapping_rules": {"b": "c"}},
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="step-a"),
            EdgeDefinition(id="e2", source_node_id="step-a", target_node_id="step-b"),
            EdgeDefinition(
                id="e3", source_node_id="step-b", target_node_id="step-a"
            ),  # Cycle: a -> b -> a
        ],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "CYCLE_DETECTED" for err in result.errors)


def test_reject_self_loop():
    definition = WorkflowDefinition(
        name="Self Loop",
        nodes=[
            NodeDefinition(
                id="start", type=NodeType.TRIGGER, name="Start", config={"trigger_type": "api"}
            ),
            NodeDefinition(
                id="loop-node",
                type=NodeType.TRANSFORM,
                name="Loop",
                config={"mapping_rules": {"x": "y"}},
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="loop-node"),
            EdgeDefinition(id="e2", source_node_id="loop-node", target_node_id="loop-node"),
        ],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "SELF_LOOP_DETECTED" for err in result.errors)


def test_reject_unreachable_orphan_node():
    definition = WorkflowDefinition(
        name="Orphan Node",
        nodes=[
            NodeDefinition(
                id="start", type=NodeType.TRIGGER, name="Start", config={"trigger_type": "api"}
            ),
            NodeDefinition(id="output", type=NodeType.OUTPUT, name="Output", config={}),
            NodeDefinition(
                id="disconnected",
                type=NodeType.TRANSFORM,
                name="Floating",
                config={"mapping_rules": {"a": "b"}},
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="output"),
        ],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(
        err.code == "UNREACHABLE_NODE" and err.node_id == "disconnected" for err in result.errors
    )


def test_reject_invalid_edge_references():
    definition = WorkflowDefinition(
        name="Bad Edge",
        nodes=[
            NodeDefinition(
                id="start", type=NodeType.TRIGGER, name="Start", config={"trigger_type": "api"}
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="non-existent-node"),
        ],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(err.code == "INVALID_EDGE_TARGET" for err in result.errors)


def test_reject_invalid_node_config():
    definition = WorkflowDefinition(
        name="Bad Config",
        nodes=[
            NodeDefinition(
                id="start",
                type=NodeType.TRIGGER,
                name="Start",
                config={"trigger_type": "api"},
            ),
            NodeDefinition(
                id="bad-ai",
                type=NodeType.AI_CLASSIFY,
                name="AI Node",
                config={
                    "prompt_template": "Classify",
                    "categories": ["only_one_category"],
                },  # Min length 2
            ),
        ],
        edges=[
            EdgeDefinition(id="e1", source_node_id="start", target_node_id="bad-ai"),
        ],
    )
    result = validate_workflow_graph(definition)
    assert result.is_valid is False
    assert any(
        err.code == "INVALID_NODE_CONFIG" and err.node_id == "bad-ai" for err in result.errors
    )
