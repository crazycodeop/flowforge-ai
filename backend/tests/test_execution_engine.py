from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.workers.tasks import execute_workflow_task
from app.workflows.executor import execute_workflow_run
from app.workflows.state_machine import RunStatus, StepStatus


def test_linear_workflow_execution(client: TestClient, db_session: Session):
    # 1. Create a workflow draft
    create_payload = {
        "name": "Linear Data Pipeline",
        "description": "Trigger -> Transform -> Output",
    }
    res = client.post("/api/v1/workflows/", json=create_payload)
    assert res.status_code == 201
    workflow_id = res.json()["id"]

    # 2. Define valid linear graph
    linear_def = {
        "schema_version": "1.0.0",
        "name": "Linear Data Pipeline",
        "nodes": [
            {
                "id": "trig-1",
                "type": "trigger",
                "name": "Webhook Ingest",
                "config": {"trigger_type": "api"},
            },
            {
                "id": "trans-1",
                "type": "transform",
                "name": "Format Payload",
                "config": {
                    "mapping_rules": {
                        "user_id": "customer_id",
                        "summary": "Ticket issue: {ticket.issue}",
                    }
                },
            },
            {
                "id": "out-1",
                "type": "output",
                "name": "Result Output",
                "config": {
                    "response_template": {
                        "status": "success",
                        "formatted_summary": "trans-1.transformed.summary",
                        "uid": "trans-1.transformed.user_id",
                    }
                },
            },
        ],
        "edges": [
            {"id": "e1", "source_node_id": "trig-1", "target_node_id": "trans-1"},
            {"id": "e2", "source_node_id": "trans-1", "target_node_id": "out-1"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": linear_def})

    # 3. Publish Version 1
    res = client.post(f"/api/v1/workflows/{workflow_id}/publish")
    assert res.status_code == 201
    assert res.json()["version_number"] == 1

    # 4. Trigger workflow run via API
    run_input = {
        "customer_id": "cust-987",
        "ticket": {"issue": "Account lockout due to multiple invalid login attempts"},
    }
    res = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={"input_payload": run_input},
    )
    assert res.status_code == 202
    run_data = res.json()
    run_id = run_data["id"]
    assert run_data["status"] == RunStatus.QUEUED.value

    # 5. Execute run synchronously through engine
    completed_run = execute_workflow_run(run_id, db_session)
    assert completed_run.status == RunStatus.SUCCEEDED.value
    assert completed_run.completed_at is not None
    assert completed_run.output_payload is not None
    assert completed_run.output_payload["result"]["status"] == "success"
    assert (
        completed_run.output_payload["result"]["formatted_summary"]
        == "Ticket issue: Account lockout due to multiple invalid login attempts"
    )
    assert completed_run.output_payload["result"]["uid"] == "cust-987"

    # 6. Verify Step-level persistence in PostgreSQL
    steps_res = client.get(f"/api/v1/runs/{run_id}/steps")
    assert steps_res.status_code == 200
    steps = steps_res.json()
    assert len(steps) == 3
    assert all(s["status"] == StepStatus.SUCCEEDED.value for s in steps)
    assert all(s["attempt_count"] == 1 for s in steps)

    # 7. Verify chronological ExecutionEvent audit trail
    events_res = client.get(f"/api/v1/runs/{run_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()
    event_types = [e["event_type"] for e in events]
    assert "RUN_CREATED" in event_types
    assert "RUN_QUEUED" in event_types
    assert "RUN_STARTED" in event_types
    assert "STEP_STARTED" in event_types
    assert "STEP_SUCCEEDED" in event_types
    assert "RUN_COMPLETED" in event_types


def test_conditional_branching_and_skip_cascade(client: TestClient, db_session: Session):
    # Create workflow with conditional branch
    res = client.post("/api/v1/workflows/", json={"name": "Conditional Routing Flow"})
    workflow_id = res.json()["id"]

    branching_def = {
        "schema_version": "1.0.0",
        "name": "Conditional Routing Flow",
        "nodes": [
            {
                "id": "start",
                "type": "trigger",
                "name": "Trigger",
                "config": {"trigger_type": "api"},
            },
            {
                "id": "check-urgency",
                "type": "condition",
                "name": "Urgency Gate",
                "config": {
                    "branches": [
                        {
                            "branch_name": "high_priority",
                            "operator": "equals",
                            "field_path": "urgency",
                            "value": "high",
                        }
                    ],
                    "default_branch": "normal_priority",
                },
            },
            {
                "id": "fast-track",
                "type": "transform",
                "name": "Fast Track Handler",
                "config": {"mapping_rules": {"queue": "urgent_queue"}},
            },
            {
                "id": "standard-track",
                "type": "transform",
                "name": "Standard Handler",
                "config": {"mapping_rules": {"queue": "standard_queue"}},
            },
            {
                "id": "out",
                "type": "output",
                "name": "Output",
                "config": {},
            },
        ],
        "edges": [
            {"id": "e1", "source_node_id": "start", "target_node_id": "check-urgency"},
            {
                "id": "e2",
                "source_node_id": "check-urgency",
                "target_node_id": "fast-track",
                "source_handle": "high_priority",
            },
            {
                "id": "e3",
                "source_node_id": "check-urgency",
                "target_node_id": "standard-track",
                "source_handle": "normal_priority",
            },
            {"id": "e4", "source_node_id": "fast-track", "target_node_id": "out"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": branching_def})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    # Run with urgency='high' -> fast-track executes, standard-track is SKIPPED
    res = client.post(
        f"/api/v1/workflows/{workflow_id}/runs",
        json={"input_payload": {"urgency": "high"}},
    )
    assert res.status_code == 202
    run_id = res.json()["id"]

    run = execute_workflow_run(run_id, db_session)
    assert run.status == RunStatus.SUCCEEDED.value

    # Check steps
    steps = client.get(f"/api/v1/runs/{run_id}/steps").json()
    step_status_by_node = {s["node_id"]: s["status"] for s in steps}

    assert step_status_by_node["start"] == StepStatus.SUCCEEDED.value
    assert step_status_by_node["check-urgency"] == StepStatus.SUCCEEDED.value
    assert step_status_by_node["fast-track"] == StepStatus.SUCCEEDED.value
    assert step_status_by_node["standard-track"] == StepStatus.SKIPPED.value
    assert step_status_by_node["out"] == StepStatus.SUCCEEDED.value


def test_failure_containment(client: TestClient, db_session: Session):
    # Workflow where a node fails
    res = client.post("/api/v1/workflows/", json={"name": "Failing Workflow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Failing Workflow",
        "nodes": [
            {"id": "start", "type": "trigger", "name": "Start", "config": {"trigger_type": "api"}},
            {
                "id": "bad-transform",
                "type": "transform",
                "name": "Invalid Logic",
                "config": {"mapping_rules": {"broken": "{non.existent.path}"}},
            },
            {"id": "terminal", "type": "output", "name": "Never Reached", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "start", "target_node_id": "bad-transform"},
            {"id": "e2", "source_node_id": "bad-transform", "target_node_id": "terminal"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {}})
    run_id = res.json()["id"]

    # Deliberately inject exception in bad-transform
    # In our engine, if a node raises an unhandled exception:
    from unittest.mock import patch

    with patch(
        "app.nodes.executors.TransformExecutor.execute",
        side_effect=RuntimeError("Data mapping crashed"),
    ):
        run = execute_workflow_run(run_id, db_session)
        assert run.status == RunStatus.FAILED.value
        assert "failed" in run.error_message.lower()

    # Verify steps: start succeeded, bad-transform failed, terminal remained PENDING
    steps = client.get(f"/api/v1/runs/{run_id}/steps").json()
    status_map = {s["node_id"]: s for s in steps}
    assert status_map["start"]["status"] == StepStatus.SUCCEEDED.value
    assert status_map["bad-transform"]["status"] == StepStatus.FAILED.value
    assert "Data mapping crashed" in status_map["bad-transform"]["error_details"]["error"]
    assert status_map["terminal"]["status"] == StepStatus.PENDING.value


def test_run_cancellation(client: TestClient, db_session: Session):
    res = client.post("/api/v1/workflows/", json={"name": "Cancellable Workflow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Cancellable",
        "nodes": [
            {"id": "start", "type": "trigger", "name": "Start", "config": {"trigger_type": "api"}},
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [{"id": "e1", "source_node_id": "start", "target_node_id": "out"}],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {}})
    run_id = res.json()["id"]

    # Cancel the run via API
    cancel_res = client.post(f"/api/v1/runs/{run_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == RunStatus.CANCELLED.value

    # Verify subsequent engine execution skips cancelled run
    run = execute_workflow_run(run_id, db_session)
    assert run.status == RunStatus.CANCELLED.value


def test_celery_task_integration(client: TestClient, db_session: Session, monkeypatch):
    # Ensure celery task executes within the test database session
    monkeypatch.setattr("app.workers.tasks.SessionLocal", lambda: db_session)

    # Test Celery background task apply
    res = client.post("/api/v1/workflows/", json={"name": "Celery Task Flow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Celery Flow",
        "nodes": [
            {"id": "start", "type": "trigger", "name": "Start", "config": {"trigger_type": "api"}},
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [{"id": "e1", "source_node_id": "start", "target_node_id": "out"}],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {}})
    run_id = res.json()["id"]

    task_res = execute_workflow_task.apply(args=[run_id])
    assert task_res.successful()
    result = task_res.result
    assert result["run_id"] == run_id
    assert result["status"] == RunStatus.SUCCEEDED.value
