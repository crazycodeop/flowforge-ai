import time
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.evaluation import EvaluationDataset, EvaluationRun
from app.models.execution import WorkflowRun
from app.workflows.executor import execute_workflow_run


def run_evaluation_benchmark(db: Session, eval_run_id: str) -> EvaluationRun:
    """Executes all test cases in an evaluation dataset against a workflow version and records quality metrics."""
    eval_run = db.get(EvaluationRun, eval_run_id)
    if not eval_run:
        raise ValueError(f"EvaluationRun '{eval_run_id}' not found.")

    dataset = db.get(EvaluationDataset, eval_run.dataset_id)
    if not dataset:
        raise ValueError(f"EvaluationDataset '{eval_run.dataset_id}' not found.")

    eval_run.status = "RUNNING"
    db.commit()

    test_cases = dataset.test_cases or []
    if not test_cases:
        eval_run.status = "COMPLETED"
        eval_run.accuracy_score = 1.0
        eval_run.avg_latency_ms = 0.0
        eval_run.total_cost_usd = 0.0
        eval_run.summary_metrics = {"total_cases": 0, "passed": 0, "accuracy": 1.0}
        eval_run.completed_at = datetime.now(UTC)
        db.commit()
        return eval_run

    case_results: list[dict[str, Any]] = []
    passed_count = 0
    total_latency_ms = 0.0
    total_cost_usd = 0.0

    for idx, case in enumerate(test_cases):
        input_payload = case.get("input", {})
        expected_category = case.get("expected_category")
        expected_status = case.get("expected_status", "triaged")

        # Create temporary execution run for evaluation
        wf_run = WorkflowRun(
            workflow_id=eval_run.workflow_id,
            workflow_version_id=eval_run.workflow_version_id,
            input_payload=input_payload,
        )
        db.add(wf_run)
        db.commit()

        start_time = time.perf_counter()
        try:
            executed_run = execute_workflow_run(wf_run.id, db)
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            output = executed_run.output_payload or {}
            result_data = output.get("result", output)

            # Evaluate assertions
            passed = True
            failure_reasons: list[str] = []

            if executed_run.status != "SUCCEEDED":
                passed = False
                failure_reasons.append(
                    f"Workflow status was '{executed_run.status}', expected 'SUCCEEDED'"
                )

            actual_category = result_data.get("category")
            if not actual_category and isinstance(output, dict):
                for val in output.values():
                    if isinstance(val, dict) and "category" in val:
                        actual_category = val["category"]
                        break

            if expected_category and actual_category != expected_category:
                passed = False
                failure_reasons.append(
                    f"Category mismatch: expected '{expected_category}', received '{actual_category}'"
                )

            actual_status = result_data.get("status")
            if expected_status and actual_status and actual_status != expected_status:
                passed = False
                failure_reasons.append(
                    f"Status mismatch: expected '{expected_status}', received '{actual_status}'"
                )

            if passed:
                passed_count += 1

            tokens = executed_run.total_tokens or 0
            cost = executed_run.total_cost_usd or 0.0
            total_latency_ms += elapsed_ms
            total_cost_usd += cost

            case_results.append(
                {
                    "case_index": idx,
                    "input": input_payload,
                    "passed": passed,
                    "actual_output": result_data,
                    "failure_reasons": failure_reasons,
                    "latency_ms": round(elapsed_ms, 2),
                    "tokens": tokens,
                    "cost_usd": cost,
                }
            )

        except Exception as err:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            case_results.append(
                {
                    "case_index": idx,
                    "input": input_payload,
                    "passed": False,
                    "error": str(err),
                    "latency_ms": round(elapsed_ms, 2),
                }
            )

    total_cases = len(test_cases)
    accuracy = round(passed_count / total_cases, 4) if total_cases > 0 else 0.0
    avg_latency = round(total_latency_ms / total_cases, 2) if total_cases > 0 else 0.0

    eval_run.status = "COMPLETED"
    eval_run.accuracy_score = accuracy
    eval_run.avg_latency_ms = avg_latency
    eval_run.total_cost_usd = round(total_cost_usd, 6)
    eval_run.summary_metrics = {
        "total_cases": total_cases,
        "passed": passed_count,
        "failed": total_cases - passed_count,
        "accuracy": accuracy,
        "avg_latency_ms": avg_latency,
        "total_cost_usd": round(total_cost_usd, 6),
    }
    eval_run.results = case_results
    eval_run.completed_at = datetime.now(UTC)
    db.commit()
    db.refresh(eval_run)

    return eval_run
