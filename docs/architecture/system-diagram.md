# FlowForge AI — High-Level System Architecture & Component Diagram

## 1. System Topology Diagram

```mermaid
flowchart TD
    subgraph ClientTier ["Client Presentation Tier"]
        Browser["React 18 SPA (Vite + React Flow)"]
        TokenStore["Local Storage: JWT & Tenant Context"]
    end

    subgraph APITier ["Application Gateway Tier"]
        FastAPI["FastAPI 0.115+ ASGI Server (Python 3.12)"]
        AuthLayer["JWT Authentication & Token Verification"]
        TenancyLayer["Tenant Isolation Middleware (X-Organization-ID)"]
        PydanticLayer["Pydantic v2 Request/Response Validation"]
    end

    subgraph BrokerTier ["Message Broker & Dispatch Tier"]
        UpstashRedis["Upstash Redis 7.0 (TLS Encrypted Broker)"]
        CeleryQueue["Celery 5.4 Task Queue ('default')"]
    end

    subgraph WorkerTier ["Distributed Execution Engine Tier"]
        CeleryWorker["Celery Execution Workers (Prefetch Multiplier = 1)"]
        DAGScheduler["Topological DAG Dependency Resolver"]
        LeaseManager["Worker Lease & Heartbeat Coordinator"]
        RecoveryWorker["Zombie & Expired Lease Recovery Loop"]
    end

    subgraph AITier ["AI Subsystem & Model Routing Tier"]
        AIAdapter["BaseAIProvider Adapter Factory"]
        GroqProvider["Groq LPU Engine (qwen/qwen3.8-27b)"]
        FallbackProvider["Deterministic Mock AI Provider"]
        Guardrails["Schema Enforcement & Regex JSON Parser"]
    end

    subgraph StorageTier ["Data Persistence Tier (Single Source of Truth)"]
        SupabasePostgres["Supabase PostgreSQL 17 (Pooler: aws-0-eu-west-1.pooler.supabase.com)"]
        VectorStore["Knowledge Base Embeddings & Semantic Search"]
    end

    Browser -->|"HTTPS REST + Bearer Token + X-Organization-ID"| FastAPI
    FastAPI --> AuthLayer
    AuthLayer --> TenancyLayer
    TenancyLayer --> PydanticLayer

    PydanticLayer -->|"Sync CRUD & Version Lookups"| SupabasePostgres
    PydanticLayer -->|"Async Enqueue: execute_workflow_task.delay(run_id)"| UpstashRedis
    UpstashRedis --> CeleryQueue
    CeleryQueue -->|"Consume Task"| CeleryWorker

    CeleryWorker --> DAGScheduler
    DAGScheduler --> LeaseManager
    LeaseManager -->|"Acquire & Heartbeat Step Leases"| SupabasePostgres
    DAGScheduler -->|"Semantic Retrieval"| VectorStore
    DAGScheduler --> AIAdapter

    AIAdapter --> GroqProvider
    AIAdapter -.->|"Local Testing Fallback"| FallbackProvider
    GroqProvider --> Guardrails
    Guardrails -->|"Validated JSON Payload"| DAGScheduler

    DAGScheduler -->|"Transition State & Log Events"| SupabasePostgres
    RecoveryWorker -->|"Reclaim Stale Leases"| SupabasePostgres
```

---

## 2. Component Communication Protocols

1. **Client to API Gateway (Synchronous HTTPS)**:
   - JSON payloads over TLS 1.3.
   - `Authorization: Bearer <jwt_token>` header on all protected routes.
   - `X-Organization-ID: <org_uuid>` header specifying the active tenant workspace.
   - Prompt response latency: `<40ms` for run dispatch (returns `202 Accepted` with `run_id`).

2. **API Gateway to Upstash Redis (Asynchronous Broker)**:
   - Encrypted Redis connection (`rediss://`) via TLS on port `6379`.
   - Free-tier rate limiting optimization: broker and result backend routed through `/0`, prefetch locked to `1` to eliminate command waste.

3. **Celery Worker to PostgreSQL (Synchronous Database Transactions)**:
   - SQLAlchemy 2.0 ORM with connection pooling (`pool_recycle=300`, `pool_pre_ping=True`).
   - Transactional state updates for every step transition (`PENDING` -> `RUNNING` -> `SUCCEEDED`).
   - Granular event logging to `execution_events` table for audit observability.

4. **Worker to AI Provider (External Inference HTTPS)**:
   - Groq Cloud API (`https://api.groq.com/openai/v1/chat/completions`) using LPU hardware acceleration.
   - Structured JSON completion with zero temperature.
   - Bounded exponential backoff retries on rate limits (`HTTP 429`).
