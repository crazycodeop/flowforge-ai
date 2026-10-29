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
- **Database Models & Migrations**: `backend/app/models/system.py` (`SystemAudit`), `backend/app/models/workflow.py` (`Workflow`, `WorkflowVersion`), Alembic revisions `166bf013a400` and `858411219fc0` applied to PostgreSQL.
- **Workflow & Node Registry**: `backend/app/nodes/base.py`, `backend/app/nodes/registry.py` (registry for 9 core node types), `backend/app/schemas/workflow.py` (Pydantic models for workflows, nodes, edges, retry policies, validation).
- **Graph Validation Engine**: `backend/app/workflows/validation.py` (DAG cycle detection via Kahn's algorithm, orphan node detection, limit enforcement, node schema validation).
- **Workers**: `backend/app/workers/celery_app.py` (Celery configured with Redis broker/backend), `backend/app/workers/tasks.py` (`ping_task`)
- **API v1**: `backend/app/api/v1/health.py` (`/health`, `/ready`), `backend/app/api/v1/workflows.py` (`/workflows/nodes`, CRUD, `/validate`, `/publish`, version history), `backend/app/main.py`
- **Frontend**: React 18 / Vite with developer-tool styling (`frontend/src/index.css`), API client (`frontend/src/api/client.js`), and diagnostic dashboard (`frontend/src/App.jsx`).
- **CI / Testing**: `.github/workflows/ci.yml`, `pytest` suite in `backend/tests/` (17 tests), `vitest` suite in `frontend/src/App.test.jsx` (3 tests).

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
