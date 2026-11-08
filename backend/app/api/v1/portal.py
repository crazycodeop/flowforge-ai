"""Client Portal API Endpoints — FlowForge Portal.

Dedicated business-user and client application routes for:
- Discovering published workflows
- Fetching dynamic form definitions
- Submitting structured form requests
- AI-powered natural language prompt extraction with clarification
- Tracking request timelines and high-level execution stages
- Client approval review and decision execution
"""

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.ai.factory import get_ai_provider
from app.api.deps import TenantContext, get_optional_tenant_context
from app.core.database import get_db
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.execution import StepRun, WorkflowRun
from app.models.workflow import Workflow, WorkflowVersion
from app.workers.tasks import execute_workflow_task
from app.workflows.executor import emit_event
from app.workflows.state_machine import (
    RunStatus,
    StepStatus,
    validate_run_transition,
    validate_step_transition,
)

router = APIRouter(prefix="/portal", tags=["Client Portal"])


# ---------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------


class PortalWorkflowSummary(BaseModel):
    id: str
    name: str
    description: str | None
    latest_version: int
    input_contract: dict[str, Any]
    allow_natural_language: bool
    created_at: datetime


class PortalFormDefinition(BaseModel):
    workflow_id: str
    workflow_name: str
    description: str | None
    version_number: int
    input_contract: dict[str, Any]
    allow_natural_language: bool
    system_instructions: str | None


class PortalSubmissionRequest(BaseModel):
    inputs: dict[str, Any] = Field(default_factory=dict)
    submitted_by: str | None = Field(default="Client User")
    notes: str | None = None


class PortalSubmissionResponse(BaseModel):
    run_id: str
    workflow_id: str
    status: str
    message: str
    tracking_url: str
    submitted_at: datetime


class NLParseRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=5000)


class NLParseResponse(BaseModel):
    extracted: dict[str, Any]
    missing_required_fields: list[str]
    needs_clarification: bool
    clarification_prompt: str | None
    confidence_score: float = 0.95


class PortalTimelineStage(BaseModel):
    stage_id: str
    name: str
    status: str  # "completed", "in_progress", "pending", "failed"
    timestamp: datetime | None = None
    detail: str | None = None


