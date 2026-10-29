from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeCollection, KnowledgeDocument
from app.models.workflow import Workflow, WorkflowVersion, compute_definition_checksum

FLAGSHIP_WORKFLOW_NAME = "Flagship: Customer Support Triage & Policy Engine"
COLLECTION_NAME = "support_policies"


def seed_flagship_knowledge_base(db: Session) -> KnowledgeCollection:
    """Seeds official FlowForge support policies and guidelines for retrieval."""
    collection = db.scalar(
        select(KnowledgeCollection).where(KnowledgeCollection.name == COLLECTION_NAME)
    )
    if not collection:
        collection = KnowledgeCollection(
            name=COLLECTION_NAME,
            description="Official customer support policies, SLA guidelines, and refund requirements.",
        )
        db.add(collection)
        db.flush()

    # Check if documents already exist
    existing_count = db.scalar(
        select(KnowledgeDocument).where(KnowledgeDocument.collection_id == collection.id)
    )
    if not existing_count:
        doc1 = KnowledgeDocument(
            collection_id=collection.id,
            title="Billing & Refund Policy",
            content=(
                "FlowForge AI Refund Guidelines:\n"
                "Refund requests submitted within 30 days of transaction are eligible for full reimbursement "
                "provided account usage is under 1,000 workflow executions.\n\n"
                "Refunds exceeding $100.00 require human financial approval.\n\n"
                "Chargeback inquiries must immediately freeze automated card renewals until billing reconciliation is finalized."
            ),
            doc_metadata={"policy_code": "POL-BILL-001", "department": "Finance"},
        )
        doc2 = KnowledgeDocument(
            collection_id=collection.id,
            title="Technical Incident Escalation SLA",
            content=(
                "Technical Escalation Protocol:\n"
                "System crashes, unhandled worker lease failures, and database connection timeouts are designated P0 critical incidents.\n\n"
                "On-call engineers must be alerted within 15 minutes of consecutive Celery task timeouts.\n\n"
                "Non-blocking client integration questions receive standard support triage within 24 business hours."
            ),
            doc_metadata={"policy_code": "POL-TECH-002", "department": "Engineering"},
        )
        doc3 = KnowledgeDocument(
            collection_id=collection.id,
            title="Security & Account Access Protocol",
            content=(
                "Security & Privacy Compliance:\n"
                "Any notification indicating compromised API keys or unauthorized access mandates immediate session revocation.\n\n"
                "Customer Personally Identifiable Information (PII) must be masked in audit timeline outputs."
            ),
            doc_metadata={"policy_code": "POL-SEC-003", "department": "Security"},
        )
        db.add_all([doc1, doc2, doc3])
        db.commit()

    return collection


def get_flagship_workflow_definition() -> dict[str, Any]:
    """Returns the production-grade DAG definition for support-ticket triage."""
    return {
        "version": "1.0",
        "nodes": [
            {
                "id": "node_webhook",
                "name": "Customer Support Webhook",
                "type": "trigger",
                "config": {"trigger_type": "api"},
            },
            {
                "id": "node_classify_ticket",
                "name": "AI Intent Classifier",
                "type": "ai_classify",
                "config": {
                    "prompt_template": "Classify incoming support request: {run_input.ticket_text}",
                    "categories": ["billing", "technical", "general"],
                    "temperature": 0.0,
                },
            },
            {
                "id": "node_policy_retrieval",
                "name": "Policy Knowledge Retrieval",
                "type": "retrieval",
                "config": {
                    "collection_name": COLLECTION_NAME,
                    "query_template": "{node_classify_ticket.category} policy: {run_input.ticket_text}",
                    "top_k": 2,
                    "score_threshold": 0.15,
                },
            },
            {
                "id": "node_extract_fields",
                "name": "Structured Ticket Extractor",
                "type": "structured_extract",
                "config": {
                    "prompt_template": "Extract structured customer information from: {run_input.ticket_text}",
                    "schema_definition": {
                        "type": "object",
                        "properties": {
                            "customer_id": {"type": "string"},
                            "email": {"type": "string"},
                            "issue_summary": {"type": "string"},
                            "priority": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                        },
                        "required": ["email", "priority"],
                    },
                },
            },
            {
                "id": "node_route_condition",
                "name": "Priority Route",
                "type": "condition",
                "config": {
                    "branches": [
                        {
                            "branch_name": "billing_branch",
                            "operator": "equals",
                            "field_path": "upstream_outputs.node_classify_ticket.category",
                            "value": "billing",
                        }
                    ],
                    "default_branch": "standard_branch",
                },
            },
            {
                "id": "node_assemble_response",
                "name": "Resolution Response Synthesizer",
                "type": "output",
                "config": {
                    "response_template": {
                        "category": "{node_classify_ticket.category}",
                        "confidence": "{node_classify_ticket.confidence}",
                        "extracted_details": "{node_extract_fields.extracted}",
                        "applicable_policies": "{node_policy_retrieval.passages}",
                        "policy_sources": "{node_policy_retrieval.sources}",
                        "status": "triaged",
                    }
                },
            },
        ],
        "edges": [
            {
                "id": "e_trigger_classify",
                "source_node_id": "node_webhook",
                "target_node_id": "node_classify_ticket",
            },
            {
                "id": "e_classify_retrieval",
                "source_node_id": "node_classify_ticket",
                "target_node_id": "node_policy_retrieval",
            },
            {
                "id": "e_retrieval_extract",
                "source_node_id": "node_policy_retrieval",
                "target_node_id": "node_extract_fields",
            },
            {
                "id": "e_extract_condition",
                "source_node_id": "node_extract_fields",
                "target_node_id": "node_route_condition",
            },
            {
                "id": "e_condition_output",
                "source_node_id": "node_route_condition",
                "target_node_id": "node_assemble_response",
            },
        ],
    }


def create_or_update_flagship_workflow(db: Session) -> Workflow:
    """Creates and publishes the flagship customer-support triage workflow."""
    seed_flagship_knowledge_base(db)

    workflow = db.scalar(select(Workflow).where(Workflow.name == FLAGSHIP_WORKFLOW_NAME))
    definition = get_flagship_workflow_definition()
    checksum = compute_definition_checksum(definition)

    if not workflow:
        workflow = Workflow(
            name=FLAGSHIP_WORKFLOW_NAME,
            description="End-to-end intelligent triage, knowledge retrieval, and policy routing for customer support.",
            draft_definition=definition,
        )
        db.add(workflow)
        db.flush()

        version = WorkflowVersion(
            workflow_id=workflow.id,
            version_number=1,
            definition=definition,
            checksum=checksum,
            changelog="Initial publication of flagship customer support workflow.",
        )
        db.add(version)
        db.commit()
    else:
        # Check if version exists
        existing_version = db.scalar(
            select(WorkflowVersion).where(
                WorkflowVersion.workflow_id == workflow.id,
                WorkflowVersion.checksum == checksum,
            )
        )
        if not existing_version:
            max_v = (
                db.scalar(
                    select(WorkflowVersion.version_number)
                    .where(WorkflowVersion.workflow_id == workflow.id)
                    .order_by(WorkflowVersion.version_number.desc())
                )
                or 0
            )
            version = WorkflowVersion(
                workflow_id=workflow.id,
                version_number=max_v + 1,
                definition=definition,
                checksum=checksum,
                changelog=f"Updated flagship definition to revision {max_v + 1}",
            )
            db.add(version)
            db.commit()

    return workflow
