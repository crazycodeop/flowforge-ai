# Project Context — FlowForge AI

## 1. Verified Environment & Tooling
- **OS**: Linux (x86_64 Ubuntu kernel)
- **Python**: 3.12.3 (`python3` available, `.venv` created and active with dependencies, `pip 26.2.2`)
- **Node.js**: v24.15.0 (`npm 11.12.1`)
- **Redis**: `/usr/bin/redis-server`, `/usr/bin/redis-cli` (active, running on localhost:6379, ping returned `PONG`)
- **PostgreSQL**: PostgreSQL 16 cluster initialized at `./pgdata` on port 5433 (`flowforge` and `flowforge_test` databases active)
- **Docker**: Dockerfile provided for backend and frontend; `docker-compose.yml` configured for multi-container orchestration.
- **Git**: Initialized on branch `main`.

## 2. Implemented Components
- **Backend Core**: `backend/app/core/config.py` (Pydantic v2 settings), `backend/app/core/database.py` (SQLAlchemy 2.x engine and SessionLocal), `backend/app/core/logging.py`
- **Database Models & Migrations**: `backend/app/models/system.py` (`SystemAudit`), `backend/app/models/workflow.py` (`Workflow`, `WorkflowVersion`), `backend/app/models/execution.py` (`WorkflowRun` with idempotency and token/cost metrics, `StepRun` with worker leases, latency, and token metrics, `ExecutionEvent`), Alembic revisions `166bf013a400`, `858411219fc0`, `18ed4ea11d51`, `12933d4a3599`, `2d9bbe02c3b4` applied to PostgreSQL.
- **Workflow & Node Registry**: `backend/app/nodes/base.py`, `backend/app/nodes/registry.py` (registry for 9 core node types), `backend/app/schemas/workflow.py` (Pydantic models for workflows, nodes, edges, retry policies, validation).
- **AI Runtime & Provider Abstraction**:
  - `backend/app/ai/base.py`: Provider interface with typed `LLMMessage`, `LLMUsage`, and `LLMResponse`.
  - `backend/app/ai/cost.py`: Per-model token pricing calculator (OpenAI, Groq, Anthropic, Mock).
  - `backend/app/ai/mock.py`: Deterministic mock provider for keyword classification and schema-valid extraction with latency/token simulation and failure injection.
  - `backend/app/ai/providers.py`: Universal `OpenAICompatibleProvider` with normalized HTTP error classification.
  - `backend/app/ai/validation.py`: JSON markdown code block stripper, classification category validator, and JSON Schema validator.
  - `backend/app/ai/factory.py`: `get_ai_provider` factory.
- **Execution Engine & Reliability**:
  - `backend/app/workflows/state_machine.py`: Explicit state machines for `WorkflowRun` and `StepRun` with validated transitions.
  - `backend/app/workflows/errors.py`: Error categorization (`TRANSIENT_NETWORK`, `RATE_LIMIT`, `MODEL_OUTPUT_INVALID`, `PERMANENT_VALIDATION`, etc.) and exponential backoff with full jitter formula.
  - `backend/app/workflows/context.py`: `ExecutionContext` with dot-path variable resolution (supporting explicit `upstream_outputs.` and `run_input.` prefixes) and template interpolation.
  - `backend/app/nodes/executors.py`: Deterministic and AI node executors (`TriggerExecutor`, `InputDataExecutor`, `TransformExecutor`, `ConditionExecutor`, `OutputExecutor`, `AIClassifyExecutor`, `StructuredExtractExecutor`).
  - `backend/app/workflows/scheduler.py`: Ready node resolver with backoff delay awareness and unselected branch skip cascading.
  - `backend/app/workflows/executor.py`: Authoritative execution orchestrator with worker leases, bounded retries, token/cost accumulation, latency measurement, and append-only audit event logging.
  - `backend/app/workflows/recovery.py`: Stale step recovery routine detecting expired leases and resuming execution without repeating successful upstream work.
- **Workers**: `backend/app/workers/celery_app.py` (Celery configured with Redis broker/backend), `backend/app/workers/tasks.py` (`ping_task`, `execute_workflow_task`).
- **API v1**: `backend/app/api/v1/health.py` (`/health`, `/ready`), `backend/app/api/v1/workflows.py` (node catalog, CRUD, `/validate`, `/publish`, version history), `backend/app/api/v1/runs.py` (trigger runs with `Idempotency-Key`, inspect runs, step details, chronological audit events, cancellation, `/runs/recover`), `backend/app/main.py`.
- **Frontend**: Modern developer-tool UI (Shell, Overview Dashboard, Workflow Library, React Flow Canvas Builder, System Diagnostics).
- **CI / Testing**: `.github/workflows/ci.yml`, `pytest` suite in `backend/tests/` (41 tests), `vitest` suite in `frontend/src/App.test.jsx` (2 tests).

## 2. Target Directory Layout
```text
flowforge/
├── .gitignore
├── AGENTS.md
├── PROJECT_SPEC.md
├── PROJECT_CONTEXT.md
├── TASK_LOG.md
├── docker-compose.yml
├── docs/
│   ├── architecture.md
│   └── decisions/
│       ├── 0001-postgresql-source-of-truth.md
│       ├── 0002-celery-redis-background-execution.md
│       ├── 0003-immutable-workflow-versioning.md
│       ├── 0004-ai-provider-abstraction.md
│       └── 0005-frontend-react-flow-plain-js.md
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── core/
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── security.py
│       │   └── logging.py
│       ├── models/
│       ├── schemas/
│       ├── api/
│       │   └── v1/
│       ├── workflows/
│       │   ├── validation.py
│       │   ├── state_machine.py
│       │   ├── scheduler.py
│       │   ├── executor.py
│       │   ├── context.py
│       │   └── recovery.py
│       ├── nodes/
│       │   ├── base.py
│       │   └── registry.py
│       ├── ai/
│       │   ├── provider.py
│       │   └── mock.py
│       ├── workers/
│       │   ├── celery_app.py
│       │   └── tasks.py
│       └── tests/
│           ├── conftest.py
│           ├── unit/
│           └── integration/
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        ├── components/
        └── pages/
```

## 3. Key Operational Commands
- Initialize Backend Virtualenv: `python3 -m venv .venv && source .venv/bin/activate`
- Run Backend Tests: `pytest backend/app/tests`
- Run Backend Linter: `ruff check backend/app && ruff format --check backend/app`
- Apply Migrations: `alembic upgrade head`
- Start API: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- Start Worker: `celery -A app.workers.celery_app worker --loglevel=info`
- Start Frontend: `npm run dev --prefix frontend`
