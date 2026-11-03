from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.approval import ApprovalRequest


def test_whatsapp_config_endpoint(client: TestClient):
    resp = client.get("/api/v1/integrations/whatsapp/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "webhook_url" in data
    assert "verify_token" in data
    assert data["provider"] == "Meta WhatsApp Business Cloud API"


def test_whatsapp_webhook_verification(client: TestClient):
    settings = get_settings()
    # Correct verify token
    resp = client.get(
        "/api/v1/integrations/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": "1155998822",
        },
    )
    assert resp.status_code == 200
    assert resp.text == "1155998822"

    # Incorrect verify token
    bad_resp = client.get(
        "/api/v1/integrations/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "1155998822",
        },
    )
    assert bad_resp.status_code == 403


def test_whatsapp_auto_refund_simulation(client: TestClient):
    payload = {
        "message": "My milk was leaked in order #1234. Please process a $35 refund.",
        "customer_phone": "+91 98765 43210",
        "customer_name": "Priya Sharma",
    }
    resp = client.post("/api/v1/integrations/whatsapp/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["requires_approval"] is False
    assert "Refund Approved" in data["reply"] or "Billing & Refund Policy" in data["reply"]
    assert data["run_id"] is not None


def test_whatsapp_high_value_escalation(client: TestClient, db_session: Session):
    payload = {
        "message": "I ordered an electronic iPad tablet worth $450 in order #9910 but it was stolen. Need immediate refund.",
        "customer_phone": "+91 91234 56789",
        "customer_name": "Arjun Patel",
    }
    resp = client.post("/api/v1/integrations/whatsapp/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["requires_approval"] is True
    assert data["approval_id"] is not None
    assert "Manager Review" in data["reply"]

    # Verify that the approval request is registered in the database
    approval = db_session.scalar(
        select(ApprovalRequest).where(ApprovalRequest.id == data["approval_id"])
    )
    assert approval is not None
    assert "450" in approval.description or "Arjun Patel" in approval.description
