# Project Context — FlowForge AI

## 1. Verified Environment & Tooling
- **OS**: Linux (x86_64 Ubuntu kernel)
- **Python**: 3.12.3 (`python3` available, `venv` available, `pip 24.0`)
- **Node.js**: v24.15.0 (`npm 11.12.1`)
- **Redis**: `/usr/bin/redis-server`, `/usr/bin/redis-cli` (active, running on localhost:6379, ping returned `PONG`)
- **PostgreSQL**: PostgreSQL 16 server active on localhost:5432 (`initdb` available at `/usr/lib/postgresql/16/bin/initdb`)
- **Docker**: Docker binary not installed in user path on the current host. A local development environment using standard Python virtual environment, host Redis, and dedicated local PostgreSQL user cluster or connection configuration will be provided alongside Docker Compose configuration for containerized deployment.
- **Git**: Initialized on branch `main`.

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
