from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.execution import ExecutionEvent, StepRun, WorkflowRun
from app.models.workflow import Workflow, WorkflowVersion
from app.workflows.executor import execute_workflow_run
from app.workflows.state_machine import RunStatus, StepStatus


def test_password_hashing_and_verification():
    raw = "SuperSecretPassword123!"
    hashed = hash_password(raw)

    assert hashed != raw
    assert "$" in hashed
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password(raw, "") is False


def test_auth_registration_and_login_flow(client: TestClient):
    # 1. Register user
    email = "test.engineer@flowforge.ai"
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Test Engineer",
            "role": "reviewer",
        },
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == email
    assert user_data["role"] == "reviewer"

    # 2. Duplicate registration rejected
    dup_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!"},
    )
    assert dup_resp.status_code == 409

    # 3. Login with credentials
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 4. Access protected profile
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # 5. Unauthorized access rejected
    unauth_resp = client.get("/api/v1/auth/me")
    assert unauth_resp.status_code == 401


def test_human_approval_pause_and_approve_resumption(
    db_session: Session, client: TestClient, monkeypatch
):
    """Verifies that an execution cleanly pauses at an approval gate, creates an approval request,
    and resumes to completion once approved."""
    # Prevent celery task from dispatching to redis during unit test
    monkeypatch.setattr(
        "app.api.v1.approvals.execute_workflow_task.delay", lambda *args, **kwargs: None
    )

    definition = {
        "version": "1.0",
        "nodes": [
            {"id": "node_trigger", "type": "trigger", "config": {}},
            {
                "id": "node_gate",
                "type": "human_approval",
                "config": {
                    "title": "Refund Approval Required",
                    "description_template": "Approve refund of {run_input.amount} for {run_input.customer}",
                    "required_role": "reviewer",
                },
            },
            {
                "id": "node_final",
                "type": "output",
                "config": {
                    "response_template": {
                        "approved_by": "{node_gate.decided_by}",
                        "comment": "{node_gate.comment}",
                        "status": "settled",
                    }
                },
            },
        ],
        "edges": [
            {"id": "e1", "source_node_id": "node_trigger", "target_node_id": "node_gate"},
            {"id": "e2", "source_node_id": "node_gate", "target_node_id": "node_final"},
        ],
    }

    workflow = Workflow(
        name="Refund Approval Pipeline",
        draft_definition=definition,
    )
    db_session.add(workflow)
    db_session.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=1,
        definition=definition,
        checksum="checksum-approval-test",
    )
    db_session.add(version)
    db_session.flush()

    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=version.id,
        input_payload={"amount": "$450.00", "customer": "cust_8821"},
    )
    db_session.add(run)
    db_session.commit()

    # Pass 1: Run encounters approval node and PAUSES
    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    assert run.status == RunStatus.PAUSED.value

    # Check step run is PAUSED
    gate_step = db_session.scalar(
        select(StepRun).where(StepRun.workflow_run_id == run.id, StepRun.node_id == "node_gate")
    )
    assert gate_step.status == StepStatus.PAUSED.value

    # Check ApprovalRequest was created
    approval = db_session.scalar(
        select(ApprovalRequest).where(ApprovalRequest.workflow_run_id == run.id)
    )
    assert approval is not None
    assert approval.status == ApprovalStatus.PENDING.value
    assert "Approve refund of $450.00 for cust_8821" in approval.description

    # Verify audit events
    events = db_session.scalars(
        select(ExecutionEvent).where(ExecutionEvent.workflow_run_id == run.id)
    ).all()
    event_types = [e.event_type for e in events]
    assert "APPROVAL_REQUESTED" in event_types
    assert "RUN_PAUSED" in event_types

    # Pass 2: Inspect via API and submit approval decision
    pending_resp = client.get("/api/v1/approvals/pending")
    assert pending_resp.status_code == 200
    pending_list = pending_resp.json()
    assert any(a["id"] == approval.id for a in pending_list)

    # Submit APPROVE decision
    decide_resp = client.post(
        f"/api/v1/approvals/{approval.id}/decision",
        json={
            "decision": "APPROVED",
            "comment": "Verified transaction eligibility with accounting.",
        },
    )
    assert decide_resp.status_code == 200
    assert decide_resp.json()["status"] == "APPROVED"

    # Pass 3: Re-execute run (or Celery resumed task)
    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    assert run.status == RunStatus.SUCCEEDED.value
    assert run.output_payload is not None
    assert run.output_payload["result"]["status"] == "settled"
    assert "Verified transaction" in run.output_payload["result"]["comment"]


def test_human_approval_rejection_halts_run(db_session: Session, client: TestClient):
    """Verifies that rejecting an approval request fails the step and workflow run with an audit trail."""

    definition = {
        "version": "1.0",
        "nodes": [
            {"id": "node_trigger", "type": "trigger", "config": {}},
            {
                "id": "node_gate",
                "type": "human_approval",
                "config": {"title": "High Risk Access Request"},
            },
            {"id": "node_final", "type": "output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "node_trigger", "target_node_id": "node_gate"},
            {"id": "e2", "source_node_id": "node_gate", "target_node_id": "node_final"},
        ],
    }

    workflow = Workflow(name="High Risk Workflow", draft_definition=definition)
    db_session.add(workflow)
    db_session.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=1,
        definition=definition,
        checksum="checksum-reject-test",
    )
    db_session.add(version)
    db_session.flush()

    run = WorkflowRun(workflow_id=workflow.id, workflow_version_id=version.id, input_payload={})
    db_session.add(run)
    db_session.commit()

    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    assert run.status == RunStatus.PAUSED.value

    approval = db_session.scalar(
        select(ApprovalRequest).where(ApprovalRequest.workflow_run_id == run.id)
    )
    assert approval is not None

    # Reject approval
    resp = client.post(
        f"/api/v1/approvals/{approval.id}/decision",
        json={"decision": "REJECTED", "comment": "Unauthorized request parameters detected."},
    )
    assert resp.status_code == 200

    db_session.refresh(run)
    assert run.status == RunStatus.FAILED.value
    assert "Unauthorized request" in (run.error_message or "")