class PortalRequestSummary(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    submitted_at: datetime
    completed_at: datetime | None = None
    summary_preview: str | None = None
    requires_approval: bool = False


class PortalRequestDetail(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    submitted_at: datetime
    completed_at: datetime | None = None
    inputs: dict[str, Any]
    timeline: list[PortalTimelineStage]
    approval: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    error_message: str | None = None


class PortalApprovalDecision(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    comment: str | None = Field(default=None, max_length=1000)


# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------


def _extract_contract(definition: dict[str, Any]) -> dict[str, Any]:
    """Safely extracts input contract or builds a fallback from trigger node."""
    contract = definition.get("input_contract", {})
    if contract and isinstance(contract, dict) and contract.get("fields"):
        return contract

    # Fallback: inspect trigger or input_data node
    nodes = definition.get("nodes", [])
    fields: list[dict[str, Any]] = []

    for node in nodes:
        if node.get("type") in ("trigger", "input_data"):
            config = node.get("config", {})
            schema = config.get("input_schema", {}).get("properties", {})
            required_keys = set(config.get("input_schema", {}).get("required", []))
            for key, meta in schema.items():
                fields.append(
                    {
                        "name": key,
                        "label": key.replace("_", " ").title(),
                        "type": "text",
                        "description": meta.get("description", f"Enter {key}"),
                        "required": key in required_keys,
                        "placeholder": f"e.g. {key}",
                    }
                )

    if not fields:
        # Standard customer support default fields
        fields = [
            {
                "name": "customer_name",
                "label": "Full Name",
                "type": "text",
                "required": True,
                "placeholder": "Jane Doe",
            },
            {
                "name": "customer_email",
                "label": "Email Address",
                "type": "email",
                "required": True,
                "placeholder": "jane@example.com",
            },
            {
                "name": "ticket_text",
                "label": "Request Details",
                "type": "multiline",
                "required": True,
                "placeholder": "Describe what you need help with...",
            },
        ]

    return {
        "fields": fields,
        "allow_natural_language": True,
        "system_instructions": "Extract customer support request details into structured fields.",
    }


# ---------------------------------------------------------
# Portal Endpoints
# ---------------------------------------------------------


@router.get(
    "/workflows",
    response_model=list[PortalWorkflowSummary],
    summary="List available workflows for client requests",
)
def list_portal_workflows(
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> list[PortalWorkflowSummary]:
    stmt = select(Workflow).where(Workflow.is_active == True)  # noqa: E712
    if tenant and tenant.org:
        stmt = stmt.where(
            (Workflow.organization_id == tenant.org.id) | (Workflow.organization_id.is_(None))
        )
    workflows = db.scalars(stmt).all()

    result: list[PortalWorkflowSummary] = []
    for wf in workflows:
        # Find latest published version
        v_stmt = (
            select(WorkflowVersion)
            .where(WorkflowVersion.workflow_id == wf.id)
            .order_by(desc(WorkflowVersion.version_number))
            .limit(1)
        )
        version = db.scalar(v_stmt)
        if not version:
            continue

        contract = _extract_contract(version.definition)
        result.append(
            PortalWorkflowSummary(
                id=wf.id,
                name=wf.name,
                description=wf.description,
                latest_version=version.version_number,
                input_contract=contract,
                allow_natural_language=contract.get("allow_natural_language", True),
                created_at=wf.created_at,
            )
        )

    return result


@router.get(
    "/workflows/{workflow_id}/form",
    response_model=PortalFormDefinition,
    summary="Get published form definition for workflow",
)
def get_portal_workflow_form(
    workflow_id: str,
    db: Session = Depends(get_db),
) -> PortalFormDefinition:
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    v_stmt = (
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == wf.id)
        .order_by(desc(WorkflowVersion.version_number))
        .limit(1)
    )
    version = db.scalar(v_stmt)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow has no published versions available.",
        )

    contract = _extract_contract(version.definition)
    return PortalFormDefinition(
        workflow_id=wf.id,
        workflow_name=wf.name,
        description=wf.description,
        version_number=version.version_number,
        input_contract=contract,
        allow_natural_language=contract.get("allow_natural_language", True),
        system_instructions=contract.get("system_instructions"),
    )


@router.post(
    "/workflows/{workflow_id}/requests",
    response_model=PortalSubmissionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a business request to start execution",
)
def submit_portal_request(
    workflow_id: str,
    payload: PortalSubmissionRequest,
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> PortalSubmissionResponse:
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    v_stmt = (
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == wf.id)
        .order_by(desc(WorkflowVersion.version_number))
        .limit(1)
    )
    version = db.scalar(v_stmt)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workflow has no published version to execute.",
        )

    contract = _extract_contract(version.definition)
    fields = contract.get("fields", [])

    # Validate required fields
    inputs = payload.inputs or {}
    missing_fields: list[str] = []
    for f in fields:
        field_name = f.get("name")
        is_required = f.get("required", False)
        val = inputs.get(field_name)
        if is_required and (val is None or str(val).strip() == ""):
            missing_fields.append(f.get("label") or field_name)

    if missing_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Please provide all required fields: {', '.join(missing_fields)}",
        )

    # Normalize inputs: ensure standard aliases are populated
    # e.g. ticket_text -> ticket_message, query, prompt
    if "ticket_text" in inputs and "ticket_message" not in inputs:
        inputs["ticket_message"] = inputs["ticket_text"]
    if "ticket_text" in inputs and "query" not in inputs:
        inputs["query"] = inputs["ticket_text"]

    # Create WorkflowRun
    org_id = tenant.org.id if tenant and tenant.org else wf.organization_id
    run = WorkflowRun(
        organization_id=org_id,
        workflow_id=wf.id,
        workflow_version_id=version.id,
        status=RunStatus.PENDING.value,
        input_payload=inputs,
    )
    db.add(run)
    db.flush()

    emit_event(
        db,
        run.id,
        "PORTAL_REQUEST_SUBMITTED",
        payload={
            "submitted_by": payload.submitted_by,
            "fields_provided": list(inputs.keys()),
        },
    )
    db.commit()

    # Enqueue execution via Celery
    execute_workflow_task.delay(run.id)

    return PortalSubmissionResponse(
        run_id=run.id,
        workflow_id=wf.id,
        status=run.status,
        message="Your request was received and is processing asynchronously.",
        tracking_url=f"/portal/requests/{run.id}",
        submitted_at=run.created_at or datetime.now(UTC),
    )


