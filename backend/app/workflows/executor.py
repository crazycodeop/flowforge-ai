import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import ExecutionEvent, StepRun, WorkflowRun
from app.models.workflow import WorkflowVersion
from app.nodes.executors import get_node_executor
from app.workflows.context import ExecutionContext
from app.workflows.scheduler import (
    check_execution_completion,
    find_ready_nodes,
    identify_skipped_nodes,
)
from app.workflows.state_machine import (
    RunStatus,
    StepStatus,
    validate_run_transition,
    validate_step_transition,
)

logger = logging.getLogger("flowforge.executor")


def emit_event(
    db: Session,
    workflow_run_id: str,
    event_type: str,
    step_run_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Appends an execution audit event record to PostgreSQL."""
    event = ExecutionEvent(
        workflow_run_id=workflow_run_id,
        step_run_id=step_run_id,
        event_type=event_type,
        payload=payload,
    )
    db.add(event)


def execute_workflow_run(run_id: str, db: Session) -> WorkflowRun:
    """Authoritative execution loop driving a workflow run to completion.

    Persists all step state transitions, outputs, attempts, and audit events to PostgreSQL.
    """
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise ValueError(f"WorkflowRun '{run_id}' not found")

    if run.status in (RunStatus.SUCCEEDED.value, RunStatus.FAILED.value, RunStatus.CANCELLED.value):
        logger.info("Run '%s' is already in terminal state '%s'", run_id, run.status)
        return run

    version = db.get(WorkflowVersion, run.workflow_version_id)
    if not version:
        raise ValueError(
            f"WorkflowVersion '{run.workflow_version_id}' not found for run '{run_id}'"
        )

    definition = version.definition
    nodes = definition.get("nodes", [])
    node_map = {n["id"]: n for n in nodes}

    # Transition run state to RUNNING if currently PENDING or QUEUED
    current_run_status = RunStatus(run.status)
    if current_run_status != RunStatus.RUNNING:
        validate_run_transition(current_run_status, RunStatus.RUNNING)
        run.status = RunStatus.RUNNING.value
        run.started_at = datetime.now(UTC)
        emit_event(db, run.id, "RUN_STARTED", payload={"version_number": version.version_number})
        db.commit()

    # Load existing step runs map: node_id -> StepRun
    step_runs_stmt = select(StepRun).where(StepRun.workflow_run_id == run.id)
    step_runs_list = db.scalars(step_runs_stmt).all()
    step_runs: dict[str, StepRun] = {s.node_id: s for s in step_runs_list}

    # Main execution loop: evaluate ready nodes until no ready nodes remain
    max_iterations = len(nodes) * 2 + 5
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        ready_node_ids = find_ready_nodes(definition, step_runs)
        if not ready_node_ids:
            break

        for node_id in ready_node_ids:
            node = node_map.get(node_id)
            if not node:
                continue

            step = step_runs[node_id]
            curr_step_status = StepStatus(step.status)
            validate_step_transition(curr_step_status, StepStatus.RUNNING)

            step.status = StepStatus.RUNNING.value
            step.attempt_count += 1
            step.started_at = datetime.now(UTC)
            emit_event(
                db, run.id, "STEP_STARTED", step_run_id=step.id, payload={"node_id": node_id}
            )
            db.commit()

            # Gather upstream outputs
            upstream_outputs = {
                s_id: s.output_data
                for s_id, s in step_runs.items()
                if s.status == StepStatus.SUCCEEDED.value and s.output_data is not None
            }

            # Build ExecutionContext
            ctx = ExecutionContext(
                run_id=run.id,
                node_id=node_id,
                node_type=node["type"],
                node_config=node.get("config", {}),
                run_input=run.input_payload or {},
                upstream_outputs=upstream_outputs,
                workflow_version=version.version_number,
            )

            try:
                executor = get_node_executor(node["type"])
                output = executor.execute(ctx)

                validate_step_transition(StepStatus.RUNNING, StepStatus.SUCCEEDED)
                step.status = StepStatus.SUCCEEDED.value
                step.output_data = output
                step.completed_at = datetime.now(UTC)
                emit_event(
                    db,
                    run.id,
                    "STEP_SUCCEEDED",
                    step_run_id=step.id,
                    payload={"node_id": node_id, "output_keys": list(output.keys())},
                )

                # If this was a condition node, cascade skips to unselected branches
                if node["type"] == "condition":
                    selected_branch = output.get("selected_branch", "default")
                    skipped_ids = identify_skipped_nodes(
                        definition, step_runs, node_id, selected_branch
                    )
                    for skip_id in skipped_ids:
                        skip_step = step_runs.get(skip_id)
                        if skip_step and skip_step.status == StepStatus.PENDING.value:
                            validate_step_transition(StepStatus.PENDING, StepStatus.SKIPPED)
                            skip_step.status = StepStatus.SKIPPED.value
                            skip_step.completed_at = datetime.now(UTC)
                            emit_event(
                                db,
                                run.id,
                                "STEP_SKIPPED",
                                step_run_id=skip_step.id,
                                payload={"node_id": skip_id, "reason": "unselected_branch"},
                            )

                db.commit()

            except Exception as e:
                logger.exception("Step '%s' failed during execution: %s", node_id, str(e))
                validate_step_transition(StepStatus.RUNNING, StepStatus.FAILED)
                step.status = StepStatus.FAILED.value
                step.error_details = {"error": str(e), "node_id": node_id}
                step.completed_at = datetime.now(UTC)
                emit_event(
                    db,
                    run.id,
                    "STEP_FAILED",
                    step_run_id=step.id,
                    payload={"node_id": node_id, "error": str(e)},
                )

                # Fail-fast the workflow run
                validate_run_transition(RunStatus.RUNNING, RunStatus.FAILED)
                run.status = RunStatus.FAILED.value
                run.error_message = f"Node '{node['name']}' ({node_id}) failed: {str(e)}"
                run.completed_at = datetime.now(UTC)
                emit_event(
                    db,
                    run.id,
                    "RUN_FAILED",
                    payload={"failed_node_id": node_id, "error": str(e)},
                )
                db.commit()
                return run

    # Evaluate final completion
    is_complete, has_failed, output_node_id = check_execution_completion(definition, step_runs)

    if is_complete and not has_failed:
        validate_run_transition(RunStatus.RUNNING, RunStatus.SUCCEEDED)
        run.status = RunStatus.SUCCEEDED.value
        run.completed_at = datetime.now(UTC)

        if output_node_id and output_node_id in step_runs:
            run.output_payload = step_runs[output_node_id].output_data

        emit_event(db, run.id, "RUN_COMPLETED", payload={"output_node_id": output_node_id})
        db.commit()

    return run
