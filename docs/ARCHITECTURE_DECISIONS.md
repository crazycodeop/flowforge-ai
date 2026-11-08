# FlowForge AI — Architecture Decision Records (ADRs)

This document outlines key technical decisions made during the design and evolution of FlowForge AI, including context, trade-offs, and rejected alternatives.

---

## ADR 01: Dual Applications (Studio vs. Portal) on a Single Backend

- **Status**: Accepted & Implemented
- **Context**: Non-technical business users were confused by graph canvases, node inspectors, JSON schemas, and field references (`upstream_outputs.node_1.amount`). Developers needed full control over node configs, prompts, and topological routing.
- **Decision**: Create two distinct user experiences sharing a unified FastAPI backend:
  1. **FlowForge Studio**: Developer/admin visual graph designer at `/workflows/:id/builder`.
  2. **FlowForge Portal**: Stakeholder self-service hub at `/portal/*` featuring dynamic forms, natural language input, stage timelines, and approval queues.
- **Consequences**:
  - *Positive*: Perfect separation of concerns. Developers can design complex architectures without overwhelming business users.
  - *Negative*: Two frontend navigation layouts must be maintained within the single Vite application.

---

## ADR 02: Contract-Driven Input Architecture vs. Raw JSON Ingestion

- **Status**: Accepted & Implemented
- **Context**: Previously, workflow triggers expected raw, unvalidated JSON dictionaries without client-facing metadata, forcing users to know internal property names.
- **Decision**: Introduce a formal `input_contract` definition inside `WorkflowDefinition`:
  - Each workflow specifies an array of `InputFieldDefinition` objects: `key`, `label`, `type` (`text`, `number`, `boolean`, `select`, `multiline`, `email`), `required`, `default_value`, `options`, `placeholder`.
  - The Portal dynamically renders clean HTML input elements based on this contract.
  - An LLM-powered parser (`POST /api/v1/portal/workflows/{id}/parse-nl`) maps natural language prompts into this contract.
- **Consequences**:
  - *Positive*: Self-documenting workflows, zero JSON syntax errors for users, seamless AI field extraction.
  - *Negative*: Developers must configure fields during workflow design.

---

## ADR 03: PostgreSQL as the Single Persistent State Store

- **Status**: Accepted & Implemented
- **Context**: Distributed workflow engines often split state between Redis, document stores, and relational databases, risking state desynchronization.
- **Decision**: PostgreSQL is the sole source of truth for workflow definitions, versions, run states, step executions, attempts, and audit events. Redis is strictly utilized as a volatile message broker for Celery task queuing.
- **Consequences**:
  - *Positive*: ACID guarantees, foreign key integrity, unified backup and disaster recovery, auditable state history.
  - *Negative*: Worker execution requires frequent DB transactions to record step state transitions.

---

## ADR 04: Immutable Published Versions

- **Status**: Accepted & Implemented
- **Context**: Modifying a workflow in draft while past runs are executing or being reviewed can cause runtime errors or invalidate historical audit trails.
- **Decision**: Workflow definitions can be edited freely in draft mode. When published, an immutable snapshot is copied to the `workflow_versions` table with an incremented version number (`v1`, `v2`, etc.). Runs always execute against a specific immutable version snapshot.
- **Consequences**:
  - *Positive*: Complete auditability, deterministic execution replay, protection against breaking changes during in-flight runs.
  - *Negative*: Minor storage duplication for version snapshots.

---

## ADR 05: Explicit Two-Tier State Machine

- **Status**: Accepted & Implemented
- **Context**: Unstructured workflow status strings frequently lead to invalid transitions (e.g., executing a canceled run, or completing a step that never started).
- **Decision**: Implement two explicit, mathematically verified state machines with strictly enforced transition matrices:
  1. `RunStatus`: `PENDING` -> `RUNNING` -> `SUCCEEDED` / `FAILED` / `PAUSED` / `CANCELED`.
  2. `StepStatus`: `PENDING` -> `RUNNING` -> `SUCCEEDED` / `FAILED` / `SKIPPED` / `PAUSED`.
  Any invalid transition raises an explicit `StateTransitionError`.
- **Consequences**:
  - *Positive*: Bulletproof concurrency safeguards, predictable task lifecycle, clean pause/resume semantics for human approval gates.
  - *Negative*: Developers must explicitly handle state transition guards in all test fixtures and worker runners.

---

## ADR 06: React Flow Named Handle Architecture for Condition Nodes

- **Status**: Accepted & Implemented
- **Context**: Condition nodes require dual outgoing paths (True and False branches). Previous implementations used duplicate or generic handles, leading to overlapping handles and disconnected edges.
- **Decision**: In `CustomNode.jsx`, condition nodes render two distinct, named source handles:
  - `id="true"` with green accent (`#059669`) on the bottom-left.
  - `id="false"` with red accent (`#dc2626`) on the bottom-right.
  In `Builder.jsx`, edge connections automatically map source handles based on user selection or default to `"true"`, ensuring clean, non-floating visual routing.
- **Consequences**:
  - *Positive*: Visually intuitive branching with zero edge ambiguity.
  - *Negative*: Condition nodes have a distinct handle configuration compared to single-output nodes.
