import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.organization import OrganizationRole


def test_organization_lifecycle_and_multi_tenancy_isolation(
    db_session: Session, client: TestClient
):
    # -------------------------------------------------------------
    # 1. Register User 1 (Alice)
    # -------------------------------------------------------------
    email_alice = f"alice.{uuid.uuid4().hex[:6]}@enterprise.com"
    reg_alice = client.post(
        "/api/v1/auth/register",
        json={"email": email_alice, "password": "Password123!", "full_name": "Alice Smith"},
    )
    assert reg_alice.status_code == 201

    login_alice = client.post(
        "/api/v1/auth/login",
        json={"email": email_alice, "password": "Password123!"},
    )
    assert login_alice.status_code == 200
    token_alice = login_alice.json()["access_token"]
    headers_alice = {"Authorization": f"Bearer {token_alice}"}

    # -------------------------------------------------------------
    # 2. Register User 2 (Bob)
    # -------------------------------------------------------------
    email_bob = f"bob.{uuid.uuid4().hex[:6]}@competitor.com"
    reg_bob = client.post(
        "/api/v1/auth/register",
        json={"email": email_bob, "password": "Password123!", "full_name": "Bob Jones"},
    )
    assert reg_bob.status_code == 201

    login_bob = client.post(
        "/api/v1/auth/login",
        json={"email": email_bob, "password": "Password123!"},
    )
    assert login_bob.status_code == 200
    token_bob = login_bob.json()["access_token"]
    headers_bob = {"Authorization": f"Bearer {token_bob}"}

    # -------------------------------------------------------------
    # 3. Verify Auto-Created Workspace for Alice
    # -------------------------------------------------------------
    orgs_res = client.get("/api/v1/organizations", headers=headers_alice)
    assert orgs_res.status_code == 200
    alice_orgs = orgs_res.json()
    assert len(alice_orgs) >= 1
    alice_org_id = alice_orgs[0]["id"]
    assert alice_orgs[0]["role"] == OrganizationRole.OWNER.value
    headers_alice["X-Organization-ID"] = alice_org_id

    # -------------------------------------------------------------
    # 4. Create an explicitly scoped Workflow in Alice's Organization
    # -------------------------------------------------------------
    wf_res = client.post(
        "/api/v1/workflows/",
        headers=headers_alice,
        json={
            "name": "Alice Private Financial Pipeline",
            "description": "Internal financial computations for Alice Corp only.",
            "definition": {
                "schema_version": "1.0.0",
                "name": "Alice Private Financial Pipeline",
                "nodes": [
                    {"id": "trig_1", "name": "Trigger", "type": "trigger", "config": {}},
                    {"id": "out_1", "name": "Output", "type": "output", "config": {}},
                ],
                "edges": [{"id": "e1", "source_node_id": "trig_1", "target_node_id": "out_1"}],
            },
        },
    )
    assert wf_res.status_code == 201
    alice_wf_id = wf_res.json()["id"]

    # -------------------------------------------------------------
    # 5. Security Boundary: Bob attempts to access Alice's private workflow
    # -------------------------------------------------------------
    # Bob attempts to get Alice's workflow -> MUST BE REJECTED (403 Forbidden)
    bob_steal_wf = client.get(f"/api/v1/workflows/{alice_wf_id}", headers=headers_bob)
    assert bob_steal_wf.status_code == 403
    assert "Access denied" in bob_steal_wf.json()["detail"]

    # Bob lists workflows in his workspace -> Alice's workflow MUST NOT appear
    bob_list_wf = client.get("/api/v1/workflows/", headers=headers_bob)
    assert bob_list_wf.status_code == 200
    bob_workflows = bob_list_wf.json()
    assert not any(w["id"] == alice_wf_id for w in bob_workflows)

    # Bob attempts to trigger a run on Alice's workflow -> MUST BE REJECTED (403 Forbidden)
    bob_trigger_res = client.post(
        f"/api/v1/workflows/{alice_wf_id}/runs",
        headers=headers_bob,
        json={"input_payload": {"data": "unauthorized"}},
    )
    assert bob_trigger_res.status_code == 403

    # -------------------------------------------------------------
    # 6. Organization Switching & Multiple Memberships
    # -------------------------------------------------------------
    # Alice creates a second organization: "Acme Enterprise"
    create_second_org = client.post(
        "/api/v1/organizations",
        headers=headers_alice,
        json={"name": "Acme Enterprise Corp", "slug": f"acme-ent-{uuid.uuid4().hex[:4]}"},
    )
    assert create_second_org.status_code == 201
    second_org_id = create_second_org.json()["id"]

    # Alice lists organizations again -> now has 2 organizations
    alice_all_orgs = client.get("/api/v1/organizations", headers=headers_alice).json()
    assert len(alice_all_orgs) >= 2
    assert any(o["id"] == second_org_id for o in alice_all_orgs)

    # Alice invites Bob to "Acme Enterprise Corp" as a Builder
    invite_res = client.post(
        f"/api/v1/organizations/{second_org_id}/members",
        headers=headers_alice,
        json={"email": email_bob, "role": "builder"},
    )
    assert invite_res.status_code == 201
    assert invite_res.json()["email"] == email_bob
    assert invite_res.json()["role"] == "builder"

    # Bob now sees Acme Enterprise in his organizations list
    bob_orgs = client.get("/api/v1/organizations", headers=headers_bob).json()
    assert any(o["id"] == second_org_id for o in bob_orgs)
    bob_acme_membership = next(o for o in bob_orgs if o["id"] == second_org_id)
    assert bob_acme_membership["role"] == "builder"

    # Bob attempts to use an organization ID he DOES NOT belong to -> 403 Forbidden
    fake_org_headers = {"Authorization": f"Bearer {token_bob}", "X-Organization-ID": alice_org_id}
    unauth_org_access = client.get("/api/v1/workflows/", headers=fake_org_headers)
    assert unauth_org_access.status_code == 403
