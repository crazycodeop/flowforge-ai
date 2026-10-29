# FlowForge AI — Staff Engineer System Design Interview Guide

This guide prepares software engineers and architects to defend the design, concurrency, security, and scalability choices of FlowForge AI in technical interviews.

---

## 1. Core System Design Questions

### Q1: Walk me through the end-to-end request lifecycle when a user runs a workflow.
**Answer**:
1. **Ingestion**: The client submits a `POST /api/v1/workflows/{id}/runs` request containing the input payload, an optional `Idempotency-Key`, and authentication headers (`Bearer <token>` and `X-Organization-ID`).
2. **Authorization & Tenant Resolution**: FastAPI middleware validates the JWT, checks that the user is an active member of the tenant organization, and verifies their role has `builder` permissions.
3. **Idempotency & Record Creation**: The API queries PostgreSQL for an existing run matching the idempotency hash. If none exists, it persists a new `WorkflowRun` in `PENDING` status, binding it to the workflow's latest immutable `WorkflowVersion`.
4. **Asynchronous Dispatch**: The gateway enqueues `execute_workflow_task.delay(run_id)` into Upstash Redis and returns `202 Accepted` to the client in `<40ms`.
5. **Worker Execution**: A Celery worker consumes the task, transitions the run to `RUNNING`, and iterates through the DAG. Ready nodes are identified using topological sort.
6. **Step Execution & Guardrails**: For each ready node, the worker claims a `worker_lease_id` with an expiration TTL, executes the node (e.g. calling Groq LPU with temperature=0 and JSON schema validation), logs token costs to `execution_events`, and advances the step to `SUCCEEDED`.
7. **Human Governance / Completion**: If an approval condition triggers, execution pauses safely and creates an `ApprovalRequest`. Otherwise, once all nodes finish, the run transitions to `SUCCEEDED`.

---

### Q2: How do you handle worker crashes mid-workflow execution without duplicate side effects?
**Answer**:
We use **Distributed Worker Leases** combined with **Zombie Recovery**:
- Every step execution acquires a lease with an explicit `lease_expires_at` timestamp.
- The executing worker emits periodic heartbeats to extend this lease.
- If the worker process suffers an unhandled termination (e.g. OOM killer or network partition), the heartbeat ceases and the lease expires.
- A background recovery sweeper scans for `RUNNING` steps where `lease_expires_at < NOW()`.
- Expired steps are transitioned to `RETRY_WAIT` and their attempt counter is incremented.
- Downstream actions implement idempotency keys, preventing duplicate external side-effects when the node is retried by another worker.

---

### Q3: Why did you choose Celery and Redis over synchronous execution or background threads?
**Answer**:
- **Connection Starvation**: LLM inferences take 500ms to 5+ seconds. Executing them inside synchronous FastAPI worker threads would quickly exhaust web concurrency pools under even modest concurrency.
- **Independent Elasticity**: Task queues decouple request ingestion from execution. We can scale web gateways (optimized for fast I/O) and Celery workers (optimized for CPU/network throughput) independently.
- **Resilience**: If a web server restarts during a deployment, in-flight background threads are killed. With Redis-backed Celery, tasks remain safely buffered in the persistent queue until consumed by a live worker.

---

### Q4: How is tenant isolation enforced in a multi-tenant shared database?
**Answer**:
We employ a **Defense-in-Depth** strategy:
1. **Header & Context Resolution**: The `get_tenant_context` dependency extracts `X-Organization-ID` and validates that the authenticated user possesses an active `OrganizationMember` record for that tenant.
2. **Relational Indexing**: Every resource table (`workflows`, `workflow_runs`, `approval_requests`, `knowledge_collections`) contains an indexed `organization_id` column.
3. **Query Scoping**: All database queries explicitly filter by `organization_id`. Attempting to access an entity belonging to another tenant raises an immediate `403 Forbidden`.
4. **Foreign Key Cascades**: Deleting an organization cascades cleanly to its owned workflows and runs, preventing orphan records or cross-tenant data leaks.

---

### Q5: LLMs are non-deterministic. How does FlowForge AI ensure reliability for enterprise clients?
**Answer**:
1. **Zero Temperature**: All programmatic model inferences enforce `temperature=0.0`.
2. **Deterministic Guardrails**: AI outputs are parsed through regex extraction and strictly validated against Pydantic models. Missing fields or type errors trigger immediate bounded retry or fallback rather than propagating corrupted data.
3. **Semantic Grounding**: AI drafting nodes retrieve authoritative policies from vector knowledge stores and inject them into prompt context as verified grounding evidence.
4. **Human-in-the-Loop Thresholds**: Sensitive actions (such as disbursements or refund requests > $50) are gated by deterministic conditions that pause the workflow for human approval before execution resumes.
5. **Continuous Evaluation**: Workflows are benchmarked against golden test datasets using the built-in evaluation suite to catch regression in accuracy, latency, and token cost before production release.

---

### Q6: How would you scale FlowForge AI to 10,000 executions per second?
**Answer**:
1. **Database Layer**: Transition from a single PostgreSQL instance to read-replicas for query traffic (`GET /runs`, `/workflows`), sharding the `step_runs` and `execution_events` tables horizontally by `organization_id` using Citus or CockroachDB.
2. **Broker Layer**: Replace single Redis broker with a distributed Kafka or RabbitMQ cluster with partitioned topic queues per priority tier (e.g. `urgent`, `batch`).
3. **Worker Autoscaling**: Deploy Celery workers on Kubernetes (EKS/GKE) with KEDA (Kubernetes Event-driven Autoscaling) scaling worker pods dynamically based on queue lag.
4. **Caching & CDN**: Cache immutable published `WorkflowVersion` definitions in Redis/Cloudflare edge, eliminating repetitive database reads during DAG execution.
