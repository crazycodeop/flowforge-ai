# Agent Guidelines for FlowForge AI

FlowForge AI is a visual workflow orchestration platform that designs, executes, monitors, and evaluates reliable AI-powered workflows.

## Core Directives
1. **Incremental Milestone Delivery**: Strictly follow the milestone progression defined in `PROJECT_SPEC.md` and `TASK_LOG.md`. Complete one milestone, run tests, update context documentation, and stop for user review. Never jump ahead.
2. **Context Efficiency**:
   - At the beginning of each task, read `AGENTS.md` and `TASK_LOG.md`.
   - Read `PROJECT_SPEC.md` and `PROJECT_CONTEXT.md` only as needed.
   - Do not perform full repository scans or repeat full architecture dumps.
3. **Correctness & Reliability Over Features**:
   - PostgreSQL is the source of truth for workflow definitions, versions, run states, step states, attempts, and audit events.
   - Redis and Celery handle asynchronous task dispatch and broker communication; they are not the persistent state store.
   - Every state transition must be validated through the explicit state machine.
   - Every AI output must be strictly validated with Pydantic schemas. Untrusted model responses must never dictate system privileges or bypass security checks.
   - Published workflow versions are immutable.
4. **Code Quality & Standards**:
   - Backend: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Celery, Ruff, Pytest.
   - Frontend: React (plain JavaScript with JSDoc, Vite, React Flow, React Router). Never convert to TypeScript.
   - Testing: Unit and integration tests for every milestone, including failure injection, concurrency safeguards, and edge cases.
   - Security: Enforce ownership checks on all endpoints, sanitize logs, prevent arbitrary code execution, and parameterize database queries.
5. **No Fake Work**:
   - Do not commit mock success data in production application paths.
   - Verify every implementation with actual tests and real commands. Record real test outputs in `TASK_LOG.md`.
