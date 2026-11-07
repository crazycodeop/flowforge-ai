"""
Creates and publishes the 3rd workflow:
'Intelligent Incident Triage & SLA Router' (Conditional Branching DAG).
"""

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.workflow import Workflow, WorkflowVersion, compute_definition_checksum
from app.schemas.workflow import WorkflowDefinition
from app.workflows.validation import validate_workflow_graph


def create_conditional_workflow():
    db = SessionLocal()
    try:
        wf_name = "Intelligent Incident Triage & SLA Router"
        wf_desc = (
            "Automated conditional routing pipeline that classifies incident severity with AI, "
            "branching into an urgent P0 SRE War Room escalation on Critical (True), "
            "or a Standard Helpdesk Pool queue on Normal (False)."
        )

        wf_definition = {
            "schema_version": "1.0.0",
            "name": wf_name,
            "description": wf_desc,
            "nodes": [
                {
                    "id": "node_webhook",
                    "name": "Incident Alert Webhook",
                    "type": "trigger",
                    "position": {"x": 300, "y": 50},
                    "config": {"trigger_type": "api"},
                },
                {
                    "id": "node_classify",
                    "name": "AI Severity Classifier",
                    "type": "ai_classify",
                    "position": {"x": 300, "y": 170},
                    "config": {
                        "prompt_template": "Classify incoming system incident trace: {run_input.ticket_text}",
                        "categories": ["critical", "standard"],
                        "temperature": 0.0,
                    },
                },
                {
                    "id": "node_condition",
                    "name": "Evaluate Severity (Critical vs Standard)",
                    "type": "condition",
                    "position": {"x": 300, "y": 300},
                    "config": {
                        "branches": [
                            {
                                "branch_name": "true",
                                "operator": "equals",
                                "field_path": "upstream_outputs.node_classify.category",
                                "value": "critical",
                            }
                        ],
                        "default_branch": "false",
                    },
                },
                {
                    "id": "node_p0_escalation",
                    "name": "P0 War Room & SRE Pager Alert",
                    "type": "transform",
                    "position": {"x": 100, "y": 440},
                    "config": {
                        "mapping_rules": {
                            "tier": "P0_CRITICAL",
                            "action": "page_oncall_sre",
                            "slack_channel": "#incident-war-room",
                        },
                    },
                },
                {
                    "id": "node_p0_output",
                    "name": "Critical Escalation Result",
                    "type": "output",
                    "position": {"x": 100, "y": 570},
                    "config": {
                        "response_template": {
                            "status": "escalated_p0",
                            "sla_response_time": "15_minutes",
                            "routing": "on_call_sre_dispatched",
                            "incident_tier": "critical",
                        },
                    },
                },
                {
                    "id": "node_standard_dispatch",
                    "name": "Standard Queue Triage",
                    "type": "transform",
                    "position": {"x": 500, "y": 440},
                    "config": {
                        "mapping_rules": {
                            "tier": "P2_STANDARD",
                            "action": "enqueue_helpdesk",
                            "queue": "general_support",
                        },
                    },
                },
                {
                    "id": "node_standard_output",
                    "name": "Standard Resolution Result",
                    "type": "output",
                    "position": {"x": 500, "y": 570},
                    "config": {
                        "response_template": {
                            "status": "queued_standard",
                            "sla_response_time": "24_hours",
                            "routing": "assigned_to_support_pool",
                            "incident_tier": "standard",
                        },
                    },
                },
            ],
            "edges": [
                {
                    "id": "e_webhook_classify",
                    "source_node_id": "node_webhook",
                    "target_node_id": "node_classify",
                },
                {
                    "id": "e_classify_condition",
                    "source_node_id": "node_classify",
                    "target_node_id": "node_condition",
                },
                {
                    "id": "e_condition_p0",
                    "source_node_id": "node_condition",
                    "source_handle": "true",
                    "target_node_id": "node_p0_escalation",
                },
                {
                    "id": "e_p0_out",
                    "source_node_id": "node_p0_escalation",
                    "target_node_id": "node_p0_output",
                },
                {
                    "id": "e_condition_standard",
                    "source_node_id": "node_condition",
                    "source_handle": "false",
                    "target_node_id": "node_standard_dispatch",
                },
                {
                    "id": "e_std_out",
                    "source_node_id": "node_standard_dispatch",
                    "target_node_id": "node_standard_output",
                },
            ],
            "default_timeout_seconds": 3600,
        }

        # 1. Validate Graph
        val = validate_workflow_graph(WorkflowDefinition.model_validate(wf_definition))
        assert val.is_valid, f"Validation failed: {[e.message for e in val.errors]}"

        # 2. Upsert Workflow
        wf = db.scalar(select(Workflow).where(Workflow.name == wf_name))
        if not wf:
            wf = Workflow(
                name=wf_name,
                description=wf_desc,
                is_active=True,
                draft_definition=wf_definition,
            )
            db.add(wf)
            db.flush()
        else:
            wf.description = wf_desc
            wf.draft_definition = wf_definition

        # 3. Publish Version 1
        v1 = db.scalar(
            select(WorkflowVersion).where(
                WorkflowVersion.workflow_id == wf.id, WorkflowVersion.version_number == 1
            )
        )
        if not v1:
            checksum = compute_definition_checksum(wf_definition)
            v1 = WorkflowVersion(
                workflow_id=wf.id,
                version_number=1,
                definition=wf_definition,
                checksum=checksum,
                changelog="Initial production release (Conditional Branching DAG)",
            )
            db.add(v1)

        db.commit()
        print(f"Successfully created & published conditional workflow: {wf.name} (ID: {wf.id})")
    finally:
        db.close()


if __name__ == "__main__":
    create_conditional_workflow()
