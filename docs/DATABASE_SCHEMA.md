# FlowForge AI — Database Schema & Data Models

## 1. Relational Entity Relationship Diagram (ERD)

All operational and analytical data in FlowForge AI is persisted in PostgreSQL. The relational schema is managed with SQLAlchemy 2.0 ORM and versioned via Alembic migrations.

```mermaid
erDiagram
    organizations ||--o{ users : "employs"
    organizations ||--o{ workflows : "owns"
    workflows ||--o{ workflow_versions : "versions"
    workflows ||--o{ runs : "instantiates"
    workflow_versions ||--o{ runs : "executes"
    runs ||--o{ step_executions : "contains"
    step_executions ||--o{ execution_attempts : "retries"
    runs ||--o{ approval_requests : "requires"
    runs ||--o{ audit_events : "logs"

    organizations {
        uuid id PK
        string name
        string slug
        timestamp created_at
    }

    users {
        uuid id PK
        uuid organization_id FK
        string email
        string hashed_password
        string role
        boolean is_active
        timestamp created_at
    }

    workflows {
        uuid id PK
        uuid organization_id FK
        string name
        string description
        string status
        jsonb definition
        integer current_version
        timestamp created_at
        timestamp updated_at
    }

    workflow_versions {
        uuid id PK
        uuid workflow_id FK
        integer version_number
        jsonb definition_snapshot
        string changelog
        timestamp created_at
    }

    runs {
        uuid id PK
        uuid workflow_id FK
        uuid workflow_version_id FK
        uuid organization_id FK
        string status
        jsonb input_data
        jsonb output_data
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }

    step_executions {
        uuid id PK
        uuid run_id FK
        string step_id
        string step_type
        string status
        jsonb input_data
        jsonb output_data
        string error_message
        timestamp started_at
        timestamp completed_at
    }

    execution_attempts {
        uuid id PK
        uuid step_execution_id FK
        integer attempt_number
        string status
        jsonb output_data
        string error_message
        float duration_seconds
        timestamp created_at
    }

    approval_requests {
        uuid id PK
        uuid run_id FK
        uuid step_execution_id FK
        string required_role
        string status
        string decided_by
        text notes
        timestamp decided_at
        timestamp created_at
    }

    audit_events {
        uuid id PK
        uuid run_id FK
        uuid organization_id FK
        string event_type
        string actor_type
        string actor_id
        jsonb payload
        timestamp created_at
    }
```

---

## 2. Table Specifications & Indexing Strategy

### `workflows` & `workflow_versions`
- **Immutability Guarantee**: When a workflow is published, a row is inserted into `workflow_versions` storing a full JSONB snapshot of `definition`. The `workflow_versions` table has a unique index on `(workflow_id, version_number)`. Draft modifications alter `workflows.definition` without affecting existing versions.
- **Indexes**: `ix_workflows_organization_id`, `ix_workflow_versions_workflow_id`.

### `runs`
- **State Enforcement**: Tracks lifecycle status (`PENDING`, `RUNNING`, `PAUSED`, `SUCCEEDED`, `FAILED`, `CANCELED`).
- **Indexes**: `ix_runs_workflow_id`, `ix_runs_organization_id`, `ix_runs_status`.

### `step_executions` & `execution_attempts`
- **Step Level Auditing**: Records input and output payloads for every node in the DAG, enabling deep trace inspection in Studio and execution playback.
- **Retry Auditing**: `execution_attempts` logs duration, error stack traces, and attempt count for resilient exponential backoff monitoring.
- **Indexes**: `ix_step_executions_run_id`, `ix_execution_attempts_step_execution_id`.

### `approval_requests`
- **Governance**: Persists pending review gates, required roles, and resolution commentary (`APPROVED`, `REJECTED`, `EXPIRED`).
- **Indexes**: `ix_approval_requests_run_id`, `ix_approval_requests_status`.
