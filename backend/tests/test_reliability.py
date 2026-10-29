from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.execution import StepRun, WorkflowRun
from app.workflows.errors import (
    ErrorCategory,
    PermanentValidationError,
    TransientNetworkError,
    calculate_backoff_delay,
    classify_exception,
)
from app.workflows.executor import execute_workflow_run
from app.workflows.recovery import recover_stale_runs
from app.workflows.state_machine import RunStatus, StepStatus


def test_error_classification_and_backoff():
    # Transient error classification
    cat, retryable, msg = classify_exception(TransientNetworkError("Connection timed out"))
    assert cat == ErrorCategory.TRANSIENT_NETWORK
    assert retryable is True

    # Rate limit classification
    cat, retryable, msg = classify_exception(
        RuntimeError("429 Too Many Requests: Rate limit exceeded")
    )
    assert cat == ErrorCategory.RATE_LIMIT
    assert retryable is True

    # Permanent validation error
    cat, retryable, msg = classify_exception(PermanentValidationError("Invalid schema"))
    assert cat == ErrorCategory.PERMANENT_VALIDATION
    assert retryable is False

    # Backoff calculation grows exponentially
    delay_1 = calculate_backoff_delay(attempt=1, base_seconds=2.0, factor=2.0, jitter=False)
    delay_2 = calculate_backoff_delay(attempt=2, base_seconds=2.0, factor=2.0, jitter=False)
    delay_3 = calculate_backoff_delay(attempt=3, base_seconds=2.0, factor=2.0, jitter=False)
    assert delay_1 == 2.0
    assert delay_2 == 4.0
    assert delay_3 == 8.0

    # Max backoff clamp
    delay_capped = calculate_backoff_delay(
        attempt=10, base_seconds=2.0, max_backoff_seconds=10.0, jitter=False
    )
    assert delay_capped == 10.0


def test_bounded_retries_for_transient_failures(
    client: TestClient, db_session: Session, monkeypatch
):
    # Prevent concurrent background Celery worker from racing synchronous step verification
    monkeypatch.setattr("app.api.v1.runs.execute_workflow_task.delay", lambda *args, **kwargs: None)

    # Workflow with max_retries=2
    res = client.post("/api/v1/workflows/", json={"name": "Retry Test Workflow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Retry Flow",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {
                "id": "flaky-step",
                "type": "transform",
                "name": "Flaky Transform",
                "config": {"mapping_rules": {"data": "input"}},
                "retry_policy": {
                    "max_retries": 2,
                    "backoff_base_seconds": 0.1,
                    "backoff_factor": 1.5,
                },
            },
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "trig", "target_node_id": "flaky-step"},
            {"id": "e2", "source_node_id": "flaky-step", "target_node_id": "out"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {"input": "test"}}
    )
    run_id = res.json()["id"]

    # First attempt: throws TransientNetworkError -> step moves to RETRY_WAIT
    with patch(
        "app.nodes.executors.TransformExecutor.execute",
        side_effect=TransientNetworkError("Gateway timeout"),
    ):
        execute_workflow_run(run_id, db_session)

    step = db_session.query(StepRun).filter_by(workflow_run_id=run_id, node_id="flaky-step").one()
    assert step.status == StepStatus.RETRY_WAIT.value
    assert step.attempt_count == 1
    assert step.error_details["category"] == ErrorCategory.TRANSIENT_NETWORK.value

    # Verify event logged
    events = client.get(f"/api/v1/runs/{run_id}/events").json()
    retry_events = [e for e in events if e["event_type"] == "STEP_RETRY_SCHEDULED"]
    assert len(retry_events) == 1

    # Simulate backoff delay elapsed so step is ready for next execution round
    step.lease_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.commit()

    # Second attempt: succeeding -> step moves to SUCCEEDED and workflow finishes
    completed_run = execute_workflow_run(run_id, db_session)
    assert completed_run.status == RunStatus.SUCCEEDED.value

    db_session.refresh(step)
    assert step.status == StepStatus.SUCCEEDED.value
    assert step.attempt_count == 2


def test_non_retryable_error_fails_immediately(client: TestClient, db_session: Session):
    res = client.post("/api/v1/workflows/", json={"name": "Non-retryable Test"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Permanent Failure Flow",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {
                "id": "failing-step",
                "type": "transform",
                "name": "Invalid Schema Step",
                "config": {"mapping_rules": {"data": "input"}},
                "retry_policy": {"max_retries": 5},
            },
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "trig", "target_node_id": "failing-step"},
            {"id": "e2", "source_node_id": "failing-step", "target_node_id": "out"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {}})
    run_id = res.json()["id"]

    # Permanent error must fail immediately without entering RETRY_WAIT
    with patch(
        "app.nodes.executors.TransformExecutor.execute",
        side_effect=PermanentValidationError("Malformed input field"),
    ):
        run = execute_workflow_run(run_id, db_session)
        assert run.status == RunStatus.FAILED.value

    step = db_session.query(StepRun).filter_by(workflow_run_id=run_id, node_id="failing-step").one()
    assert step.status == StepStatus.FAILED.value
    assert step.attempt_count == 1  # Not retried


