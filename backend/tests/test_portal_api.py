"""Integration tests for FlowForge Portal Client API endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_portal_workflows_discovery():
    resp = client.get("/api/v1/portal/workflows")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    wf = data[0]
    assert "id" in wf
    assert "name" in wf
    assert "input_contract" in wf
    assert "fields" in wf["input_contract"]


def test_portal_workflow_form_definition():
    list_resp = client.get("/api/v1/portal/workflows")
    wf_id = list_resp.json()[0]["id"]

    form_resp = client.get(f"/api/v1/portal/workflows/{wf_id}/form")
    assert form_resp.status_code == 200
    form = form_resp.json()
    assert form["workflow_id"] == wf_id
    assert "input_contract" in form
    assert isinstance(form["input_contract"]["fields"], list)


def test_portal_request_submission_validation():
    list_resp = client.get("/api/v1/portal/workflows")
    refund_wf = next((w for w in list_resp.json() if "Refund" in w["name"]), list_resp.json()[0])

    # Missing required fields
    bad_resp = client.post(
        f"/api/v1/portal/workflows/{refund_wf['id']}/requests",
        json={"inputs": {}, "submitted_by": "Test Client"},
    )
    assert bad_resp.status_code == 422
    assert "required" in bad_resp.json()["detail"].lower()


def test_portal_natural_language_parser():
    list_resp = client.get("/api/v1/portal/workflows")
    wf_id = list_resp.json()[0]["id"]

    prompt = "I need help with order ORD-99882. Please refund $45. Alex Smith alex@example.com"
    parse_resp = client.post(
        f"/api/v1/portal/workflows/{wf_id}/parse-nl",
        json={"prompt": prompt},
    )
    assert parse_resp.status_code == 200
    res = parse_resp.json()
    assert "extracted" in res
    assert "needs_clarification" in res
    assert isinstance(res["extracted"], dict)
