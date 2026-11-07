"""
Seed script to create:
1. Knowledge base collections and documents (Support & Billing Policies, IT Runbooks).
2. Two complete, validated workflows:
   - One WITHOUT human approval (Automated Customer Support & SLA Triage).
   - One WITH human approval (High-Value Refund & Escalation Approval Pipeline).
"""
import uuid
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.knowledge import KnowledgeCollection, KnowledgeDocument
from app.models.workflow import Workflow, WorkflowVersion, compute_definition_checksum
from app.schemas.workflow import WorkflowDefinition
from app.workflows.validation import validate_workflow_graph


def seed_knowledge_base(db):
    print("--- Seeding Knowledge Base Collections & Documents ---")

    # 1. Support & Billing Policies Collection
    coll1 = db.scalar(select(KnowledgeCollection).where(KnowledgeCollection.name == "support_policies"))
    if not coll1:
        coll1 = KnowledgeCollection(
            name="support_policies",
            description="Official customer support guidelines, SLA resolution tiers, refund limits, and security protocols.",
        )
        db.add(coll1)
        db.flush()

    docs_data1 = [
        (
            "Billing & Refund Policy (POL-BILL-001)",
            (
                "# Enterprise Billing & Refund Policy (POL-BILL-001)\n\n"
                "## 1. Overview & Standard Limits\n"
                "All FlowForge AI subscriptions and metered API token charges are protected under our 30-day satisfaction guarantee.\n"
                "- **Self-Serve Auto-Refund**: Claims below **$100.00 USD** with fewer than 1,000 executed workflow runs are automatically approved without human intervention.\n"
                "- **Manager Approval Gate**: Any single refund claim exceeding **$100.00 USD**, or accounts exceeding 1,000 monthly executions, strictly requires review and digital sign-off by a **Finance Manager** (`role: manager` or `role: admin`).\n\n"
                "## 2. Ineligible Refund Scenarios\n"
                "- Disputes originating from expired custom webhooks or misconfigured client-side network firewalls.\n"
                "- Chargeback filings without prior notification to support (initiates immediate temporary account hold).\n\n"
                "## 3. SLA Payout Timelines\n"
                "Once approved, refunds are credited to the original payment method within 3 to 5 business days via Stripe."
            ),
            {"policy_code": "POL-BILL-001", "department": "Finance", "category": "billing"}
        ),
        (
            "Technical SLA & Incident Escalation Protocol (POL-TECH-002)",
            (
                "# Technical SLA & Incident Escalation Protocol (POL-TECH-002)\n\n"
                "## 1. Severity Classifications\n"
                "- **P0 Critical Incident**: Production workflow engine outage, unhandled Celery worker lease deadlock, or PostgreSQL cluster partition failure.\n"
                "  - **SLA Target**: On-call engineering acknowledgement within **15 minutes**; hourly stakeholder status briefings.\n"
                "- **P1 High Incident**: Degraded AI runtime response times (> 5,000ms latency), queue backpressure, or rate limit surges on external LLM inference endpoints.\n"
                "  - **SLA Target**: Mitigation response within **60 minutes**.\n"
                "- **P2 Standard Inquiry**: SDK client integration questions, visual node canvas configuration, or custom prompt engineering.\n"
                "  - **SLA Target**: Resolution within **24 business hours**.\n\n"
                "## 2. Escalation Hierarchy\n"
                "1. Automated Triage Bot classifies incoming error trace.\n"
                "2. If database or worker timeout is detected, system triggers Slack incident room `#incident-war-room`.\n"
                "3. On-call Site Reliability Engineer (SRE) receives PagerDuty push notification."
            ),
            {"policy_code": "POL-TECH-002", "department": "Engineering", "category": "technical"}
        ),
        (
            "Security, API Keys & Privacy Governance (POL-SEC-003)",
            (
                "# Security, API Keys & Privacy Governance (POL-SEC-003)\n\n"
                "## 1. Credential Security & Invalidation\n"
                "- Any automated alert or user report signaling compromised AI provider credentials (Groq, Gemini, OpenAI) triggers an immediate system credential revoke and session invalidation.\n"
                "- Production API keys must never be logged in raw plaintext audit events. All execution payloads automatically mask tokens with `sk-••••••••`.\n\n"
                "## 2. Multi-Tenant Data Isolation\n"
                "- Workflows, step states, and execution histories are strictly partitioned by `organization_id`.\n"
                "- Cross-tenant data leakage is prevented at both the database query filter and application middleware levels."
            ),
            {"policy_code": "POL-SEC-003", "department": "Security", "category": "security"}
        ),
    ]

    for title, content, meta in docs_data1:
        existing = db.scalar(
            select(KnowledgeDocument).where(
                KnowledgeDocument.collection_id == coll1.id,
                KnowledgeDocument.title == title,
            )
        )
        if not existing:
            db.add(KnowledgeDocument(
                collection_id=coll1.id,
                title=title,
                content=content,
                doc_metadata=meta,
            ))

    # 2. IT Infrastructure Runbooks Collection
    coll2 = db.scalar(select(KnowledgeCollection).where(KnowledgeCollection.name == "it_runbooks"))
    if not coll2:
        coll2 = KnowledgeCollection(
            name="it_runbooks",
            description="Operational runbooks for site reliability engineers, database maintenance, and worker cluster recovery.",
        )
        db.add(coll2)
        db.flush()

    docs_data2 = [
        (
            "PostgreSQL High Availability & Failover Runbook",
            (
                "# PostgreSQL High Availability & Failover Runbook\n\n"
                "## Diagnostic Steps for Connection Saturation\n"
                "1. Verify active connection pool usage:\n"
                "   `SELECT count(*) FROM pg_stat_activity WHERE state = 'active';`\n"
                "2. Check for blocking transactions exceeding 30 seconds:\n"
                "   `SELECT pid, now() - xact_start AS duration, query FROM pg_stat_activity WHERE state != 'idle';`\n"
                "3. Terminate runaway idle-in-transaction connections if pool capacity > 90%.\n\n"
                "## Failover & Read Replica Promotion\n"
                "In case of unrecoverable hardware fault on primary database:\n"
                "- Promote primary read-replica using `pg_ctl promote`.\n"
                "- Update connection string environment secret `DATABASE_URL` in Kubernetes config map.\n"
                "- Trigger zero-downtime rolling restart of backend web instances."
            ),
            {"runbook_id": "RB-DB-01", "team": "SRE"}
        ),
        (
            "Celery Worker Lease Recovery & Queue Health",
            (
                "# Celery Worker Lease Recovery & Queue Health\n\n"
                "## Queue Health Audit\n"
                "- Inspect Upstash Redis queue depth: `redis-cli LLEN celery`\n"
                "- Ensure worker heartbeat responses are received every 30 seconds.\n\n"
                "## Orphan Task Recovery\n"
                "- If a worker crashes mid-execution, the lease watchdog automatically transitions expired `running` steps back to `queued` after 300 seconds.\n"
                "- Run recovery probe: `POST /api/v1/runs/recover` to unstick orphaned background runs."
            ),
            {"runbook_id": "RB-CELERY-02", "team": "DevOps"}
        ),
    ]

    for title, content, meta in docs_data2:
        existing = db.scalar(
            select(KnowledgeDocument).where(
                KnowledgeDocument.collection_id == coll2.id,
                KnowledgeDocument.title == title,
            )
        )
        if not existing:
            db.add(KnowledgeDocument(
                collection_id=coll2.id,
                title=title,
                content=content,
                doc_metadata=meta,
            ))

    db.commit()
    print("Knowledge base seeded successfully.")