@router.post(
    "/workflows/{workflow_id}/parse-nl",
    response_model=NLParseResponse,
    summary="Extract structured form fields from natural language text",
)
def parse_natural_language_request(
    workflow_id: str,
    payload: NLParseRequest,
    db: Session = Depends(get_db),
) -> NLParseResponse:
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    v_stmt = (
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == wf.id)
        .order_by(desc(WorkflowVersion.version_number))
        .limit(1)
    )
    version = db.scalar(v_stmt)
    if not version:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No published version")

    contract = _extract_contract(version.definition)
    fields = contract.get("fields", [])

    # Construct schema definition for AI provider
    field_descriptions = []
    required_names = []
    for f in fields:
        fname = f.get("name")
        flabel = f.get("label", fname)
        ftype = f.get("type", "text")
        freq = f.get("required", False)
        if freq:
            required_names.append(fname)
        field_descriptions.append(
            f"- {fname} ({ftype}, {'required' if freq else 'optional'}): {flabel}"
        )

    system_prompt = (
        "You are an AI assistant for a business portal. Extract structured fields from the user's natural language request.\n"
        "Fields to extract:\n"
        + "\n".join(field_descriptions)
        + "\n\nReturn a valid JSON object with two top-level keys:\n"
        "1. 'extracted': dictionary mapping field names to extracted string/number/boolean values.\n"
        "2. 'missing_required_fields': list of field names that are required but could not be extracted.\n"
        "3. 'clarification_prompt': if required fields are missing, a polite 1-sentence prompt asking the user for the missing details, else null.\n"
        "Respond ONLY with valid JSON."
    )

    try:
        provider = get_ai_provider()
        response = provider.complete(
            prompt=f"User submission:\n{payload.prompt}",
            system_prompt=system_prompt,
            temperature=0.0,
        )
        # Parse JSON
        raw_text = response.content.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        parsed = json.loads(raw_text.strip())
        extracted = parsed.get("extracted", {})
        missing = parsed.get("missing_required_fields", [])
        clarification = parsed.get("clarification_prompt")
    except Exception:
        # Resilient heuristic fallback if AI provider is unavailable
        extracted = {}
        text = payload.prompt
        # Simple extraction heuristics
        import re

        # Extract order id e.g. ORD12345
        order_match = re.search(r"\b(ORD[0-9A-Za-z_-]+|[A-Z]{2,4}-\d+)\b", text, re.IGNORECASE)
        if order_match:
            extracted["order_id"] = order_match.group(1).upper()

        # Extract amount e.g. $89.99 or 89 dollars
        amount_match = re.search(r"\$?\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:dollars|usd)?", text)
        if amount_match and "amount" in [f.get("name") for f in fields]:
            try:
                extracted["amount"] = float(amount_match.group(1))
            except ValueError:
                pass

        # Extract email
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        if email_match:
            extracted["customer_email"] = email_match.group(0)

        # Set ticket_text / details to full prompt
        if "ticket_text" in [f.get("name") for f in fields]:
            extracted["ticket_text"] = text
        if "issue_description" in [f.get("name") for f in fields]:
            extracted["issue_description"] = text

        missing = [req for req in required_names if req not in extracted or not extracted[req]]
        clarification = (
            f"Please provide your {', '.join(missing)} so we can finalize this request."
            if missing
            else None
        )

    return NLParseResponse(
        extracted=extracted,
        missing_required_fields=missing,
        needs_clarification=len(missing) > 0,
        clarification_prompt=clarification,
    )


