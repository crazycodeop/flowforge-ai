# FlowForge AI — Workflow Execution Lifecycle & State Machine

## 1. Execution Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / User
    participant Gateway as FastAPI Gateway
    participant DB as PostgreSQL 17
    participant Broker as Upstash Redis
    participant Worker as Celery Worker
    participant LLM as Groq AI LPU

    User->>Gateway: POST /api/v1/workflows/{id}/runs (payload)
    Note over Gateway: Auth verified + Tenant resolved
    Gateway->>DB: Check idempotency hash (SHA-256)
    alt Run Already Exists
        Gateway-->>User: 200 OK (Existing WorkflowRun)
    else New Execution
        Gateway->>DB: Create WorkflowRun (PENDING)
        Gateway->>Broker: Enqueue execute_workflow_task.delay(run_id)
        Gateway-->>User: 202 Accepted (run_id) [<40ms]
    end

    Broker->>Worker: Dispatch task to available worker
    Worker->>DB: Transition WorkflowRun to RUNNING
    Worker->>DB: Initialize StepRun records for all DAG nodes (PENDING)

    loop Topological Execution
        Worker->>Worker: find_ready_nodes(definition, step_runs)
        Worker->>DB: Acquire StepRun worker lease (lease_expires_at, attempt+1)
        Worker->>DB: Transition step to RUNNING & emit STEP_STARTED

        alt AI Inference Node (ai_classify / ai_extract)
            Worker->>LLM: POST chat/completions (temperature=0, strict json_schema)
            LLM-->>Worker: Raw structured text response
            Worker->>Worker: Validate output against Pydantic schema
            Worker->>DB: Emit AI_INFERENCE_COMPLETED (tokens, cost_usd, latency)
            Worker->>DB: Transition step to SUCCEEDED
        else Condition / Branch Node
            Worker->>Worker: Evaluate condition logic
            Worker->>DB: Transition unselected branch steps to SKIPPED
            Worker->>DB: Transition condition step to SUCCEEDED
        else Human Approval Gate Node
            Worker->>DB: Create ApprovalRequest (PENDING)
            Worker->>DB: Transition step to PAUSED
            Worker->>DB: Transition run to PAUSED & emit RUN_PAUSED
            Note over Worker,DB: Worker halts execution loop and exits
        end
    end

    alt Workflow Completed Without Pause
        Worker->>DB: Transition WorkflowRun to SUCCEEDED
        Worker->>DB: Emit RUN_COMPLETED event with output_payload
    end
```

---

## 2. State Machine Transitions

The execution engine enforces an explicit finite state machine. Invalid transitions (e.g. `SUCCEEDED` -> `RUNNING` or `FAILED` -> `SUCCEEDED`) raise `InvalidStateTransitionError` and are rejected before touching the database.

### Workflow Run Valid Transitions
- `PENDING` -> `QUEUED`, `RUNNING`, `CANCELLED`
- `QUEUED` -> `RUNNING`, `CANCELLED`
- `RUNNING` -> `PAUSED`, `SUCCEEDED`, `FAILED`, `CANCELLED`
- `PAUSED` -> `RUNNING`, `CANCELLED`
- `SUCCEEDED` -> Terminal state
- `FAILED` -> Terminal state
- `CANCELLED` -> Terminal state

### Step Run Valid Transitions
- `PENDING` -> `RUNNING`, `SKIPPED`, `CANCELLED`
- `RUNNING` -> `SUCCEEDED`, `FAILED`, `PAUSED`, `RETRY_WAIT`, `CANCELLED`
- `RETRY_WAIT` -> `RUNNING`, `FAILED`, `CANCELLED`
- `PAUSED` -> `RUNNING`, `CANCELLED`
- `SUCCEEDED` -> Terminal state
- `SKIPPED` -> Terminal state
- `FAILED` -> Terminal state
