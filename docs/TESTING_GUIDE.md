# FlowForge AI — Testing Guide & Verification Strategy

## 1. Testing Philosophy & Protocol

FlowForge AI enforces a rigorous **Anti-Hallucination & Evidence-Driven Engineering Protocol**:
- No feature is documented as `VERIFIED` without reproducible automated test execution.
- Tests exercise actual PostgreSQL state machines, actual Celery tasks, and actual FastAPI endpoints.
- Mocks are restricted to external upstream LLM APIs (when running isolated unit tests) to guarantee deterministic assertion bounds.

---

## 2. Test Suite Organization

```text
backend/tests/
├── conftest.py                      # Database fixtures, client overrides, auth tokens
├── test_ai_runtime.py               # Gemini client, extraction, classification, schema repair
├── test_auth_and_approval.py        # Token issuance, RBAC, approval gate pauses & resumptions
├── test_celery.py                   # Async Celery worker execution & task lifecycle
├── test_database.py                 # Relational constraints & foreign key cascades
├── test_evaluations.py              # Output evaluation scoring & guardrail checks
├── test_execution_engine.py         # DAG topological walker, context resolver, step runs
├── test_full_system_e2e.py          # End-to-end multi-step workflow execution
├── test_health.py                   # System readiness and liveness endpoints
├── test_multi_tenancy.py            # Cross-tenant data isolation & query boundaries
├── test_portal_api.py               # Form generation, NL parsing, submission, approvals
├── test_reliability.py              # Failure injection, timeout handling, retry policies
├── test_retrieval_and_flagship.py   # RAG vector retrieval & flagship refund pipeline
├── test_state_machine.py            # Mathematical transition validation & error guards
├── test_validation.py               # 11-step DAG graph validation rules
└── test_workflows_api.py            # Workflow CRUD, publish immutability, versioning
```

---

## 3. Running Test Suites

### Backend Unit & Integration Tests (Pytest)
```bash
# Run entire test suite
.venv/Scripts/python.exe -m pytest backend/tests

# Run specific suite with verbose logging
.venv/Scripts/python.exe -m pytest backend/tests/test_portal_api.py -v

# Run with test coverage report
.venv/Scripts/python.exe -m pytest backend/tests --cov=app --cov-report=term-missing
```

### Frontend Unit & Component Tests (Vitest)
```bash
# Run Vitest tests
npm test --prefix frontend

# Run production build validation
npm run build --prefix frontend
```

### End-to-End Flagship Verification Scripts
```bash
# Verify complete high-value refund pipeline with human approval gate
.venv/Scripts/python.exe scratch/verify_flagship_complete.py

# Verify customer support SLA triage pipeline
.venv/Scripts/python.exe scratch/verify_support_triage_complete.py
```
