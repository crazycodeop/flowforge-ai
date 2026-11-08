# FlowForge AI — Node Type Reference

FlowForge AI supports 9 core node types covering triggers, AI reasoning, data transformation, knowledge retrieval, deterministic control flow, and human governance.

---

## Node Directory & Capabilities

| Node Type | Icon Tag | Execution Mode | Schema Validation | Purpose |
|---|---|---|---|---|
| **trigger** | `Trigger` | Deterministic | Enforces input contract | Entry point of a workflow. Defines the webhook/API schema. |
| **input_data** | `Input` | Deterministic | Validates payload structure | Ingests external static or mock data payloads. |
| **ai_classify** | `AI Classify` | LLM Inference | Strict categorical set | Categorizes unstructured input into predefined labels with confidence scores. |
| **structured_extract** | `AI Extract` | LLM + Pydantic | JSON Schema + Pydantic | Extracts typed attributes from unstructured text with auto-repair. |
| **retrieval** | `Knowledge` | Vector Search / RAG | List of scored chunks | Queries knowledge bases or document embeddings for context injection. |
| **condition** | `Logic` | Deterministic | Boolean / Rule comparison | Evaluates logical comparisons and routes execution down TRUE/FALSE paths. |
| **transform** | `Transform` | Deterministic Python | Key-value mapping rules | Shapes, renames, and formats upstream outputs into new structures. |
| **human_approval** | `Review Gate` | State Pausing | Role and timeout policy | Pauses execution until an authorized human approves or rejects via the Portal. |
| **output** | `Result` | Deterministic | Contract conformity | Final step assembling the completed response payload. |

---

## Detailed Node Specifications

### 1. `trigger`
- **Description**: The formal ingestion point of a workflow.
- **Config Fields**:
  - `trigger_type`: `"api"` | `"webhook"` | `"schedule"`
  - `input_contract`: List of field definitions (`InputFieldDefinition`).
- **Sample Output**:
  ```json
  {
    "customer_name": "Jane Doe",
    "customer_email": "jane@example.com",
    "amount": 250.00,
    "issue_description": "Duplicate subscription charge"
  }
  ```

---

### 2. `ai_classify`
- **Description**: Evaluates text against a fixed taxonomy of categories with confidence scoring.
- **Config Fields**:
  - `prompt_template`: System or user prompt guiding classification.
  - `categories`: Array of allowed category strings, e.g. `["billing", "technical", "general"]`.
  - `model`: Model identifier, e.g. `"gemini-1.5-flash"`.
  - `temperature`: Float (default `0.1` for deterministic classification).
- **Sample Output**:
  ```json
  {
    "category": "billing",
    "confidence": 0.98,
    "reasoning": "User explicitly mentions payment and duplicate charge."
  }
  ```

---

### 3. `structured_extract`
- **Description**: Transforms unstructured text into structured, typed JSON matching a Pydantic schema with auto-repair fallback.
- **Config Fields**:
  - `schema_definition`: JSON Schema defining expected fields, types, and required properties.
  - `source_field`: Path to the raw text input (e.g. `input.issue_description`).
  - `max_repair_attempts`: Number of automatic retries if LLM produces invalid JSON (default `2`).
- **Sample Output**:
  ```json
  {
    "extracted_data": {
      "transaction_id": "TX-9982",
      "amount": 250.00,
      "refund_reason": "Charged twice for annual renewal"
    },
    "is_valid": true,
    "repair_attempts": 0
  }
  ```

---

### 4. `retrieval` (RAG)
- **Description**: Queries a vector collection to retrieve semantically relevant context chunks.
- **Config Fields**:
  - `query_template`: Text or template containing path references (e.g. `{input.issue_description}`).
  - `collection_name`: Target vector index (e.g. `"refund_policy"`, `"sla_guidelines"`).
  - `top_k`: Number of context documents to retrieve (default `3`).
  - `similarity_threshold`: Minimum cosine similarity score (e.g. `0.70`).
- **Sample Output**:
  ```json
  {
    "documents": [
      {
        "id": "doc_refund_rule_4",
        "title": "Refund Eligibility Thresholds",
        "content": "Refunds exceeding $100 require Finance Manager sign-off.",
        "score": 0.89
      }
    ]
  }
  ```

---

### 5. `condition`
- **Description**: Performs logical branching. Features two named source handles: `true` (green) and `false` (red).
- **Config Fields**:
  - `field_path`: Path to variable to compare (e.g. `steps.node_extract.amount`).
  - `operator`: `"greater_than"` | `"less_than"` | `"equals"` | `"not_equals"` | `"contains"`.
  - `value`: Target comparison threshold (e.g. `100`).
- **Sample Output**:
  ```json
  {
    "condition_met": true,
    "selected_branch": "true",
    "evaluated_expression": "250.0 > 100"
  }
  ```

---

### 6. `transform`
- **Description**: Deterministic payload reshaping and data normalization.
- **Config Fields**:
  - `mapping_rules`: Key-value map specifying target keys and source expressions or paths.
- **Sample Output**:
  ```json
  {
    "customer": "Jane Doe",
    "refund_amount": 250.00,
    "payout_status": "APPROVED",
    "issued_timestamp": "2026-11-08T09:30:00Z"
  }
  ```

---

### 7. `human_approval`
- **Description**: Halts workflow execution and registers an approval request awaiting authorized action.
- **Config Fields**:
  - `required_role`: Role authorized to act, e.g. `"finance_manager"` or `"admin"`.
  - `timeout_hours`: SLA window before automatic timeout (default `24`).
  - `summary_template`: Description displayed to reviewer in the Portal.
- **Sample Output (Upon Resumption)**:
  ```json
  {
    "decision": "approved",
    "approver": "manager@flowforge.ai",
    "notes": "Verified transaction log; approved for standard payout.",
    "decided_at": "2026-11-08T09:45:00Z"
  }
  ```

---

### 8. `output`
- **Description**: Assembles the final response delivered to the caller or displayed in the Portal resolution card.
- **Config Fields**:
  - `response_schema`: Expected output contract.
- **Sample Output**:
  ```json
  {
    "status": "COMPLETED",
    "summary": "High-Value Refund of $250.00 successfully processed and paid out."
  }
  ```
