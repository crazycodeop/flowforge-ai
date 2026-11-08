# FlowForge AI — Technical Interview Preparation & System Design Defense

This document prepares you to defend FlowForge AI in high-bar Principal / Senior Full-Stack and AI Systems Engineer interviews.

---

## 1. The 60-Second "Elevator Pitch"

> *"FlowForge AI is an enterprise visual workflow orchestration platform built to solve the reliability, auditability, and usability bottlenecks of production AI systems.*
> 
> *Instead of relying on fragile prompt chains or opaque scripts, FlowForge models business logic as a Directed Acyclic Graph (DAG) combining LLMs, deterministic transformations, conditional branches, and human-in-the-loop governance.*
> 
> *Crucially, we separate the developer experience—**FlowForge Studio**, where engineers design topologies and bind Pydantic schemas—from the business user experience—**FlowForge Portal**, where clients submit requests via dynamic forms or natural-language prompts and track stage timelines without ever seeing JSON or node IDs.*
> 
> *The entire system is backed by an explicit PostgreSQL state machine, Celery background dispatch, and an automated schema repair layer that catches LLM hallucinations before they can pollute downstream systems."*

---

## 2. Deep-Dive Interview Questions & Answers

### Q1: "Why not use LangChain or LlamaIndex instead of building a custom DAG engine?"
**Answer**:
*"LangChain and LlamaIndex are fantastic libraries for rapid local prototyping and experimentation. However, for enterprise operations, they present serious architectural liabilities:*
1. *State & Resilience: They are primarily in-process libraries. If a server process dies or an API takes 45 seconds, the execution state is lost. FlowForge persists every step transition transactionally in PostgreSQL and executes via distributed Celery workers.*
2. *Human-in-the-Loop: Enterprise approvals require pausing a workflow for hours or days. You cannot keep an in-memory thread suspended. FlowForge transitions runs to `PAUSED` in PostgreSQL, releases worker compute, and resumes seamlessly when an authorized manager approves in the Portal.*
3. *Auditability: Regulated industries require exact input/output snapshots, latency records, and retry attempts for every single node. Our database schema guarantees complete reproducibility and audit logging."*

---

### Q2: "How do you guarantee that an LLM output won't break downstream deterministic code?"
**Answer**:
*"Through a three-layer defense-in-depth approach:*
1. *Pydantic Type Contracts: Nodes that produce structured data require a formal JSON schema. We compile this into Pydantic models with strict type enforcement.*
2. *Markdown Code-Fence Sanitization: LLMs frequently wrap responses in markdown backticks or commentary. Our parser cleans fences, isolates the JSON payload, and validates fields.*
3. *Automated Schema Repair Retries: If validation fails, we don't immediately crash the run. The engine triggers an automated feedback prompt to the LLM showing the exact validation error message and schema requirement, giving it up to 2 attempts to self-correct."*

---

### Q3: "How does the system handle high-concurrency race conditions during human approvals?"
**Answer**:
*"We employ an explicit mathematical state machine combined with PostgreSQL row-level locking:*
1. *When a manager clicks 'Approve' in the Portal, the endpoint initiates a database transaction with `SELECT ... FOR UPDATE` on the run and step records.*
2. *We check `validate_step_transition(step.status, StepStatus.SUCCEEDED)`. If a peer manager already approved or rejected the request, `step.status` is no longer `PAUSED`, raising a `StateTransitionError` and rejecting the duplicate operation.*
3. *Only after the state update commits does Celery receive the `resume_workflow_run_task` dispatch."*

---

### Q4: "How does the Input Contract architecture bridge developers and business users?"
**Answer**:
*"In traditional engines, triggers expect raw JSON. But business users cannot be expected to know internal parameter keys like `steps.node_1.amount`.*
*In FlowForge, the developer configures an `input_contract` in Studio specifying keys, human-friendly labels, data types, and required constraints.*
*The Portal reads this contract to automatically render a clean HTML form.*
*Furthermore, if the user submits a natural-language description, our AI parser embeds the contract into a zero-shot extraction prompt to populate the form fields and detect any missing required parameters, asking the user a friendly clarification question."*

---

### Q5: "What was the root cause of the floating condition node handles and how did you resolve it?"
**Answer**:
*"In React Flow, custom nodes require explicit `<Handle>` declarations with unique IDs when multiple handles of the same type exist on a single edge.*
*The condition node needed to branch execution into TRUE and FALSE paths. Originally, condition nodes had duplicated handle elements at identical coordinates, intercepting pointer events, and newly created edges lacked `sourceHandle` attributes.*
*We resolved this by creating two distinct, named handles (`id='true'` in emerald green and `id='false'` in red) positioned on opposite sides of the node bottom, and updating the canvas connection handlers to automatically bind to the intended handle, ensuring clean, non-floating visual routing."*
