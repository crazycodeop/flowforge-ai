# FlowForge AI — System Architecture & Design Overview

## 1. Product Summary & Business Problem

**FlowForge AI** is an enterprise-grade visual workflow orchestration and evaluation platform for AI-powered workflows.

Traditional AI implementations suffer from three critical production problems:
1. **Unpredictability & Hallucination**: Standalone LLM chat prompts fail silently or hallucinate unauthorized output schemas.
2. **Lack of Operational Governance**: Complex agentic pipelines lack deterministic branching, failure recovery, idempotency, or human-in-the-loop review gates.
3. **Black-Box Cost & Latency**: Teams have no visibility into token consumption, inference latency, or model drift across versions.

FlowForge AI solves these problems by providing:
- **Visual DAG Pipeline Orchestration**: A drag-and-drop React Flow canvas mapping deterministic data transforms, vector retrieval, and LLM inference.
- **Strict State Machine Execution**: PostgreSQL-backed state machine with explicit transitions (`PENDING`, `RUNNING`, `PAUSED`, `RETRY_WAIT`, `SUCCEEDED`, `FAILED`).
- **Distributed Asynchronous Execution**: FastAPI API gateway that enqueues work to Celery and Upstash Redis in under 40ms, executing asynchronously with worker lease concurrency and bounded exponential backoff retries.
- **Enterprise Multi-Tenancy**: Organization-scoped workspace isolation, tenant headers, and Role-Based Access Control (`owner`, `admin`, `builder`, `viewer`).
- **Human-in-the-Loop Governance**: Pauses execution when high-stakes criteria are met (e.g. refund requests > $50) for employee review.
- **Integrated Evaluation Harness**: Automated benchmarking suites measuring semantic similarity, schema accuracy, and latency percentiles.

---

## 2. Technology Stack & Rationale

| Layer | Technology | Engineering Rationale |
|---|---|---|
| **Frontend** | React 18, Vite, React Flow (@xyflow/react), Lucide Icons | Reactive node canvas, minimal bundle overhead, zero TypeScript build frictions. |
| **Backend Gateway** | Python 3.12+, FastAPI, Pydantic v2 | High-performance asynchronous REST API with automatic OpenAPI validation. |
| **Distributed Task Queue** | Celery 5.4, Upstash Redis 7.0 (TLS) | Decouples multi-second LLM API calls from web workers; ensures horizontal worker scalability. |
| **Data Persistence** | Supabase PostgreSQL 17 (Session/Transaction Pooler) | ACID compliance, JSONB support, relational foreign keys with cascade deletions. |
| **LLM Inference** | Groq LPU (`qwen/qwen3.8-27b`), OpenAI Compatible, Ollama | Ultra-fast token generation (<900ms roundtrip) for low-latency production pipelines. |
| **Vector Retrieval** | In-memory / PostgreSQL Cosine Similarity Store | Deterministic semantic policy search grounding LLM responses in real company policies. |
