# FlowForge AI — Database Design & Schema Specification

## 1. Relational Entity Schema

FlowForge AI uses PostgreSQL as the single persistent source of truth. All tables use UUID primary keys and timestamped tracking columns.

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ WORKFLOWS : owns
    WORKFLOWS ||--o{ WORKFLOW_VERSIONS : versioned_as
    WORKFLOWS ||--o{ WORKFLOW_RUNS : executes
    WORKFLOW_VERSIONS ||--o{ WORKFLOW_RUNS : references
    WORKFLOW_RUNS ||--o{ STEP_RUNS : contains
    WORKFLOW_RUNS ||--o{ EXECUTION_EVENTS : streams
    WORKFLOW_RUNS ||--o{ APPROVAL_REQUESTS : pauses_for
    ORGANIZATIONS ||--o{ KNOWLEDGE_COLLECTIONS : contains
    KNOWLEDGE_COLLECTIONS ||--o{ KNOWLEDGE_DOCUMENTS : stores

    WORKFLOWS {
        string id PK
        string organization_id FK
        string name
        text description
        jsonb draft_definition
        datetime created_at
        datetime updated_at
    }

    WORKFLOW_VERSIONS {
        string id PK
        string workflow_id FK
        int version_number
        jsonb definition
        string checksum "SHA-256"
        string changelog
        datetime published_at
    }

    WORKFLOW_RUNS {
        string id PK
        string organization_id FK
        string workflow_id FK
        string workflow_version_id FK
        string status
        jsonb input_payload
        jsonb output_payload
        text error_message
        int total_tokens
        float total_cost_usd
        string idempotency_key
        string idempotency_hash
        datetime started_at
        datetime completed_at
    }

    STEP_RUNS {
        string id PK
        string workflow_run_id FK
        string node_id
        string node_type
        string status
        int attempt_count
        string worker_lease_id
        datetime lease_expires_at
        datetime heartbeat_at
        jsonb output_data
        jsonb error_details
        int prompt_tokens
        int completion_tokens
        float cost_usd
    }

    EXECUTION_EVENTS {
        string id PK
        string workflow_run_id FK
        string step_run_id FK
        string event_type
        jsonb payload
        datetime created_at
    }
```

---

## 2. Key Database Constraints & Performance Indexes

1. **Version Immutability**:
   - `uq_workflow_version_number (workflow_id, version_number)`: Guarantees sequential version numbering per workflow.
   - Published `WorkflowVersion` records are never updated in place; updates require creating a new version.

2. **Step Execution Uniqueness**:
   - `uq_step_run_workflow_node (workflow_run_id, node_id)`: Enforces that exactly one `StepRun` record exists per DAG node within a given workflow run.

3. **Tenant Indexing**:
   - `idx_workflows_organization_id`: Fast tenant scoping for workflow catalogs.
   - `idx_workflow_runs_organization_id`: Instant scoping for runs and monitoring dashboards.

4. **Distributed Lease Queries**:
   - `idx_step_runs_lease_expires_at`: Indexed timestamp enabling rapid $O(\log N)$ recovery scans for expired zombie leases.
