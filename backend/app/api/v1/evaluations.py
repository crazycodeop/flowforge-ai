from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.evaluations.runner import run_evaluation_benchmark
from app.models.evaluation import EvaluationDataset, EvaluationRun
from app.models.workflow import Workflow, WorkflowVersion

router = APIRouter(prefix="/evaluations", tags=["AI Evaluations & Benchmarks"])


class DatasetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None
    test_cases: list[dict[str, Any]] = Field(default_factory=list)


class EvaluationRunCreateRequest(BaseModel):
    dataset_id: str
    workflow_id: str
    version_number: int | None = None


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    test_case_count: int
    created_at: datetime


class EvaluationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str
    workflow_id: str
    workflow_version_id: str
    status: str
    accuracy_score: float | None
    avg_latency_ms: float | None
    total_cost_usd: float | None
    summary_metrics: dict[str, Any]
    results: list[dict[str, Any]]
    created_at: datetime
    completed_at: datetime | None


@router.get("/datasets", response_model=list[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    """Lists all registered evaluation benchmark datasets."""
    stmt = select(EvaluationDataset).order_by(EvaluationDataset.name)
    datasets = db.scalars(stmt).all()
    return [
        DatasetResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            test_case_count=len(d.test_cases or []),
            created_at=d.created_at,
        )
        for d in datasets
    ]


@router.post("/datasets", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
def create_dataset(payload: DatasetCreateRequest, db: Session = Depends(get_db)):
    """Registers a new benchmark dataset with test assertions."""
    existing = db.scalar(select(EvaluationDataset).where(EvaluationDataset.name == payload.name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Evaluation dataset '{payload.name}' already exists.",
        )

    ds = EvaluationDataset(
        name=payload.name,
        description=payload.description,
        test_cases=payload.test_cases,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return DatasetResponse(
        id=ds.id,
        name=ds.name,
        description=ds.description,
        test_case_count=len(ds.test_cases),
        created_at=ds.created_at,
    )


@router.get("/runs", response_model=list[EvaluationRunResponse])
def list_evaluation_runs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Lists past evaluation benchmark executions and metrics."""
    stmt = select(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(limit)
    runs = db.scalars(stmt).all()
    return runs


@router.post("/runs", response_model=EvaluationRunResponse, status_code=status.HTTP_201_CREATED)
def trigger_evaluation_run(payload: EvaluationRunCreateRequest, db: Session = Depends(get_db)):
    """Triggers an evaluation benchmark run across an immutable workflow version."""
    dataset = db.get(EvaluationDataset, payload.dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{payload.dataset_id}' not found.",
        )

    workflow = db.get(Workflow, payload.workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{payload.workflow_id}' not found.",
        )

    # Resolve target version
    if payload.version_number:
        version = db.scalar(
            select(WorkflowVersion).where(
                WorkflowVersion.workflow_id == payload.workflow_id,
                WorkflowVersion.version_number == payload.version_number,
            )
        )
    else:
        version = db.scalar(
            select(WorkflowVersion)
            .where(WorkflowVersion.workflow_id == payload.workflow_id)
            .order_by(WorkflowVersion.version_number.desc())
        )

    if not version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No published version found for workflow '{payload.workflow_id}'. Please publish a version first.",
        )

    eval_run = EvaluationRun(
        dataset_id=dataset.id,
        workflow_id=workflow.id,
        workflow_version_id=version.id,
        status="PENDING",
    )
    db.add(eval_run)
    db.commit()
    db.refresh(eval_run)

    # Execute benchmark
    completed_run = run_evaluation_benchmark(db, eval_run.id)
    return completed_run


@router.get("/runs/{run_id}", response_model=EvaluationRunResponse)
def get_evaluation_run(run_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed benchmark metrics and per-case results."""
    eval_run = db.get(EvaluationRun, run_id)
    if not eval_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation run '{run_id}' not found.",
        )
    return eval_run


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_benchmark_dataset(db: Session = Depends(get_db)):
    """Seeds the standard Customer Support Quality benchmark dataset."""
    name = "Customer Support Triage Quality Benchmark"
    existing = db.scalar(select(EvaluationDataset).where(EvaluationDataset.name == name))
    if existing:
        return {"message": "Benchmark dataset already exists", "dataset_id": existing.id}

    test_cases = [
        {
            "name": "Billing duplicate charge inquiry",
            "input": {
                "ticket_text": "I was billed twice on my Mastercard for $49. Please issue a refund."
            },
            "expected_category": "billing",
        },
        {
            "name": "Invoice copy request",
            "input": {
                "ticket_text": "Can you please email me the official PDF tax invoice for last month?"
            },
            "expected_category": "billing",
        },
        {
            "name": "Critical cluster crash report",
            "input": {
                "ticket_text": "Our production worker nodes crashed with out of memory error. Outage is ongoing."
            },
            "expected_category": "technical",
        },
        {
            "name": "API connection timeout issue",
            "input": {
                "ticket_text": "We are getting 504 gateway timeout errors when calling your API endpoints."
            },
            "expected_category": "technical",
        },
        {
            "name": "General question about operating hours",
            "input": {"ticket_text": "What are your customer support office operating hours?"},
            "expected_category": "general",
        },
    ]

    ds = EvaluationDataset(
        name=name,
        description="Standard evaluation suite verifying AI classification and policy compliance for customer support.",
        test_cases=test_cases,
    )
    db.add(ds)
    db.commit()
    return {
        "message": "Seeded benchmark dataset",
        "dataset_id": ds.id,
        "case_count": len(test_cases),
    }
