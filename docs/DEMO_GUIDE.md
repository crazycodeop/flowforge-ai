# FlowForge AI — End-to-End Live Demonstration Script & Walkthrough

This step-by-step guide is designed for technical interviews, executive demos, and stakeholder walkthroughs. It highlights the dual-application architecture, contract-first input design, human-in-the-loop governance, and deep observability.

---

## 1. Demo Setup & Prerequisites

Ensure the three core service tiers are running:
1. **FastAPI Backend**: `http://127.0.0.1:8000`
2. **Celery Worker**: Connected to Redis broker
3. **Vite Frontend**: `http://localhost:5173`

> [!TIP]
> **Quick Access Links**:
> - **FlowForge Studio (Developer / Admin)**: `http://localhost:5173/`
> - **FlowForge Portal (Business User / Stakeholder)**: `http://localhost:5173/portal`
> - **Default Credentials**: `engineer@flowforge.ai` / `password123` (or click *Platform Engineer* one-click pill on login)

---

## 2. Walkthrough Act 1: The Product Persona Separation (Studio vs. Portal)

### The Narrative
*"Enterprise AI systems fail when you force business users to interact with DAG nodes, JSON schemas, or field expressions. In FlowForge AI, developers design and govern topologies in **Studio**, while business users submit requests and authorize actions in **Portal**."*

### Step-by-Step Actions:
1. Navigate to `http://localhost:5173/` (**FlowForge Studio**):
   - Highlight the clean, modern light theme (white cards, slate text, teal accents).
   - Point out the top header featuring the direct navigation pill: **"Client Portal"**.
2. Click **"Client Portal"** (or open `http://localhost:5173/portal`):
   - Notice the shift in user experience: zero node graphs, zero JSON, zero developer controls.
   - Show the **Service Catalog** displaying available published workflows (e.g., *High-Value Refund & Financial Approval Pipeline* and *Customer Support SLA & Triage*).

---

## 3. Walkthrough Act 2: Contract-Driven Input & AI Natural Language Assistant

### The Narrative
*"Instead of accepting arbitrary JSON blobs that break downstream steps, workflows define a formal Input Contract. The Client Portal automatically renders a clean form or uses structured AI extraction to turn freeform prompts into validated parameters."*

### Step-by-Step Actions:
1. In the Portal Service Catalog, click **"Launch Service"** on **High-Value Refund & Financial Approval Pipeline**:
   - URL: `/portal/new-request/7851c2b9-c846-4962-8fa0-73de7f8fcc6e`
   - Point out the automatically generated form fields derived from the workflow's contract:
     - `Customer Name` (Text, required)
     - `Customer Email` (Email, required)
     - `Refund Amount ($)` (Number, required)
     - `Issue Description` (Multiline text, required)
     - `Order Reference` (Text, optional)
2. **Demonstrate AI Natural Language Parsing & Missing Field Clarification**:
   - In the natural language assistant box, paste:
     > *"Customer Jane Doe was charged $250.00 twice for order ORD-991 due to a payment gateway timeout."*
   - Click **"Extract with AI"**.
   - **Show the Result**:
     - The AI parser accurately populates:
       - Customer Name: `Jane Doe`
       - Refund Amount: `250`
       - Issue Description: `Charged $250.00 twice due to payment gateway timeout.`
       - Order Reference: `ORD-991`
     - **Highlight the Clarification Prompt**:
       - The system flags that `Customer Email` is mandatory but missing from the prompt:
       - Alert: *"Please provide the customer's email address to complete submission."*
3. Enter `jane.doe@acme.com` in the highlighted email field.
4. Click **"Submit Request"**:
   - A success toast confirms request creation.
   - You are immediately redirected to the **Request Detail Timeline** (`/portal/requests/:id`).

---

## 4. Walkthrough Act 3: Deterministic Branching & Human Approval Pausing

### The Narrative
*"Our request is for $250.00. The workflow condition stipulates: Any refund over $100 requires Finance Manager sign-off. Watch how the engine pauses execution, persists state in PostgreSQL, and creates an approval gate without burning worker compute."*

### Step-by-Step Actions:
1. On the **Request Detail** page:
   - Notice the high-level **Business Stage Timeline**:
     - `Initiated` -> **Completed (Green checkmark)**
     - `AI Processing & Validation` -> **Completed**
     - `Review Gate` -> **Action Required (Yellow badge: PAUSED)**
   - The timeline explains: *"Awaiting Finance Manager sign-off (Threshold > $100.00)"*.
