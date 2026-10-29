# Project Context — FlowForge AI

## 1. Verified Environment & Tooling
- **OS**: Linux (x86_64 Ubuntu kernel)
- **Python**: 3.12.3 (`.venv` active with all dependencies, `pip 26.2.2`, `pytest 9.2.0`, `ruff 0.9.7`)
- **Node.js**: v24.15.0 (`npm 11.12.1`, `vite 6.4.5`, `vitest 3.2.7`, `@xyflow/react 12.4.4`, `mermaid 11.4.1`)
- **Database**: Supabase PostgreSQL 17 via AWS Session Pooler (`aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require`)
- **Message Broker**: Upstash Redis 7.0 via TLS (`rediss://capable-haddock-242252.upstash.io:6379/0`)
- **AI Engine**: Groq Cloud LPU (`qwen/qwen3.8-27b`) with deterministic `MockAIProvider` offline fallback
- **Celery Workers**: Running with prefetch multiplier locked to 1 and visibility timeout set to 3600s
- **Git**: Branch `main`, clean repository, secrets strictly ignored via `.gitignore`

---

## 2. Implemented Subsystems & Components

### A. Multi-Tenant Organization SaaS Architecture
- **Models**: `backend/app/models/organization.py` (`OrganizationRole`, `Organization`, `OrganizationMember` with unique constraint `uq_org_member`).
- **Relational Isolation**: `organization_id` foreign keys with cascade deletions added across `workflows`, `workflow_runs`, `approval_requests`, `knowledge_collections`, and `evaluations`.
- **Alembic Migration**: `20261029_1000_48c7e930f1a2_create_organizations_and_tenant_isolation.py` applied to PostgreSQL.
- **Dependencies & Middleware**: `backend/app/api/deps.py` (`TenantContext`, `get_tenant_context`, `get_optional_tenant_context`, `get_or_create_default_org`, `require_org_role`).
- **REST Endpoints**:
  - `/api/v1/organizations/` (List, Create)
  - `/api/v1/organizations/{id}` (Get, Update)
  - `/api/v1/organizations/{id}/members` (List, Add, Delete)
  - `/api/v1/settings/profile`, `/api/v1/settings/password`, `/api/v1/settings/ai`, `/api/v1/settings/ai/test`

### B. Client Frontend Architecture & UI Pages
- **Authentication & Security**:
  - `frontend/src/pages/Login.jsx`: Modern SaaS sign-in card with one-click "Platform Engineer" and "Staff Architect" demo persona shortcuts.
  - `frontend/src/pages/Register.jsx`: Multi-tenant workspace signup flow.
  - `frontend/src/components/ProtectedRoute.jsx`: Client route guard redirecting unauthenticated traffic to `/login`.
  - `frontend/src/api/client.js`: Automatically injects `Authorization: Bearer <token>` and `X-Organization-ID: <org_id>` into every request.
- **Collapsible Shell & Workspace Selector (`frontend/src/components/Shell.jsx`)**:
  - Smooth 240px ⟷ 54px width collapse transition with persisted local preference.
  - Eliminated awkward text "Collapse" in favor of an intuitive icon toggle (`<PanelLeftClose />` / `<PanelLeftOpen />`), with category headers hidden in collapsed mode to prevent vertical letter wrapping.
  - Dynamic Workspace Dropdown displaying active organization and role badge, with instant switching and "Create New Workspace" modal.
  - Render-inspired 50px top navigation bar with breadcrumb context, `Search ⌘K` command shortcut modal, compact `+ New Workflow` button, and user profile avatar.
  - Responsive mobile drawer support for viewports under 768px.
- **GitHub-Centric Architecture Center (`README.md` & `docs/architecture/`)**:
  - Architecture documentation decoupled from client-facing frontend and consolidated into GitHub `README.md` and `docs/architecture/` modules.
  - Complete Mermaid diagrams: High-Level Distributed Topology, Execution Sequence Lifecycle, Deterministic State Machine, and Relational Database ER Diagram.
  - REST API v1 catalog and Staff Engineer System Design Q&A section.
- **Guided Enterprise Use Cases Hub (`frontend/src/pages/UseCases.jsx`)**:
  - Interactive Customer Support Triage showcase with "Run Live Demonstration" button triggering real-time DAG execution.
  - Accounts Payable Automated Invoice Auditing showcase.
  - Legal Contract NDA Compliance Review showcase.
  - Detailed Code vs AI vs Human responsibility matrix.
- **Persistent Workspace Settings (`frontend/src/pages/Settings.jsx`)**:
  - Personal Profile tab (name, email, system privilege role).
  - Organization & Team tab (rename organization, team member listing, invite/remove member).
  - AI Providers & Runtime tab (active model, operational status, live latency test probe).
  - Appearance & Canvas tab (grid style, snap-to-grid, MiniMap toggle).
  - Security tab (password change, active session review, sign out).

### C. Execution Engine & Reliability
- **State Machine**: Validated transitions across `PENDING`, `RUNNING`, `PAUSED`, `RETRY_WAIT`, `SUCCEEDED`, and `FAILED`.
- **Topological DAG Scheduling**: Resolves ready nodes, supports branch conditions, and cascades skip states.
- **Distributed Leases**: Step runs claim leases with heartbeat TTL; stale worker zombie recovery re-queues expired tasks without duplicating finished work.
- **Bounded Backoff**: Full jitter exponential backoff for HTTP 429 rate limits and transient network timeouts.
- **Human Approval**: Pauses workflows cleanly at approval gates and resumes after review decision.

### D. Render-Inspired Dark Dashboard Design System
- **Color Palette & Tokens**: Pure black `#0B0B0B` root background, `#111111` full-height sidebar, `#161616` card surfaces, `#202020` hover states, and `#262626` / `#333333` crisp hairline borders.
- **Accents**: Deep violet active state pills (`#4C1D95`), vibrant accent `#8B5CF6`, hover `#A78BFA`.
- **Operational Status Indicators**: Restrained green text (`#10B981`) with translucent background pills (`rgba(16, 185, 129, 0.1)`), warning amber (`#F59E0B`), and red error (`#EF4444`).
- **Dashboard Experience**: Segmented filter pills (`Active`, `Draft`, `All`), high-density operational tables, real-time search filtering, and flat cloud infrastructure aesthetics.
- **Workflow Builder**: Deep `#0B0B0B` canvas with dark dot grid, `#161616` custom node cards with violet selection rings and handle indicators, `#111111` node library palette and node inspector drawers.

---

## 3. Automated Test Battery Status
- **Backend (Pytest)**: 53 tests passing (0 failures).
- **Backend Code Quality (Ruff)**: 0 lint or formatting errors.
- **Frontend (Vitest)**: 2 unit tests passing (0 failures).
- **Frontend Production Build**: Vite production build succeeded (`dist/` generated with zero errors).
