# FlowForge AI — Architecture Decision Records (ADRs)

## ADR-001: Asynchronous Execution via Celery & Redis vs Synchronous In-Process Execution

### Status
Accepted

### Context
Workflows involve multiple LLM calls, vector searches, and API integrations that take between 1 and 30 seconds. Synchronous execution in FastAPI web workers ties up worker threads and starves connection pools.

### Decision
Use Celery backed by Redis for asynchronous DAG scheduling. The API immediately returns `202 Accepted` with a workflow run UUID, allowing clients to poll status or receive SSE event updates.

### Consequences
- **Positive**: Web API remains sub-40ms responsive under heavy load. Workers can be scaled horizontally.
- **Trade-off**: Requires running a separate Redis broker and Celery worker process.

---

## ADR-002: PostgreSQL as Single Source of Truth vs Redis State Storage

### Status
Accepted

### Context
Workflow definitions, execution states, and audit trails must persist through worker crashes and server restarts.

### Decision
Store all persistent workflow definitions, versions, run states, step attempt leases, and audit events in PostgreSQL. Redis is used strictly as a transient message broker and Celery task result carrier.

### Consequences
- **Positive**: ACID transactions, relational integrity, foreign key cascades, and durable audit logs.
- **Trade-off**: Requires careful connection pooling (`sslmode=require`, `pool_recycle=300`) to respect database connection limits.

---

## ADR-003: Immutable Published Workflow Versions

### Status
Accepted

### Context
If a workflow definition is modified while previous runs are in flight or being audited, results can become non-reproducible.

### Decision
Published workflow versions are strictly immutable and assigned sequential version numbers and SHA-256 checksums. Editing a workflow only updates the `draft_definition`. Executions always bind to an explicit version snapshot.

### Consequences
- **Positive**: Guaranteed reproducibility, compliance auditability, and zero mid-flight contract drift.
- **Trade-off**: Requires explicit publish actions by builders.