def test_idempotency_key_replay_and_conflict(client: TestClient):
    res = client.post("/api/v1/workflows/", json={"name": "Idempotency Workflow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Idempotent Flow",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [{"id": "e1", "source_node_id": "trig", "target_node_id": "out"}],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    headers = {"Idempotency-Key": "req_unique_token_abc_123"}
    payload_a = {"input_payload": {"order_id": "ord-101", "amount": 50}}

    # 1. First submission creates the run
    res1 = client.post(f"/api/v1/workflows/{workflow_id}/runs", json=payload_a, headers=headers)
    assert res1.status_code == 202
    run1_id = res1.json()["id"]

    # 2. Second submission with IDENTICAL key and payload returns existing run (replay)
    res2 = client.post(f"/api/v1/workflows/{workflow_id}/runs", json=payload_a, headers=headers)
    assert res2.status_code in (200, 202)
    assert res2.json()["id"] == run1_id

    # 3. Third submission with SAME key but MISMATCHED payload returns HTTP 409 Conflict
    payload_b = {"input_payload": {"order_id": "ord-101", "amount": 999}}
    res3 = client.post(f"/api/v1/workflows/{workflow_id}/runs", json=payload_b, headers=headers)
    assert res3.status_code == 409
    assert "Idempotency key reuse with mismatched input payload" in res3.json()["detail"]


def test_stale_step_lease_recovery(client: TestClient, db_session: Session):
    res = client.post("/api/v1/workflows/", json={"name": "Recovery Flow"})
    workflow_id = res.json()["id"]

    def_payload = {
        "schema_version": "1.0.0",
        "name": "Recovery Flow",
        "nodes": [
            {"id": "start", "type": "trigger", "name": "Start", "config": {"trigger_type": "api"}},
            {
                "id": "crashed-step",
                "type": "transform",
                "name": "Worker Crashed Step",
                "config": {"mapping_rules": {"res": "val"}},
                "retry_policy": {"max_retries": 3},
            },
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "start", "target_node_id": "crashed-step"},
            {"id": "e2", "source_node_id": "crashed-step", "target_node_id": "out"},
        ],
    }
    client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": def_payload})
    client.post(f"/api/v1/workflows/{workflow_id}/publish")

    res = client.post(
        f"/api/v1/workflows/{workflow_id}/runs", json={"input_payload": {"val": "recovered"}}
    )
    run_id = res.json()["id"]

    # Simulate: run is RUNNING, start has SUCCEEDED, crashed-step is RUNNING with an expired lease
    run = db_session.get(WorkflowRun, run_id)
    run.status = RunStatus.RUNNING.value

    start_step = db_session.query(StepRun).filter_by(workflow_run_id=run_id, node_id="start").one()
    start_step.status = StepStatus.SUCCEEDED.value
    start_step.output_data = {"payload": {"val": "recovered"}}

    crashed_step = (
        db_session.query(StepRun).filter_by(workflow_run_id=run_id, node_id="crashed-step").one()
    )
    crashed_step.status = StepStatus.RUNNING.value
    crashed_step.attempt_count = 1
    # Expired lease: 30 seconds in the past
    crashed_step.lease_expires_at = datetime.now(UTC) - timedelta(seconds=30)
    crashed_step.worker_lease_id = "worker-pid-dead-999"

    db_session.commit()

    # Trigger recovery routine with auto_resume=True
    recovery_result = recover_stale_runs(db_session, stale_grace_seconds=5, auto_resume=True)
    assert recovery_result["stale_steps_found"] == 1
    assert run_id in recovery_result["recovered_runs"]
    assert recovery_result["resumed_runs_count"] == 1

    # Verify run completed successfully after recovery
    db_session.refresh(run)
    assert run.status == RunStatus.SUCCEEDED.value

    # Verify start step was NOT re-executed (remained attempt_count=0/1 from before)
    db_session.refresh(start_step)
    assert start_step.status == StepStatus.SUCCEEDED.value

    # Verify crashed-step succeeded on recovered attempt 2
    db_session.refresh(crashed_step)
    assert crashed_step.status == StepStatus.SUCCEEDED.value
    assert crashed_step.attempt_count == 2
