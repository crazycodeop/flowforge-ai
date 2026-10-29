import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import StepRun
from app.workflows.executor import execute_workflow_run
from app.workflows.flagship import COLLECTION_NAME
from app.workflows.state_machine import RunStatus, StepStatus


def test_full_platform_system_e2e_journey(db_session: Session, client: TestClient, monkeypatch):
    """End-to-End System Test covering all platform components:

    1. User Registration & JWT Authentication
    2. Knowledge Base Seeding & Semantic Retrieval
    3. Flagship Support Triage Workflow Execution (AI Classification, Retrieval, Extraction, Synthesis)
    4. Human-in-the-Loop Governance Workflow (Execution Pause, Pending Review Queue, Approval Decision & Resumption)
    5. AI Evaluation Benchmarking (Automated evaluation suite, accuracy assertions, cost & latency tracking)
    6. Audit Event Timeline & Execution Observability
    """
    # Prevent background redis dispatch in synchronous unit test environment
    monkeypatch.setattr(
        "app.api.v1.approvals.execute_workflow_task.delay", lambda *args, **kwargs: None
    )
    monkeypatch.setattr("app.api.v1.runs.execute_workflow_task.delay", lambda *args, **kwargs: None)

    # ---------------------------------------------------------
    # 1. User Registration & Authentication
    # ---------------------------------------------------------
    auth_email = f"lead.architect.{uuid.uuid4().hex[:6]}@flowforge.ai"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": auth_email,
            "password": "SecurePassword987!",
            "full_name": "Lead System Architect",
            "role": "admin",
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": auth_email, "password": "SecurePassword987!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id

    # ---------------------------------------------------------
    # 2. Knowledge Base Seeding & Retrieval Verification
    # ---------------------------------------------------------
    seed_kb_res = client.post("/api/v1/knowledge/seed", headers=auth_headers)
    assert seed_kb_res.status_code == 200

    colls_res = client.get("/api/v1/knowledge/collections", headers=auth_headers)
    assert colls_res.status_code == 200
    collections = colls_res.json()
    assert any(c["name"] == COLLECTION_NAME for c in collections)

    search_res = client.post(
        "/api/v1/knowledge/search",
        headers=auth_headers,
        json={
            "collection_name": COLLECTION_NAME,
            "query": "refund policy for subscription",
            "top_k": 2,
        },
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["count"] > 0
    assert any("Refund" in s["title"] for s in search_data["sources"])

    # ---------------------------------------------------------
    # 3. Flagship Support Triage Workflow Execution
    # ---------------------------------------------------------
    seed_wf_res = client.post("/api/v1/workflows/seed-flagship", headers=auth_headers)
    assert seed_wf_res.status_code == 200
    flagship_data = seed_wf_res.json()
    flagship_id = flagship_data["id"]
    version_number = flagship_data["latest_version"]
    assert version_number == 1

    ticket_payload = {
        "ticket_text": "I was billed twice on my credit card for $89.99 on invoice INV-2026. Please refund the duplicate transaction.",
        "customer_email": "jane.doe@enterprise.com",
    }

    run_res = client.post(
        f"/api/v1/workflows/{flagship_id}/runs",
        headers=auth_headers,
        json={"input_payload": ticket_payload},
    )
    assert run_res.status_code == 202
    flagship_run_id = run_res.json()["id"]

    completed_run = execute_workflow_run(flagship_run_id, db_session)
    assert completed_run.status == RunStatus.SUCCEEDED
    assert completed_run.output_payload is not None
    out = completed_run.output_payload.get("result", completed_run.output_payload)
    assert out.get("status") == "triaged"
    assert out.get("category") == "billing"
    assert completed_run.total_tokens > 0
    assert completed_run.total_cost_usd >= 0.0

    # Verify execution audit events
    events_res = client.get(f"/api/v1/runs/{flagship_run_id}/events", headers=auth_headers)
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["event_type"] for e in events]
    assert "RUN_STARTED" in event_types
    assert "RUN_COMPLETED" in event_types

    # ---------------------------------------------------------
    # 4. Human-in-the-Loop Governance Workflow
    # ---------------------------------------------------------
    approval_wf_create = client.post(
        "/api/v1/workflows/",
        headers=auth_headers,
        json={
            "name": "High-Value Refund Approval Gate",
            "description": "Requires explicit managerial sign-off before issuing large refunds.",
            "definition": {
                "schema_version": "1.0.0",
                "name": "High-Value Refund Approval Gate",
                "nodes": [
                    {"id": "node_in", "name": "Trigger Request", "type": "trigger", "config": {}},
                    {
                        "id": "node_gate",
                        "name": "Refund Approval Gate",
                        "type": "human_approval",
                        "config": {
                            "title": "Refund Sign-off",
                            "description_template": "Approve refund of {run_input.amount} for {run_input.customer}",
                            "required_role": "admin",
                        },
                    },
                    {
                        "id": "node_out",
                        "name": "Resolution Output",
                        "type": "output",
                        "config": {
                            "response_template": {
                                "approved_by": "{node_gate.decided_by}",
                                "comment": "{node_gate.comment}",
                                "status": "processed",
                            }
                        },
                    },
                ],
                "edges": [
                    {"id": "e1", "source_node_id": "node_in", "target_node_id": "node_gate"},
                    {"id": "e2", "source_node_id": "node_gate", "target_node_id": "node_out"},
                ],
            },
        },
    )
    assert approval_wf_create.status_code == 201
    appr_wf_id = approval_wf_create.json()["id"]

    pub_res = client.post(
        f"/api/v1/workflows/{appr_wf_id}/publish",
        headers=auth_headers,
        json={"changelog": "Initial release of high-value refund gate."},
    )
    assert pub_res.status_code == 201

    appr_run_req = client.post(
        f"/api/v1/workflows/{appr_wf_id}/runs",
        headers=auth_headers,
        json={"input_payload": {"amount": "$1,500.00", "customer": "Acme Corp"}},
    )
    assert appr_run_req.status_code == 202
    appr_run_id = appr_run_req.json()["id"]

    # Execute workflow run until approval gate
    run_paused = execute_workflow_run(appr_run_id, db_session)
    assert run_paused.status == RunStatus.PAUSED

    # Step run is PAUSED
    paused_step = db_session.scalar(
        select(StepRun).where(
            StepRun.workflow_run_id == appr_run_id,
            StepRun.node_id == "node_gate",
        )
    )
    assert paused_step is not None
    assert paused_step.status == StepStatus.PAUSED

    # Inspect pending approvals queue
    pending_res = client.get("/api/v1/approvals/pending", headers=auth_headers)
    assert pending_res.status_code == 200
    pending_items = pending_res.json()
    matching_approval = next(
        (a for a in pending_items if a["workflow_run_id"] == appr_run_id), None
    )
    assert matching_approval is not None
    assert matching_approval["status"] == "PENDING"
    assert "$1,500.00" in matching_approval["description"]

    # Submit decision
    decision_res = client.post(
        f"/api/v1/approvals/{matching_approval['id']}/decision",
        headers=auth_headers,
        json={
            "decision": "APPROVED",
            "comment": "Authorized by security compliance officer.",
            "decided_by": auth_email,
        },
    )
    assert decision_res.status_code == 200

    # Resume execution
    resumed_run = execute_workflow_run(appr_run_id, db_session)
    assert resumed_run.status == RunStatus.SUCCEEDED
    res_out = resumed_run.output_payload.get("result", resumed_run.output_payload)
    assert res_out.get("status") == "processed"
    assert res_out.get("approved_by") == auth_email

    # ---------------------------------------------------------
    # 5. AI Evaluation Benchmark
    # ---------------------------------------------------------
    seed_eval_res = client.post("/api/v1/evaluations/seed", headers=auth_headers)
    assert seed_eval_res.status_code == 200
    dataset_id = seed_eval_res.json()["dataset_id"]

    eval_run_res = client.post(
        "/api/v1/evaluations/runs",
        headers=auth_headers,
        json={
            "dataset_id": dataset_id,
            "workflow_id": flagship_id,
            "version_number": version_number,
        },
    )
    assert eval_run_res.status_code == 201
    eval_data = eval_run_res.json()
    assert eval_data["status"] == "COMPLETED"
    assert eval_data["accuracy_score"] >= 0.8
    assert eval_data["summary_metrics"]["total_cases"] == 5
    assert eval_data["avg_latency_ms"] > 0
    assert len(eval_data["results"]) == 5
