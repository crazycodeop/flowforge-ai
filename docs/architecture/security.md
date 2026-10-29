# FlowForge AI — Security, Governance & Audit Architecture

## 1. Authentication & Token Lifecycle

FlowForge AI uses JSON Web Tokens (JWT) signed with HMAC-SHA256:
- **Token Claims**: Subject (`user.id`), Email (`user.email`), System Role (`user.role`), Expiration (`exp`).
- **Secret Management**: Signing key loaded from environment variable `SECRET_KEY`.
- **Password Hashing**: Passwords hashed using PBKDF2/bcrypt with salt rounds preventing rainbow table lookups.

---

## 2. Multi-Tenant Authorization & Attack Defense

1. **Horizontal Privilege Escalation Defense**:
   - Every API endpoint verifying workflow, run, or approval existence includes `organization_id == current_tenant.id`.
   - Accessing a valid UUID belonging to another tenant yields `403 Forbidden` or `404 Not Found`.

2. **Injection Defense**:
   - All database queries parameterized through SQLAlchemy ORM; zero raw string interpolation.
   - Pydantic v2 validates and sanitizes all JSON input payloads before processing.

3. **Prompt Injection Guardrails**:
   - User inputs never override system instructions.
   - Outputs from AI nodes are treated as untrusted and passed through deterministic Pydantic schema validation.

---

## 3. Comprehensive Audit Trail

All critical operations generate immutable records in the `execution_events` table:
- `RUN_STARTED`, `RUN_PAUSED`, `RUN_COMPLETED`, `RUN_FAILED`, `RUN_CANCELLED`
- `STEP_STARTED`, `STEP_SUCCEEDED`, `STEP_FAILED`, `STEP_SKIPPED`, `STEP_RETRY_SCHEDULED`
- `AI_INFERENCE_COMPLETED` (with token usage, prompt hash, and cost tracking)
- `APPROVAL_REQUESTED`, `APPROVAL_DECIDED` (with approver identity and decision comment)
