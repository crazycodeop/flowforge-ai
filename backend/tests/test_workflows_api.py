from fastapi.testclient import TestClient


def test_list_available_nodes(client: TestClient):
    response = client.get("/api/v1/workflows/nodes")
    assert response.status_code == 200
    nodes = response.json()
    assert len(nodes) >= 8
    types = [n["type"] for n in nodes]
    assert "trigger" in types
    assert "ai_classify" in types
    assert "structured_extract" in types
    assert "retrieval" in types
    assert "condition" in types
    assert "human_approval" in types
    assert "output" in types


def test_workflow_lifecycle_and_version_immutability(client: TestClient):
    # 1. Create a new workflow draft
    create_payload = {
        "name": "Customer Support Triage",
        "description": "Orchestrates incoming ticket classification and response",
    }
    res = client.post("/api/v1/workflows/", json=create_payload)
    assert res.status_code == 201
    workflow = res.json()
    workflow_id = workflow["id"]
    assert workflow["name"] == "Customer Support Triage"
    assert workflow["latest_version"] is None

    # 2. Update draft with an invalid definition (orphan node)
    invalid_definition = {
        "schema_version": "1.0.0",
        "name": "Customer Support Triage",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {"id": "orphan", "type": "output", "name": "Orphan Output", "config": {}},
        ],
        "edges": [],  # No edge connects trig to orphan
    }
    res = client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": invalid_definition})
    assert res.status_code == 200

    # 3. Validate draft endpoint returns errors
    res = client.post(f"/api/v1/workflows/{workflow_id}/validate")
    assert res.status_code == 200
    val_data = res.json()
    assert val_data["is_valid"] is False
    assert any(err["code"] == "UNREACHABLE_NODE" for err in val_data["errors"])

    # 4. Attempting to publish invalid draft must fail with 422
    res = client.post(f"/api/v1/workflows/{workflow_id}/publish")
    assert res.status_code == 422
    assert "Cannot publish invalid workflow graph" in res.json()["detail"]["message"]

    # 5. Fix definition to be valid
    valid_definition_v1 = {
        "schema_version": "1.0.0",
        "name": "Customer Support Triage",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {
                "id": "classify",
                "type": "ai_classify",
                "name": "Ticket Classifier",
                "config": {
                    "prompt_template": "Classify {ticket}",
                    "categories": ["billing", "technical"],
                },
            },
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "trig", "target_node_id": "classify"},
            {"id": "e2", "source_node_id": "classify", "target_node_id": "out"},
        ],
    }
    res = client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": valid_definition_v1})
    assert res.status_code == 200

    # 6. Publish Version 1
    res = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        json={"changelog": "Initial release with ticket classification"},
    )
    assert res.status_code == 201
    version_1 = res.json()
    assert version_1["version_number"] == 1
    assert version_1["changelog"] == "Initial release with ticket classification"
    checksum_1 = version_1["checksum"]
    assert len(checksum_1) == 64

    # 7. Update draft with Version 2 definition
    valid_definition_v2 = {
        "schema_version": "1.0.0",
        "name": "Customer Support Triage v2",
        "nodes": [
            {"id": "trig", "type": "trigger", "name": "Trigger", "config": {"trigger_type": "api"}},
            {
                "id": "classify",
                "type": "ai_classify",
                "name": "Ticket Classifier",
                "config": {
                    "prompt_template": "Classify {ticket}",
                    "categories": ["billing", "technical", "security"],
                },
            },
            {"id": "out", "type": "output", "name": "Output", "config": {}},
        ],
        "edges": [
            {"id": "e1", "source_node_id": "trig", "target_node_id": "classify"},
            {"id": "e2", "source_node_id": "classify", "target_node_id": "out"},
        ],
    }
    res = client.put(f"/api/v1/workflows/{workflow_id}", json={"definition": valid_definition_v2})
    assert res.status_code == 200

    # 8. Publish Version 2
    res = client.post(
        f"/api/v1/workflows/{workflow_id}/publish",
        json={"changelog": "Added security category"},
    )
    assert res.status_code == 201
    version_2 = res.json()
    assert version_2["version_number"] == 2
    assert version_2["checksum"] != checksum_1

    # 9. Verify Version 1 remains completely immutable
    res = client.get(f"/api/v1/workflows/{workflow_id}/versions/1")
    assert res.status_code == 200
    retrieved_v1 = res.json()
    assert retrieved_v1["checksum"] == checksum_1
    assert retrieved_v1["definition"]["nodes"][1]["config"]["categories"] == [
        "billing",
        "technical",
    ]

    # 10. List versions
    res = client.get(f"/api/v1/workflows/{workflow_id}/versions")
    assert res.status_code == 200
    versions_list = res.json()
    assert len(versions_list) == 2
    assert versions_list[0]["version_number"] == 2
    assert versions_list[1]["version_number"] == 1

    # 11. Delete workflow
    res = client.delete(f"/api/v1/workflows/{workflow_id}")
    assert res.status_code == 204

    # 12. Confirm deletion cascades
    res = client.get(f"/api/v1/workflows/{workflow_id}")
    assert res.status_code == 404


def test_delete_execution_endpoints(client: TestClient, db_session):
    # 1. Trigger a workflow run on flagship
    from app.workflows.flagship import create_or_update_flagship_workflow

    wf = create_or_update_flagship_workflow(db_session)
    res = client.post(
        f"/api/v1/workflows/{wf.id}/runs",
        json={"input_payload": {"ticket_text": "Sample test ticket"}},
    )
    assert res.status_code == 202
    run_id = res.json()["id"]

    # 2. Delete single run
    del_res = client.delete(f"/api/v1/runs/{run_id}")
    assert del_res.status_code == 200
    assert del_res.json()["id"] == run_id

    # 3. Confirm 404
    get_res = client.get(f"/api/v1/runs/{run_id}")
    assert get_res.status_code == 404

    # 4. Trigger another run and delete all
    res2 = client.post(
        f"/api/v1/workflows/{wf.id}/runs",
        json={"input_payload": {"ticket_text": "Another ticket"}},
    )
    assert res2.status_code == 202

    del_all = client.delete("/api/v1/runs")
    assert del_all.status_code == 200
    assert del_all.json()["deleted_count"] >= 1

    list_res = client.get("/api/v1/runs")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0
