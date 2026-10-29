# ADR 0002: Celery and Redis for Asynchronous Background Execution

## Context
Workflow steps can be time-consuming (e.g. LLM API calls, retrieval, multi-step branching). Executing these within synchronous HTTP request lifecycles blocks API threads, risks HTTP connection timeouts, and impairs scalability.

## Decision
We decouple API request handling from workflow execution using Celery workers with Redis as the message broker.
- When a run is initiated via `/api/v1/workflows/{id}/runs`, the API validates the input, enforces idempotency, creates initial `workflow_runs` and `step_runs` records in PostgreSQL, enqueues the execution task in Celery, and responds with HTTP 202 and the run metadata.
- Celery workers pick up the task, orchestrate step execution in the background, update PostgreSQL step statuses, and handle retry scheduling.

## Consequences
- Positive: Fast API response times, horizontal worker scaling, isolated worker failure domains, resilient background retries.
- Negative: Additional operational requirement for running Celery workers alongside the API server.
