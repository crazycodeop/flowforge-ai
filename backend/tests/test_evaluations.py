from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.evaluations.runner import run_evaluation_benchmark
from app.models.evaluation import EvaluationDataset, EvaluationRun
from app.workflows.flagship import create_or_update_flagship_workflow


def test_evaluations_pipeline_and_metrics(db_session: Session, client: TestClient):
    # 1. Create flagship workflow and version
    wf = create_or_update_flagship_workflow(db_session)
    version = wf.versions[0]

    # 2. Seed benchmark dataset via API
    seed_resp = client.post("/api/v1/evaluations/seed")
    assert seed_resp.status_code == 200
    dataset_id = seed_resp.json()["dataset_id"]

    # 3. List datasets
    ds_resp = client.get("/api/v1/evaluations/datasets")
    assert ds_resp.status_code == 200
    datasets = ds_resp.json()
    assert any(d["id"] == dataset_id for d in datasets)

    # 4. Trigger evaluation run via API
    run_resp = client.post(
        "/api/v1/evaluations/runs",
        json={
            "dataset_id": dataset_id,
            "workflow_id": wf.id,
            "version_number": version.version_number,
        },
    )
    assert run_resp.status_code == 201
    eval_data = run_resp.json()

    assert eval_data["status"] == "COMPLETED"
    assert eval_data["accuracy_score"] >= 0.8  # High accuracy across test cases
    assert eval_data["avg_latency_ms"] > 0
    assert "total_cases" in eval_data["summary_metrics"]
    assert eval_data["summary_metrics"]["total_cases"] == 5
    assert len(eval_data["results"]) == 5

    # 5. Retrieve individual evaluation run details
    detail_resp = client.get(f"/api/v1/evaluations/runs/{eval_data['id']}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == eval_data["id"]


def test_evaluation_runner_empty_dataset(db_session: Session):
    wf = create_or_update_flagship_workflow(db_session)
    version = wf.versions[0]

    empty_ds = EvaluationDataset(name="Empty Test Suite", test_cases=[])
    db_session.add(empty_ds)
    db_session.flush()

    eval_run = EvaluationRun(
        dataset_id=empty_ds.id,
        workflow_id=wf.id,
        workflow_version_id=version.id,
        status="PENDING",
    )
    db_session.add(eval_run)
    db_session.commit()

    completed = run_evaluation_benchmark(db_session, eval_run.id)
    assert completed.status == "COMPLETED"
    assert completed.accuracy_score == 1.0
