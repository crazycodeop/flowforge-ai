import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import StepRun, WorkflowRun
from app.models.workflow import WorkflowVersion
from app.workflows.errors import ErrorCategory
from app.workflows.executor import emit_event, execute_workflow_run
from app.workflows.state_machine import RunStatus, StepStatus

logger = logging.getLogger("flowforge.recovery")


def recover_stale_runs(
    db: Session,
    stale_grace_seconds: int = 10,
    auto_resume: bool = True,
) -> dict[str, Any]:
    """Identifies orphaned or stale step executions whose worker leases have expired without

    completion, re-evaluates retry eligibility, and resumes execution without re-running
    already successful upstream steps.
    """
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=stale_grace_seconds)

    # 1. Query running steps with expired lease or running beyond cutoff
    stale_steps_stmt = (
        select(StepRun)
        .join(WorkflowRun, StepRun.workflow_run_id == WorkflowRun.id)
        .where(
            WorkflowRun.status == RunStatus.RUNNING.value,
            StepRun.status == StepStatus.RUNNING.value,
            (StepRun.lease_expires_at != None) & (StepRun.lease_expires_at < cutoff),  # noqa: E711
        )
    )
    stale_steps = db.scalars(stale_steps_stmt).all()

    recovered_runs: set[str] = set()
    failed_runs: set[str] = set()

    for step in stale_steps:
        run = db.get(WorkflowRun, step.workflow_run_id)
        if not run:
            continue

        version = db.get(WorkflowVersion, run.workflow_version_id)
        if not version:
            continue

        # Find node definition to check retry policy
        nodes = version.definition.get("nodes", [])
        node_def = next((n for n in nodes if n["id"] == step.node_id), {})
        retry_policy = node_def.get("retry_policy", {})
        max_retries = retry_policy.get("max_retries", 3)

        logger.warning(
            "Detected stale step '%s' in run '%s' (attempts=%d, max=%d)",
            step.node_id,
            run.id,
            step.attempt_count,
            max_retries,
        )

        emit_event(
            db,
            run.id,
            "RUN_RECOVERY_ATTEMPTED",
            step_run_id=step.id,
            payload={
                "node_id": step.node_id,
                "attempt_count": step.attempt_count,
                "lease_expired_at": step.lease_expires_at.isoformat()
                if step.lease_expires_at
                else None,
            },
        )

        # Evaluate if step can be rescheduled
        if step.attempt_count < max_retries:
            step.status = StepStatus.RETRY_WAIT.value
            step.worker_lease_id = None
            step.lease_expires_at = None
            step.error_details = {
                "category": ErrorCategory.TRANSIENT_NETWORK.value,
                "reason": "Worker lease expired; recovered by orchestrator",
            }
            emit_event(
                db,
                run.id,
                "STEP_RETRY_SCHEDULED",
                step_run_id=step.id,
                payload={"node_id": step.node_id, "recovered": True},
            )
            recovered_runs.add(run.id)
        else:
            # Max retries exhausted
            step.status = StepStatus.FAILED.value
            step.completed_at = now
            step.error_details = {
                "category": ErrorCategory.SYSTEM_ERROR.value,
                "error": "Worker lease expired and maximum retries exhausted",
            }
            emit_event(
                db, run.id, "STEP_FAILED", step_run_id=step.id, payload={"node_id": step.node_id}
            )

            run.status = RunStatus.FAILED.value
            run.completed_at = now
            run.error_message = (
                f"Step '{step.node_id}' failed: lease expired with max retries exceeded."
            )
            emit_event(db, run.id, "RUN_FAILED", payload={"failed_node_id": step.node_id})
            failed_runs.add(run.id)

    db.commit()

    # Automatically resume eligible recovered runs if requested
    resumed_count = 0
    if auto_resume:
        for run_id in recovered_runs:
            if run_id not in failed_runs:
                try:
                    execute_workflow_run(run_id, db)
                    resumed_count += 1
                except Exception as e:
                    logger.exception("Failed to auto-resume recovered run '%s': %s", run_id, str(e))

    return {
        "stale_steps_found": len(stale_steps),
        "recovered_runs": list(recovered_runs),
        "failed_runs": list(failed_runs),
        "resumed_runs_count": resumed_count,
    }