@router.get(
    "/requests",
    response_model=list[PortalRequestSummary],
    summary="List all client-submitted requests and status",
)
def list_portal_requests(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> list[PortalRequestSummary]:
    stmt = select(WorkflowRun).order_by(WorkflowRun.started_at.desc()).limit(limit).offset(offset)
    if tenant and tenant.org:
        stmt = stmt.where(WorkflowRun.organization_id == tenant.org.id)

    runs = db.scalars(stmt).all()
    results: list[PortalRequestSummary] = []

    for r in runs:
        wf = db.get(Workflow, r.workflow_id)
        wf_name = wf.name if wf else "Workflow Request"

        # Check pending approval
        has_pending = False
        if r.status == RunStatus.PAUSED.value:
            app_stmt = select(ApprovalRequest).where(
                ApprovalRequest.workflow_run_id == r.id,
                ApprovalRequest.status == ApprovalStatus.PENDING.value,
            )
            has_pending = db.scalar(app_stmt) is not None

        # Build preview summary
        summary = None
        if r.output_payload and isinstance(r.output_payload, dict):
            summary = (
                r.output_payload.get("resolution")
                or r.output_payload.get("summary")
                or r.output_payload.get("message")
            )
        elif r.input_payload and isinstance(r.input_payload, dict):
            summary = (
                r.input_payload.get("ticket_text")
                or r.input_payload.get("issue_description")
                or r.input_payload.get("customer_name")
            )

        results.append(
            PortalRequestSummary(
                id=r.id,
                workflow_id=r.workflow_id,
                workflow_name=wf_name,
                status=r.status,
                submitted_at=r.started_at or r.created_at or datetime.now(UTC),
                completed_at=r.completed_at,
                summary_preview=summary[:140] if summary else None,
                requires_approval=has_pending,
            )
        )

    return results


@router.get(
    "/requests/{run_id}",
    response_model=PortalRequestDetail,
    summary="Get detailed client tracking view for a request",
)
def get_portal_request_detail(
    run_id: str,
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> PortalRequestDetail:
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if tenant and tenant.org and run.organization_id and run.organization_id != tenant.org.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Request belongs to another organization.",
        )

    wf = db.get(Workflow, run.workflow_id)
    wf_name = wf.name if wf else "Workflow Request"

    # Step runs
    stmt = (
        select(StepRun)
        .where(StepRun.workflow_run_id == run.id)
        .order_by(StepRun.attempt_count.asc())
    )
    steps = db.scalars(stmt).all()

    # Approvals
    app_stmt = (
        select(ApprovalRequest)
        .where(ApprovalRequest.workflow_run_id == run.id)
        .order_by(ApprovalRequest.created_at.desc())
        .limit(1)
    )
    app_req = db.scalar(app_stmt)
    approval_data = None
    if app_req:
        approval_data = {
            "id": app_req.id,
            "title": app_req.title,
            "description": app_req.description,
            "required_role": app_req.required_role,
            "status": app_req.status,
            "decision_comment": app_req.decision_comment,
            "decided_by": app_req.decided_by,
            "decided_at": app_req.decided_at,
            "created_at": app_req.created_at,
        }

    # Construct clean high-level stages for business users
    # Stage 1: Submitted
    stages = [
        PortalTimelineStage(
            stage_id="submitted",
            name="Request Submitted",
            status="completed",
            timestamp=run.started_at,
            detail="Request received and validated against input contract",
        )
    ]

    # Stage 2: AI Processing & Retrieval
    ai_steps = [
        s for s in steps if s.node_type in ("ai_classify", "structured_extract", "retrieval")
    ]
    if ai_steps:
        all_succeeded = all(s.status == StepStatus.SUCCEEDED.value for s in ai_steps)
        any_running = any(s.status == StepStatus.RUNNING.value for s in ai_steps)
        any_failed = any(s.status == StepStatus.FAILED.value for s in ai_steps)
        st = (
            "completed"
            if all_succeeded
            else "failed"
            if any_failed
            else "in_progress"
            if any_running
            else "pending"
        )
        stages.append(
            PortalTimelineStage(
                stage_id="ai_processing",
                name="AI Classification & Policy Retrieval",
                status=st,
                timestamp=ai_steps[-1].completed_at or ai_steps[0].started_at,
                detail=f"Executed {len(ai_steps)} AI inference & semantic knowledge checks",
            )
        )

    # Stage 3: Human Review Gate (if present)
    if app_req:
        app_status = (
            "completed"
            if app_req.status in ("APPROVED", "REJECTED")
            else "in_progress"
            if app_req.status == "PENDING"
            else "pending"
        )
        stages.append(
            PortalTimelineStage(
                stage_id="approval_gate",
                name=f"Manager Approval Gate ({app_req.required_role.title()})",
                status=app_status,
                timestamp=app_req.decided_at or app_req.created_at,
                detail=f"Decision: {app_req.status}. {app_req.decision_comment or ''}".strip(),
            )
        )

    # Stage 4: Resolution / Output
    final_status = (
        "completed"
        if run.status == RunStatus.SUCCEEDED.value
        else "failed"
        if run.status == RunStatus.FAILED.value
        else "pending"
    )
    stages.append(
        PortalTimelineStage(
            stage_id="final_resolution",
            name="Resolution & Fulfillment",
            status=final_status,
            timestamp=run.completed_at,
            detail="Final response generated and recorded in audit log"
            if final_status == "completed"
            else None,
        )
    )

    return PortalRequestDetail(
        id=run.id,
        workflow_id=run.workflow_id,
        workflow_name=wf_name,
        status=run.status,
        submitted_at=run.started_at or run.created_at or datetime.now(UTC),
        completed_at=run.completed_at,
        inputs=run.input_payload or {},
        timeline=stages,
        approval=approval_data,
        output=run.output_payload,
        error_message=run.error_message,
    )


@router.get(
    "/approvals/pending",
    summary="List pending approvals for business approvers",
)
def list_portal_pending_approvals(
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> list[dict[str, Any]]:
    stmt = (
        select(ApprovalRequest)
        .where(ApprovalRequest.status == ApprovalStatus.PENDING.value)
        .order_by(ApprovalRequest.created_at.desc())
    )
    if tenant and tenant.org:
        stmt = stmt.where(ApprovalRequest.organization_id == tenant.org.id)

    approvals = db.scalars(stmt).all()
    results: list[dict[str, Any]] = []

    for a in approvals:
        run = db.get(WorkflowRun, a.workflow_run_id)
        wf = db.get(Workflow, run.workflow_id) if run else None

        # Fetch step run output context if available
        step = db.get(StepRun, a.step_run_id) if a.step_run_id else None

        results.append(
            {
                "id": a.id,
                "workflow_run_id": a.workflow_run_id,
                "workflow_name": wf.name if wf else "Workflow",
                "title": a.title,
                "description": a.description,
                "required_role": a.required_role,
                "status": a.status,
                "created_at": a.created_at,
                "customer_input": run.input_payload if run else {},
                "ai_context": step.input_data if step else {},
            }
        )

    return results


@router.post(
    "/approvals/{approval_id}/decision",
    summary="Submit client approval decision (APPROVE / REJECT)",
)
def decide_portal_approval(
    approval_id: str,
    payload: PortalApprovalDecision,
    db: Session = Depends(get_db),
    tenant: TenantContext | None = Depends(get_optional_tenant_context),
) -> dict[str, Any]:
    approval = db.get(ApprovalRequest, approval_id)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Approval request not found"
        )

    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Approval request is already finalized as '{approval.status}'",
        )

    # 1. Tenant boundary enforcement
    if (
        tenant
        and tenant.org
        and approval.organization_id
        and approval.organization_id != tenant.org.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot decide approvals belonging to another organization.",
        )

    # 2. Strict Role requirement check
    req_role = (approval.required_role or "manager").lower()
    if tenant and tenant.user:
        user_role = (tenant.user.role or "").lower()
        member_role = (tenant.role or "").lower()
        if user_role != req_role and member_role != req_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This approval gate strictly requires role '{req_role.capitalize()}'. Your authenticated role is '{user_role.capitalize()}'.",
            )
        decided_by = tenant.user.email
    else:
        decided_by = "Portal Reviewer"

    step = db.get(StepRun, approval.step_run_id)
    run = db.get(WorkflowRun, approval.workflow_run_id)

    now = datetime.now(UTC)
    approval.status = payload.decision
    approval.decision_comment = payload.comment
    approval.decided_by = decided_by
    approval.decided_at = now

    if payload.decision == "APPROVED":
        if step:
            validate_step_transition(StepStatus.PAUSED, StepStatus.SUCCEEDED)
            step.status = StepStatus.SUCCEEDED.value
            step.completed_at = now
            step.output_data = {
                "decision": "APPROVED",
                "comment": payload.comment,
                "decided_by": decided_by,
                "decided_at": now.isoformat(),
            }

        if run:
            validate_run_transition(RunStatus.PAUSED, RunStatus.RUNNING)
            run.status = RunStatus.RUNNING.value

        emit_event(
            db,
            approval.workflow_run_id,
            "PORTAL_APPROVAL_GRANTED",
            step_run_id=approval.step_run_id,
            payload={"decided_by": decided_by, "comment": payload.comment},
        )
        db.commit()

        # Resume Celery execution
        execute_workflow_task.delay(approval.workflow_run_id)

    else:
        # Rejected
        if step:
            validate_step_transition(StepStatus.PAUSED, StepStatus.FAILED)
            step.status = StepStatus.FAILED.value
            step.completed_at = now
            step.error_details = {
                "category": "APPROVAL_REJECTED",
                "error": payload.comment or "Rejected by portal reviewer",
            }

        if run:
            validate_run_transition(RunStatus.PAUSED, RunStatus.FAILED)
            run.status = RunStatus.FAILED.value
            run.completed_at = now
            run.error_message = (
                f"Rejected by portal reviewer: {payload.comment}"
                if payload.comment
                else "Rejected by reviewer"
            )

        emit_event(
            db,
            approval.workflow_run_id,
            "PORTAL_APPROVAL_REJECTED",
            step_run_id=approval.step_run_id,
            payload={"decided_by": decided_by, "comment": payload.comment},
        )
        db.commit()

    return {
        "id": approval.id,
        "workflow_run_id": approval.workflow_run_id,
        "status": approval.status,
        "decision_comment": approval.decision_comment,
        "decided_at": approval.decided_at,
        "message": f"Approval request {payload.decision.lower()} successfully.",
    }
