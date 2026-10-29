from fastapi.testclient import TestClient


def test_liveness_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert "environment" in data


def test_readiness_endpoint(client: TestClient):
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"]["healthy"] is True
    assert data["redis"]["healthy"] is True
    assert data["celery"]["healthy"] is True
