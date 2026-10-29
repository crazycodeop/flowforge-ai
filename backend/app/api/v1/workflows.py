from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.workflow import Workflow, WorkflowVersion, compute_definition_checksum
from app.nodes.registry import get_available_node_types
from app.schemas.workflow import (
    ValidationResult,
    WorkflowCreate,
    WorkflowDefinition,
    WorkflowResponse,
    WorkflowUpdate,
    WorkflowVersionResponse,
)
from app.workflows.flagship import create_or_update_flagship_workflow
from app.workflows.validation import validate_workflow_graph

router = APIRouter(prefix="/workflows", tags=["Workflows"])


class PublishRequest(BaseModel):
    changelog: str | None = None


@router.get("/nodes", summary="Catalog of available node types")
def list_available_nodes() -> list[dict[str, Any]]:
    """Returns the registered node types, their config schemas, and metadata for frontend palette."""
    return get_available_node_types()


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)) -> WorkflowResponse:
    """Creates a new workflow with an initial draft definition."""
    default_def = (
        payload.definition.model_dump()
        if payload.definition
        else {
            "schema_version": "1.0.0",
            "name": payload.name,
            "description": payload.description or "",
            "nodes": [],
            "edges": [],
            "default_timeout_seconds": 3600,
        }
    )

    workflow = Workflow(
        name=payload.name,
        description=payload.description,
        draft_definition=default_def,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        draft_definition=workflow.draft_definition,
        is_active=workflow.is_active,
        latest_version=None,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/", response_model=list[WorkflowResponse])
def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[WorkflowResponse]:
    """Lists workflows with their latest published version number."""
    stmt = (
        select(
            Workflow,
            func.max(WorkflowVersion.version_number).label("latest_version"),
        )
        .outerjoin(WorkflowVersion, Workflow.id == WorkflowVersion.workflow_id)
        .group_by(Workflow.id)
        .order_by(desc(Workflow.updated_at))
        .offset(skip)
        .limit(limit)
    )
    results = db.execute(stmt).all()

    items = []
    for wf, latest_v in results:
        items.append(
            WorkflowResponse(
                id=wf.id,
                name=wf.name,
                description=wf.description,
                draft_definition=wf.draft_definition,
                is_active=wf.is_active,
                latest_version=latest_v,
                created_at=wf.created_at,
                updated_at=wf.updated_at,
            )
        )
    return items


@router.post("/seed-flagship", response_model=WorkflowResponse, summary="Seed flagship workflow")
def seed_flagship(db: Session = Depends(get_db)) -> WorkflowResponse:
    """Seeds or updates the flagship customer support triage workflow with immutable version 1."""
    workflow = create_or_update_flagship_workflow(db)
    stmt = select(func.max(WorkflowVersion.version_number)).where(
        WorkflowVersion.workflow_id == workflow.id
    )
    latest_version = db.scalar(stmt)
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        is_active=workflow.is_active,
        draft_definition=workflow.draft_definition,
        latest_version=latest_version,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)) -> WorkflowResponse:
    """Retrieves workflow details and draft definition."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    latest_version = db.scalar(
        select(func.max(WorkflowVersion.version_number)).where(
            WorkflowVersion.workflow_id == workflow_id
        )
    )

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        draft_definition=workflow.draft_definition,
        is_active=workflow.is_active,
        latest_version=latest_version,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(
    workflow_id: str,
    payload: WorkflowUpdate,
    db: Session = Depends(get_db),
) -> WorkflowResponse:
    """Updates a workflow's metadata or draft definition without affecting published versions."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    if payload.name is not None:
        workflow.name = payload.name
    if payload.description is not None:
        workflow.description = payload.description
    if payload.definition is not None:
        workflow.draft_definition = payload.definition.model_dump()

    db.commit()
    db.refresh(workflow)

    latest_version = db.scalar(
        select(func.max(WorkflowVersion.version_number)).where(
            WorkflowVersion.workflow_id == workflow_id
        )
    )

    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        draft_definition=workflow.draft_definition,
        is_active=workflow.is_active,
        latest_version=latest_version,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)) -> None:
    """Deletes a workflow and all associated drafts and version records."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    db.delete(workflow)
    db.commit()


@router.post("/{workflow_id}/validate", response_model=ValidationResult)
def validate_workflow(
    workflow_id: str,
    override_definition: WorkflowDefinition | None = None,
    db: Session = Depends(get_db),
) -> ValidationResult:
    """Validates the graph structure, schemas, and reachability of the workflow draft."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    raw_def = override_definition.model_dump() if override_definition else workflow.draft_definition
    definition = WorkflowDefinition.model_validate(raw_def)
    return validate_workflow_graph(definition)


@router.post(
    "/{workflow_id}/publish",
    response_model=WorkflowVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
def publish_workflow(
    workflow_id: str,
    payload: PublishRequest | None = None,
    db: Session = Depends(get_db),
) -> WorkflowVersionResponse:
    """Validates the draft graph and publishes an immutable version snapshot."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Authoritative backend validation
    try:
        parsed_def = WorkflowDefinition.model_validate(workflow.draft_definition)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Draft definition does not conform to workflow schema: {str(e)}",
        ) from e

    val_result = validate_workflow_graph(parsed_def)
    if not val_result.is_valid:
        error_details = [err.model_dump() for err in val_result.errors]
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Cannot publish invalid workflow graph", "errors": error_details},
        )

    # Determine next version number
    current_max_v = db.scalar(
        select(func.max(WorkflowVersion.version_number)).where(
            WorkflowVersion.workflow_id == workflow_id
        )
    )
    next_version = (current_max_v or 0) + 1

    # Compute immutable SHA-256 checksum
    checksum = compute_definition_checksum(workflow.draft_definition)
    changelog_str = payload.changelog if payload else None

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=next_version,
        definition=workflow.draft_definition,
        checksum=checksum,
        changelog=changelog_str,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    return WorkflowVersionResponse(
        id=version.id,
        workflow_id=version.workflow_id,
        version_number=version.version_number,
        definition=version.definition,
        checksum=version.checksum,
        changelog=version.changelog,
        published_at=version.published_at,
    )


@router.get("/{workflow_id}/versions", response_model=list[WorkflowVersionResponse])
def list_workflow_versions(
    workflow_id: str,
    db: Session = Depends(get_db),
) -> list[WorkflowVersionResponse]:
    """Retrieves all immutable published versions of a workflow in descending order."""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    stmt = (
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow_id)
        .order_by(desc(WorkflowVersion.version_number))
    )
    versions = db.scalars(stmt).all()
    return [WorkflowVersionResponse.model_validate(v) for v in versions]


@router.get("/{workflow_id}/versions/{version_number}", response_model=WorkflowVersionResponse)
def get_workflow_version(
    workflow_id: str,
    version_number: int,
    db: Session = Depends(get_db),
) -> WorkflowVersionResponse:
    """Retrieves a specific immutable published version of a workflow."""
    stmt = select(WorkflowVersion).where(
        WorkflowVersion.workflow_id == workflow_id,
        WorkflowVersion.version_number == version_number,
    )
    version = db.scalar(stmt)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Workflow version not found"
        )

    return WorkflowVersionResponse.model_validate(version)
