# FlowForge AI — API Reference

All FlowForge AI endpoints are rooted at `/api/v1` and return JSON responses. Authentication uses standard Bearer JWT tokens in the `Authorization` header.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "c76a16d4-...",
      "email": "user@example.com",
      "role": "admin",
      "organization_id": "0d18bbf1-..."
    }
  }
  ```

---

## 2. Workflows Endpoints (`/api/v1/workflows`)

### `GET /api/v1/workflows`
Lists all workflows owned by the authenticated user's organization.

### `POST /api/v1/workflows`
Creates a new draft workflow with an initial trigger node and empty DAG definition.

### `GET /api/v1/workflows/{id}`
Retrieves complete workflow definition including nodes, edges, and `input_contract`.

### `PUT /api/v1/workflows/{id}`
Updates draft workflow nodes, edges, or metadata.

### `POST /api/v1/workflows/{id}/publish`
Validates the DAG against all 11 topological rules, locks an immutable version snapshot in `workflow_versions`, and increments `current_version`.

### `POST /api/v1/workflows/validate`
Performs dry-run graph validation returning validation errors or confirmation.

---

## 3. Client Portal Endpoints (`/api/v1/portal`)

### `GET /api/v1/portal/workflows`
Returns active, published workflows available for client submission.

### `GET /api/v1/portal/workflows/{id}/form`
Returns the workflow's user-facing metadata, description, and list of input fields (`InputFieldDefinition`) to construct the submission form dynamically.

### `POST /api/v1/portal/workflows/{id}/parse-nl`
Uses structured LLM inference to parse a natural-language description into form fields and flags missing required fields.
- **Request Body**:
  ```json
  {
    "text": "Refund $250 for Jane Doe, double billed for order ORD-991."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "parsed_fields": {
      "customer_name": "Jane Doe",
      "amount": 250.0,
      "order_id": "ORD-991"
    },
    "missing_required_fields": ["customer_email"],
    "clarification_prompt": "Please provide the customer's email address.",
    "needs_clarification": true
  }
  ```

### `POST /api/v1/portal/workflows/{id}/requests`
Submits a client request against the workflow's input contract, creates a run record, and kicks off asynchronous background execution.
- **Request Body**:
  ```json
  {
    "input_payload": {
      "customer_name": "Jane Doe",
      "customer_email": "jane@example.com",
      "amount": 250.0,
      "issue_description": "Double billed for subscription renewal"
    }
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "run_id": "7851c2b9-...",
    "status": "PENDING",
    "submitted_at": "2026-11-08T09:30:00Z"
  }
  ```

### `GET /api/v1/portal/requests`
Lists all client submissions with business status badges and elapsed runtimes.

### `GET /api/v1/portal/requests/{id}`
Retrieves high-level business stage timeline (`Initiated` -> `AI Processing` -> `Review Gate` -> `Completed`) and final resolution artifacts.

### `GET /api/v1/portal/approvals/pending`
Returns pending approval gates assigned to the user's role.

### `POST /api/v1/portal/approvals/{id}/decision`
Submits an approval or rejection decision, unpauses the workflow run, and resumes Celery DAG execution.
- **Request Body**:
  ```json
  {
    "decision": "approved",
    "notes": "Verified receipt with merchant account."
  }
  ```
