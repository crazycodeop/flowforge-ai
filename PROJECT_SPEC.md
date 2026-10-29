# FLOWFORGE AI — MASTER ENGINEERING SPECIFICATION

## 1. PRODUCT IDENTITY & OBJECTIVE
- **Product Name**: FlowForge AI
- **Tagline**: "Design, execute, monitor, and evaluate reliable AI-powered workflows."
- **Description**: A visual workflow orchestration platform where users construct workflows from deterministic code steps, AI-powered steps, conditional branches, retrieval steps, and human approval gates. Executes workflows asynchronously, persists state durably, records step-level execution history, handles recoverable failures, and provides observability into AI quality, latency, token usage, and execution costs.
- **Differentiator**: Focus on reliable AI execution with durable execution state, explicit state transitions, graph validation, versioning, background workers, bounded retries, idempotency safeguards, interrupted-run recovery, structured outputs, human-in-the-loop approvals, execution traces, repeatable evaluations, and security boundaries.

## 2. TECHNOLOGY STACK
- **Frontend**: React (plain JavaScript with JSDoc), Vite, React Router, React Flow, accessible styling system, thin API client layer.
- **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PostgreSQL, Celery, Redis, Pytest, Ruff.
- **AI Integration**: Modular provider abstraction (Groq, OpenAI-compatible, Ollama/local), environment-driven configuration, strict Pydantic validation for structured outputs, deterministic mock provider for zero-credential testing and CI.
- **Infrastructure**: Docker & Docker Compose (when Docker daemon available), local development runtime support (host PostgreSQL/Redis/venv), reproducible lockfiles.

## 3. CORE ARCHITECTURAL PRINCIPLES
1. **PostgreSQL as Source of Truth**: Workflows, versions, runs, step attempts, outputs, approvals, events, and evaluations reside in PostgreSQL with relational integrity, transactions, and explicit state transition validations.
2. **Background Processing**: FastAPI accepts run requests, validates idempotency keys, persists initial run records, and hands execution off to Celery workers.
3. **Immutability of Versions**: Workflow versions once published are immutable. Run records pin the exact workflow version snapshot used at execution time.
4. **Resilience & Leases**: Workers operate with execution leases or heartbeats, exponential backoff with jitter on recoverable errors, and a dedicated recovery routine for stale or orphaned running steps.
5. **Untrusted Data & LLM Security**: LLMs are never granted unrestricted tool execution, arbitrary code execution, or direct application permissions. All inputs, outputs, and retrieved documents are treated as untrusted data.
6. **Flagship Workflow**: Support-ticket triage and response drafting with classification, structured extraction, conditional routing, approved knowledge retrieval, policy verification, human-in-the-loop review for high-risk/low-confidence actions, and deterministic generation.

## 4. MILESTONES SUMMARY
- **Milestone 0**: Discovery, Environment Analysis, Context Setup, Architecture Design & Implementation Plan
- **Milestone 1**: Foundation (FastAPI skeleton, React/Vite skeleton, DB & Redis setup, Alembic, Ruff, Pytest, CI config)
- **Milestone 2**: Workflow Schemas, Registry, Graph Validation (DAG check, cycle detection), Versioning & Publishing
- **Milestone 3**: Deterministic Execution Engine, State Machine, Step Persistence, Celery Dispatch, Event History
- **Milestone 4**: Reliability, Bounded Retries, Backoff with Jitter, Idempotency Keys, Leases & Recovery
- **Milestone 5**: AI Runtime, Provider Abstraction, Structured Output Validation, Usage/Latency/Cost Tracking, Mock Provider
- **Milestone 6**: Retrieval Node (pgvector / knowledge collections), Flagship Support Triage Workflow & Policy Enforcement
- **Milestone 7**: Human Approval Workflow, Auth (JWT / Password hashing), Per-User Authorization, Security Hardening
- **Milestone 8**: React Frontend Workflow Builder (React Flow, Node Palette, Config Inspector, Validation, Run Trigger)
- **Milestone 9**: Execution Inspector, Timeline, Approval Inbox, AI Evaluation Framework & Quality Metrics
- **Milestone 10**: Release Quality, End-to-End Verification, Documentation, Demo Script, Architecture Finalization
