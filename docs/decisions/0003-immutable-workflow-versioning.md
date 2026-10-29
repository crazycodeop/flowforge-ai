# ADR 0003: Immutable Published Workflow Versions

## Context
Workflows evolve over time. If a user modifies a workflow while active runs are in-flight or if historical runs point to a mutable definition, execution becomes non-deterministic and debugging becomes impossible.

## Decision
We enforce an explicit separation between workflow drafts and published versions:
- Editing a workflow mutates only its draft definition.
- Publishing validates the graph (DAG validation, schema checks) and creates an immutable, sequentially incremented `workflow_versions` row.
- Every workflow run references a specific `workflow_version_id`.
- Modifying a draft or publishing a new version never alters existing or in-flight runs.

## Consequences
- Positive: Guaranteed reproducibility, safe edits without breaking production workloads, reliable audit trails.
- Negative: Storage requirement for multiple version records (negligible given structured JSON definitions).
