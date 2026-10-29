from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.execution import ExecutionEvent, StepRun, WorkflowRun
from app.models.workflow import Workflow, WorkflowVersion
from app.schemas.execution import (
    ExecutionEventResponse,
    RunCreateRequest,
    StepRunResponse,
    WorkflowRunResponse,
)
from app.workers.tasks import execute_workflow_task
from app.workflows.executor import emit_event
from app.workflows.state_machine import RunStatus, StepStatus, validate_run_transition

router = APIRouter(tags=["Executions"])


@router.post(
    "/workflows/{workflow_id}/runs",
    response_model=WorkflowRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger a workflow run",
)
def trigger_workflow_run(
    workflow_id: str,
    payload: RunCreateRequest,
    db: Session = Depends(get_db),
) -> WorkflowRunResponse:
    """Initializes a workflow execution, creates durable StepRun records for all nodes,

    enqueues the Celery worker task, and responds immediately with HTTP 202.
    """
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Resolve target version
    if payload.version_number is not None:
        stmt = select(WorkflowVersion).where(
            WorkflowVersion.workflow_id == workflow_id,
            WorkflowVersion.version_number == payload.version_number,
        )
        version = db.scalar(stmt)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow version {payload.version_number} not found",
            )
    else:
        # Default to latest published version
        stmt = (
            select(WorkflowVersion)
            .where(WorkflowVersion.workflow_id == workflow_id)
            .order_by(desc(WorkflowVersion.version_number))
            .limit(1)
        )
        version = db.scalar(stmt)
        if not version:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workflow has no published versions. Publish a version before triggering a run.",
            )

    definition = version.definition
    nodes = definition.get("nodes", [])

    # Create WorkflowRun
    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=version.id,
        status=RunStatus.QUEUED.value,
        input_payload=payload.input_payload,
    )
    db.add(run)
    db.flush()  # Obtain run.id

    # Create initial StepRun records in PENDING state
    for node in nodes:
        step_run = StepRun(
            workflow_run_id=run.id,
            node_id=node["id"],
            node_type=node["type"],
            status=StepStatus.PENDING.value,
            input_data={},
        )
        db.add(step_run)

    emit_event(
        db,
        run.id,
        "RUN_CREATED",
        payload={
            "workflow_id": workflow_id,
            "version_number": version.version_number,
            "node_count": len(nodes),
        },
    )
    emit_event(db, run.id, "RUN_QUEUED")
    db.commit()
    db.refresh(run)

    # Dispatch to background Celery worker
    execute_workflow_task.delay(run.id)

    return WorkflowRunResponse.model_validate(run)


@router.get("/workflows/{workflow_id}/runs", response_model=list[WorkflowRunResponse])
def list_workflow_runs(
    workflow_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[WorkflowRunResponse]:
    """Lists execution runs for a specific workflow."""
    stmt = (
        select(WorkflowRun)
        .where(WorkflowRun.workflow_id == workflow_id)
        .order_by(desc(WorkflowRun.created_at))
        .offset(skip)
        .limit(limit)
    )
    runs = db.scalars(stmt).all()
    return [WorkflowRunResponse.model_validate(r) for r in runs]


@router.get("/runs/{run_id}", response_model=WorkflowRunResponse)
def get_run_status(run_id: str, db: Session = Depends(get_db)) -> WorkflowRunResponse:
    """Retrieves current status, timing, and inputs/outputs of a workflow run."""
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return WorkflowRunResponse.model_validate(run)


@router.get("/runs/{run_id}/steps", response_model=list[StepRunResponse])
def list_run_steps(run_id: str, db: Session = Depends(get_db)) -> list[StepRunResponse]:
    """Retrieves step-level execution details and outputs for each node in a run."""
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    stmt = select(StepRun).where(StepRun.workflow_run_id == run_id).order_by(StepRun.created_at)
    steps = db.scalars(stmt).all()
    return [StepRunResponse.model_validate(s) for s in steps]


@router.get("/runs/{run_id}/events", response_model=list[ExecutionEventResponse])
def get_run_events(run_id: str, db: Session = Depends(get_db)) -> list[ExecutionEventResponse]:
    """Retrieves the chronological audit event log for a run."""
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    stmt = (
        select(ExecutionEvent)
        .where(ExecutionEvent.workflow_run_id == run_id)
        .order_by(ExecutionEvent.created_at)
    )
    events = db.scalars(stmt).all()
    return [ExecutionEventResponse.model_validate(e) for e in events]


@router.post("/runs/{run_id}/cancel", response_model=WorkflowRunResponse)
def cancel_workflow_run(run_id: str, db: Session = Depends(get_db)) -> WorkflowRunResponse:
    """Requests cooperative cancellation of an in-progress or queued workflow run."""
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    current_status = RunStatus(run.status)
    validate_run_transition(current_status, RunStatus.CANCELLED)

    run.status = RunStatus.CANCELLED.value
    run.completed_at = datetime.now(UTC)
    emit_event(db, run.id, "RUN_CANCELLED", payload={"reason": "user_cancelled"})

    # Mark any pending or running steps as CANCELLED
    stmt = select(StepRun).where(
        StepRun.workflow_run_id == run_id,
        StepRun.status.in_(
            [StepStatus.PENDING.value, StepStatus.RUNNING.value, StepStatus.QUEUED.value]
        ),
    )
    active_steps = db.scalars(stmt).all()
    for step in active_steps:
        step.status = StepStatus.CANCELLED.value
        step.completed_at = datetime.now(UTC)

    db.commit()
    db.refresh(run)

    return WorkflowRunResponse.model_validate(run)
