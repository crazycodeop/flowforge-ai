# FlowForge AI — Troubleshooting & Incident Response

This runbook catalogs frequent operational failure modes, root-cause diagnostics, and step-by-step remediation procedures for FlowForge AI.

---

## 1. Floating or Unconnected Edges on Condition Nodes

- **Symptoms**: In FlowForge Studio, edges originating from a condition node curve awkwardly or appear detached from the TRUE/FALSE handles.
- **Root Cause**:
  1. Condition nodes use named handles (`id="true"` and `id="false"`). If an edge is created with `sourceHandle: undefined` or `null`, React Flow cannot anchor the connection.
  2. Overlapping duplicate handle elements intercepting pointer events.
- **Remediation**:
  - In `CustomNode.jsx`, verify only two named handles exist for condition nodes:
    ```jsx
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: "50%", background: "#059669" }} />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: "50%", background: "#dc2626" }} />
    ```
  - In `Builder.jsx`, ensure `onConnect`, `loadWorkflow`, and `handleAddNode` default `sourceHandle` to `"true"` when connected from a condition node.

---

## 2. Human Approval Gate State Transition Error

- **Symptoms**: Reviewer approves a pending request in the Portal, but the API returns HTTP 500 with `StateTransitionError: Invalid step transition from PAUSED to RUNNING`.
- **Root Cause**:
  `StepStatus` transition validation matrix allows `PAUSED -> SUCCEEDED` (when approved) or `PAUSED -> FAILED` (when rejected). Paused steps do not transition back to `RUNNING` because the approval step's work is finished upon approval.
- **Remediation**:
  Ensure the approval resolution handler in `backend/app/api/v1/portal.py` executes:
  ```python
  validate_step_transition(step.status, StepStatus.SUCCEEDED)
  step.status = StepStatus.SUCCEEDED
  
  validate_run_transition(run.status, RunStatus.RUNNING)
  run.status = RunStatus.RUNNING
  ```

---

## 3. Celery Worker Disconnection / Missed Tasks

- **Symptoms**: Workflow runs remain indefinitely in `PENDING` state after submission.
- **Root Cause**:
  1. Celery worker process is terminated or unable to connect to Redis.
  2. Redis TLS certificate handshake failure on Upstash.
- **Remediation**:
  - Check worker connectivity:
    ```bash
    celery -A app.core.celery_app.celery inspect ping
    ```
  - For Upstash Redis TLS URLs (`rediss://`), ensure `ssl_cert_reqs=none` or proper CA certificates are configured in `backend/app/core/celery_app.py`.
  - Start the Celery worker:
    ```bash
    .venv/Scripts/python.exe -m celery -A app.core.celery_app.celery worker --loglevel=info -P threads
    ```

---

## 4. LLM Extraction Schema Validation Failures

- **Symptoms**: An `ai_extract` or `structured_extract` node fails repeatedly with `PydanticValidationError`.
- **Root Cause**:
  The language model returned additional markdown formatting (e.g. ````json ... ````) or malformed field types (e.g. `"amount": "$250"` instead of a numerical float `250.0`).
- **Remediation**:
  1. FlowForge includes automatic schema sanitization in `backend/app/ai/extractor.py` that strips code fences before JSON parsing.
  2. If validation still fails, the extractor triggers an automatic repair prompt:
     ```text
     The previous JSON failed validation with error: {error_details}. Please correct the JSON to match the schema exactly.
     ```
  3. Ensure `max_repair_attempts` is set to at least `2` on the node configuration.