2. Navigate to **Pending Approvals** (`/portal/approvals`):
   - Point out the review card for Jane Doe's $250.00 refund.
   - Expand the drawer to inspect the transaction context:
     - Amount: `$250.00`
     - Reason: `Charged twice due to payment gateway timeout`
     - SLA Window: `24 hours`
3. Click **"Approve"**:
   - Enter optional review notes: *"Verified dual charge in merchant portal. Approved for immediate disbursement."*
   - Click **"Confirm Approval"**.
4. Return to **Request Detail**:
   - The stage timeline updates dynamically:
     - `Review Gate` -> **Approved by Finance Manager**
     - `Completed` -> **Success (Green)**
   - The **Resolution Card** appears at the bottom with the completed payout receipt:
     - `Status: APPROVED_AND_ISSUED`
     - `Disbursed Amount: $250.00`
     - `Timestamp & Authorization Signature recorded`

---

## 5. Walkthrough Act 4: Developer Studio Deep Observability & Graph Topology

### The Narrative
*"Now let's switch hats to the platform engineer or architect. How do we know what happened behind the scenes? Let's inspect the DAG in Studio."*

### Step-by-Step Actions:
1. Navigate back to **FlowForge Studio** (`http://localhost:5173/`):
2. Click **Workflows** -> Open **High-Value Refund & Financial Approval Pipeline**:
   - Point out the visual canvas:
     - `Transaction & Amount Parser` (AI Extract node)
     - `Evaluate Threshold (> $100)` (Condition node with dual named handles: **TRUE** in emerald green and **FALSE** in red)
     - Outgoing edge from **TRUE** connects directly to `Finance Manager Approval Gate`.
     - Outgoing edge from **FALSE** bypasses approval and routes directly to transform.
   - Click the toolbar button **"Input Contract"**:
     - Show where the developer configured the field definitions (`name`, `label`, `type`, `required`).
3. Click the Condition node or Transform node:
   - Point out **Upstream Field Mapping**:
     - The inspector displays all available upstream paths (`input.amount`, `steps.node_extract.amount`).
4. Click **Executions** in the sidebar (`/executions`):
   - Find the execution run we just triggered.
   - Click **"Details"** to open the side inspector:
     - Point out the step-by-step latency breakdown (e.g. LLM extract: `180ms`, Condition: `2ms`, Approval Gate: `Paused -> Resumed`).
     - Point out the **Chronological Audit Trail**: Shows exact event timestamps for `WORKFLOW_STARTED`, `STEP_PAUSED`, `APPROVAL_DECISION`, and `WORKFLOW_SUCCEEDED`.

---

## 6. Walkthrough Act 5: Executive Q&A & Interview Defenses

Be prepared to answer these four questions with these specific proofs:

| Question | Winning Answer | Concrete Proof in FlowForge AI |
|---|---|---|
| *"Why build a custom engine instead of using LangChain?"* | *"LangChain is in-process and ephemeral; if a server restarts, state is lost. FlowForge persists every step transition in PostgreSQL with mathematical state machines, allowing workflows to pause for days at human gates and resume cleanly via Celery."* | Point to `ApprovalRequest` in PostgreSQL, `StepStatus.PAUSED -> StepStatus.SUCCEEDED` transition guards in `backend/app/workflows/state_machine.py`. |
| *"How do you prevent AI hallucinations from breaking production databases?"* | *"We use three layers of defense: 1) Strict Pydantic JSON contracts, 2) Markdown code-fence stripping, and 3) Automated repair retry loops that send validation errors back to the model for self-correction."* | Point to `backend/app/ai/extractor.py` and `test_ai_runtime.py` where repair retries are tested. |
| *"How do you handle multi-tenancy and security?"* | *"Every table (`workflows`, `runs`, `audit_events`) contains an `organization_id`. Database queries enforce row-level scoping via FastAPI dependency injection. Users cannot access cross-tenant data even with valid IDs."* | Point to `test_multi_tenancy.py` (58 unit tests passing). |
| *"How does the Portal know what inputs to show without code changes?"* | *"Workflows are self-documenting. The `input_contract` is stored in the published version snapshot in PostgreSQL. The Portal dynamically renders the controls and feeds the contract into the LLM prompt for zero-shot natural language parsing."* | Demonstrate the Input Contract modal in Studio and the dynamic form in Portal. |
