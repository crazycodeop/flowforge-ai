# ADR 0001: PostgreSQL as Single Source of Truth

## Context
Workflow orchestration systems require reliable persistence of execution states, inputs, outputs, audit logs, and approval events. In distributed environments, relying solely on in-memory brokers, message queues, or Celery task result backends risks data loss, split-brain states, and inconsistency.

## Decision
We designate PostgreSQL as the sole authoritative source of truth for all persistent state in FlowForge AI:
- Workflow definitions and immutable versions
- Run records and step-level state machines
- Attempt logs, error details, and output payloads
- Append-only execution audit events
- Human approval requests and decisions

Redis will serve strictly as a transient task broker and ephemeral coordination mechanism (such as rate limits and short-term locks), never as durable state storage.

## Consequences
- Positive: Consistent relational guarantees, acid transactions for state transitions, full auditability, simple backup/restore, reliable queryability for inspection dashboards.
- Negative: Need to ensure database queries are indexed and connection pools are managed properly to avoid contention during high-throughput step executions.
