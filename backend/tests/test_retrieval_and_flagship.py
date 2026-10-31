from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.execution import StepRun, WorkflowRun
from app.models.knowledge import KnowledgeDocument
from app.retrieval.engine import calculate_relevance_score, search_knowledge_base
from app.workflows.executor import execute_workflow_run
from app.workflows.flagship import (
    COLLECTION_NAME,
    create_or_update_flagship_workflow,
    seed_flagship_knowledge_base,
)
from app.workflows.state_machine import RunStatus, StepStatus


def test_relevance_scoring_algorithm():
    query = "billing refund policy"
    # Document with exact phrase and keywords
    high_match = "Official FlowForge AI billing refund policy: refunds granted within 30 days."
    # Document with technical content
    low_match = "Server deployment instructions for Docker containers and systemd services."

    score_high = calculate_relevance_score(query, high_match)
    score_low = calculate_relevance_score(query, low_match)

    assert score_high > 0.5
    assert score_low < 0.2
    assert score_high > score_low


def test_knowledge_base_seeding_and_search(db_session: Session):
    coll = seed_flagship_knowledge_base(db_session)
    assert coll.name == COLLECTION_NAME

    docs = db_session.scalars(
        select(KnowledgeDocument).where(KnowledgeDocument.collection_id == coll.id)
    ).all()
    assert len(docs) >= 3

    # Search for refund policy
    results = search_knowledge_base(
        db=db_session,
        collection_name=COLLECTION_NAME,
        query="I want a refund for my subscription charge",
        top_k=2,
        score_threshold=0.1,
    )

    assert results["count"] > 0
    assert len(results["passages"]) > 0
    assert len(results["sources"]) > 0
    # Top citation should be the refund policy
    assert "Refund" in results["sources"][0]["title"]
    assert results["sources"][0]["score"] > 0.2


def test_knowledge_api_endpoints(client: TestClient, db_session: Session):

    # 1. Seed knowledge via API
    resp = client.post("/api/v1/knowledge/seed")
    assert resp.status_code == 200
    assert "seeded" in resp.json()["message"]

    # 2. List collections
    resp = client.get("/api/v1/knowledge/collections")
    assert resp.status_code == 200
    collections = resp.json()
    assert any(c["name"] == COLLECTION_NAME for c in collections)

    target_coll = next(c for c in collections if c["name"] == COLLECTION_NAME)
    assert target_coll["document_count"] >= 3

    # 3. List documents
    resp = client.get(f"/api/v1/knowledge/collections/{target_coll['id']}/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 3

    # 4. Search via API
    resp = client.post(
        "/api/v1/knowledge/search",
        json={
            "collection_name": COLLECTION_NAME,
            "query": "technical server downtime SLA protocol",
            "top_k": 2,
            "score_threshold": 0.1,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] > 0
    assert any("Technical" in s["title"] for s in data["sources"])


def test_end_to_end_flagship_support_workflow_execution(db_session: Session):
    """Verifies complete execution of the flagship support triage, knowledge retrieval, and routing workflow."""
    workflow = create_or_update_flagship_workflow(db_session)
    assert workflow is not None

    latest_version = workflow.versions[0]

    # Customer billing inquiry ticket
    ticket_input = {
        "ticket_text": "Hello, I was charged $89.00 twice on my credit card. Please issue a refund to my billing statement. My account id is cust_9942."
    }

    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=latest_version.id,
        input_payload=ticket_input,
    )
    db_session.add(run)
    db_session.commit()

    # Execute workflow run
    execute_workflow_run(run.id, db_session)

    db_session.refresh(run)
    assert run.status == RunStatus.SUCCEEDED.value
    assert run.output_payload is not None

    output = run.output_payload.get("result", {})
    # Verify classification
    assert output.get("category") == "billing"
    assert output.get("status") == "triaged"

    # Verify retrieved policy passages and citations
    applicable_policies = output.get("applicable_policies")
    assert isinstance(applicable_policies, list)
    assert len(applicable_policies) > 0
    assert any("refund" in str(p).lower() for p in applicable_policies)

    policy_sources = output.get("policy_sources")
    assert isinstance(policy_sources, list)
    assert len(policy_sources) > 0
    assert any("Billing" in str(s.get("title", "")) for s in policy_sources)

    # Verify structured fields
    extracted = output.get("extracted_details")
    assert isinstance(extracted, dict)
    assert "email" in extracted
    assert "priority" in extracted

    # Verify step runs and token/cost tracking
    steps = db_session.scalars(select(StepRun).where(StepRun.workflow_run_id == run.id)).all()
    step_dict = {s.node_id: s for s in steps}

    assert step_dict["node_webhook"].status == StepStatus.SUCCEEDED.value
    assert step_dict["node_classify_ticket"].status == StepStatus.SUCCEEDED.value
    assert step_dict["node_policy_retrieval"].status == StepStatus.SUCCEEDED.value
    assert step_dict["node_extract_fields"].status == StepStatus.SUCCEEDED.value
    assert step_dict["node_route_condition"].status == StepStatus.SUCCEEDED.value
    assert step_dict["node_assemble_response"].status == StepStatus.SUCCEEDED.value

    # Verify cumulative token metrics on workflow run
    assert run.total_tokens > 0