def seed_workflows(db):
    print("--- Seeding Workflows ---")

    # =========================================================================
    # WORKFLOW 1: WITHOUT HUMAN APPROVAL
    # Automated Customer Support & SLA Triage
    # =========================================================================
    wf1_name = "Automated Customer Support & SLA Triage"
    wf1_desc = "High-throughput autonomous support pipeline with AI classification, policy retrieval grounding, structured entity extraction, and automated resolution dispatch without human review."

    wf1_definition = {
        "schema_version": "1.0.0",
        "name": wf1_name,
        "description": wf1_desc,
        "nodes": [
            {
                "id": "node_webhook",
                "name": "Customer Support Webhook",
                "type": "trigger",
                "position": {"x": 280, "y": 50},
                "config": {"trigger_type": "api"},
            },
            {
                "id": "node_classify",
                "name": "AI Intent Classifier",
                "type": "ai_classify",
                "position": {"x": 280, "y": 170},
                "config": {
                    "prompt_template": "Classify the incoming customer support ticket: {run_input.ticket_text}",
                    "categories": ["billing", "technical", "account", "general"],
                    "temperature": 0.0,
                },
            },
            {
                "id": "node_retrieval",
                "name": "Support Policy Retrieval",
                "type": "retrieval",
                "position": {"x": 280, "y": 290},
                "config": {
                    "collection_name": "support_policies",
                    "query_template": "{node_classify.category} policy guidelines: {run_input.ticket_text}",
                    "top_k": 2,
                    "score_threshold": 0.1,
                },
            },
            {
                "id": "node_extract",
                "name": "Structured Ticket Extractor",
                "type": "structured_extract",
                "position": {"x": 280, "y": 410},
                "config": {
                    "prompt_template": "Extract structured details from ticket: {run_input.ticket_text}",
                    "schema_definition": {
                        "type": "object",
                        "properties": {
                            "customer_id": {"type": "string"},
                            "priority": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                            "issue_summary": {"type": "string"},
                            "affected_service": {"type": "string"},
                        },
                        "required": ["priority", "issue_summary"],
                    },
                },
            },
            {
                "id": "node_transform",
                "name": "Format Resolution Payload",
                "type": "transform",
                "position": {"x": 280, "y": 530},
                "config": {
                    "mapping_rules": {
                        "ticket_status": "auto_resolved",
                        "category": "{node_classify.category}",
                        "priority": "{node_extract.priority}",
                    },
                },
            },
            {
                "id": "node_output",
                "name": "Automated Dispatcher",
                "type": "output",
                "position": {"x": 280, "y": 650},
                "config": {
                    "response_template": {
                        "status": "success",
                        "triaged_category": "{node_classify.category}",
                        "priority_level": "{node_extract.priority}",
                        "grounded_policy": "{node_retrieval.passages}",
                        "resolution_plan": "Ticket triaged and routed with zero human latency.",
                    }
                },
            },
        ],
        "edges": [
            {
                "id": "e_trigger_classify",
                "source_node_id": "node_webhook",
                "target_node_id": "node_classify",
            },
            {
                "id": "e_classify_retrieval",
                "source_node_id": "node_classify",
                "target_node_id": "node_retrieval",
            },
            {
                "id": "e_retrieval_extract",
                "source_node_id": "node_retrieval",
                "target_node_id": "node_extract",
            },
            {
                "id": "e_extract_transform",
                "source_node_id": "node_extract",
                "target_node_id": "node_transform",
            },
            {
                "id": "e_transform_output",
                "source_node_id": "node_transform",
                "target_node_id": "node_output",
            },
        ],
        "default_timeout_seconds": 3600,
    }

    # Validate WF1 definition
    val1 = validate_workflow_graph(WorkflowDefinition.model_validate(wf1_definition))
    assert val1.is_valid, f"WF1 validation failed: {[e.message for e in val1.errors]}"

    wf1 = db.scalar(select(Workflow).where(Workflow.name == wf1_name))
    if not wf1:
        wf1 = Workflow(
            name=wf1_name,
            description=wf1_desc,
            is_active=True,
            draft_definition=wf1_definition,
        )
        db.add(wf1)
        db.flush()
    else:
        wf1.description = wf1_desc
        wf1.draft_definition = wf1_definition

    # Ensure published Version 1
    v1 = db.scalar(select(WorkflowVersion).where(WorkflowVersion.workflow_id == wf1.id, WorkflowVersion.version_number == 1))
    if not v1:
        checksum1 = compute_definition_checksum(wf1_definition)
        v1 = WorkflowVersion(
            workflow_id=wf1.id,
            version_number=1,
            definition=wf1_definition,
            checksum=checksum1,
            changelog="Initial production release (Fully automated)",
        )
        db.add(v1)

    print(f"Created/Updated Workflow 1 (Without Approval): {wf1.name} (ID: {wf1.id})")

    # =========================================================================
    # WORKFLOW 2: WITH HUMAN APPROVAL
    # High-Value Refund & Escalation Approval Pipeline
    # =========================================================================
    wf2_name = "High-Value Refund & Financial Approval Pipeline"
    wf2_desc = "AI-assisted refund processing that evaluates customer eligibility, routes high-value or high-risk claims (> $100) to Human Manager Review, and dispatches audited payouts upon approval."

    wf2_definition = {
        "schema_version": "1.0.0",
        "name": wf2_name,
        "description": wf2_desc,
        "nodes": [
            {
                "id": "node_webhook",
                "name": "Refund Request Webhook",
                "type": "trigger",
                "position": {"x": 300, "y": 50},
                "config": {"trigger_type": "api"},
            },
            {
                "id": "node_extract",
                "name": "Transaction & Amount Parser",
                "type": "structured_extract",
                "position": {"x": 300, "y": 170},
                "config": {
                    "prompt_template": "Extract refund claim details from: {run_input.ticket_text}",
                    "schema_definition": {
                        "type": "object",
                        "properties": {
                            "transaction_id": {"type": "string"},
                            "amount": {"type": "number"},
                            "customer_email": {"type": "string"},
                            "refund_reason": {"type": "string"},
                        },
                        "required": ["amount", "customer_email"],
                    },
                },
            },
            {
                "id": "node_condition",
                "name": "Evaluate Threshold (> $100)",
                "type": "condition",
                "position": {"x": 300, "y": 290},
                "config": {
                    "branches": [
                        {
                            "branch_name": "high_value",
                            "operator": "greater_than",
                            "field_path": "upstream_outputs.node_extract.amount",
                            "value": 100,
                        }
                    ],
                    "default_branch": "standard_value",
                },
            },
            {
                "id": "node_approval",
                "name": "Finance Manager Approval Gate",
                "type": "human_approval",
                "position": {"x": 160, "y": 430},
                "config": {
                    "title": "High-Value Refund Authorization Required",
                    "description_template": "Refund claim of ${node_extract.amount} requested by {node_extract.customer_email} (Tx: {node_extract.transaction_id}). Exceeds $100 automated limit. Please review and authorize disbursement.",
                    "required_role": "manager",
                    "timeout_hours": 24,
                },
            },
            {
                "id": "node_transform",
                "name": "Generate Payout & Audit Receipt",
                "type": "transform",
                "position": {"x": 300, "y": 570},
                "config": {
                    "mapping_rules": {
                        "action": "disbursement_approved",
                        "approved_by": "{node_approval.decided_by}",
                        "payout_status": "queued",
                    },
                },
            },
            {
                "id": "node_output",
                "name": "Escalation & Disbursement Result",
                "type": "output",
                "position": {"x": 300, "y": 700},
                "config": {
                    "response_template": {
                        "claim_status": "authorized",
                        "approval_details": "{node_approval.comment}",
                        "approved_by": "{node_approval.decided_by}",
                        "settlement_audit": "Payout logged in compliance ledger.",
                    }
                },
            },
        ],
        "edges": [
            {
                "id": "e_trigger_extract",
                "source_node_id": "node_webhook",
                "target_node_id": "node_extract",
            },
            {
                "id": "e_extract_condition",
                "source_node_id": "node_extract",
                "target_node_id": "node_condition",
            },
            {
                "id": "e_condition_approval",
                "source_node_id": "node_condition",
                "source_handle": "high_value",
                "target_node_id": "node_approval",
            },
            {
                "id": "e_approval_transform",
                "source_node_id": "node_approval",
                "target_node_id": "node_transform",
            },
            {
                "id": "e_condition_standard",
                "source_node_id": "node_condition",
                "source_handle": "standard_value",
                "target_node_id": "node_transform",
            },
            {
                "id": "e_transform_output",
                "source_node_id": "node_transform",
                "target_node_id": "node_output",
            },
        ],
        "default_timeout_seconds": 3600,
    }

    # Validate WF2 definition
    val2 = validate_workflow_graph(WorkflowDefinition.model_validate(wf2_definition))
    assert val2.is_valid, f"WF2 validation failed: {[e.message for e in val2.errors]}"

    wf2 = db.scalar(select(Workflow).where(Workflow.name == wf2_name))
    if not wf2:
        wf2 = Workflow(
            name=wf2_name,
            description=wf2_desc,
            is_active=True,
            draft_definition=wf2_definition,
        )
        db.add(wf2)
        db.flush()
    else:
        wf2.description = wf2_desc
        wf2.draft_definition = wf2_definition

    # Ensure published Version 1
    v2 = db.scalar(select(WorkflowVersion).where(WorkflowVersion.workflow_id == wf2.id, WorkflowVersion.version_number == 1))
    if not v2:
        checksum2 = compute_definition_checksum(wf2_definition)
        v2 = WorkflowVersion(
            workflow_id=wf2.id,
            version_number=1,
            definition=wf2_definition,
            checksum=checksum2,
            changelog="Initial production release (Human-in-the-loop)",
        )
        db.add(v2)

    print(f"Created/Updated Workflow 2 (With Human Approval): {wf2.name} (ID: {wf2.id})")

    db.commit()
    print("All workflows successfully seeded and published!")


if __name__ == "__main__":
    session = SessionLocal()
    try:
        seed_knowledge_base(session)
        seed_workflows(session)
    finally:
        session.close()
