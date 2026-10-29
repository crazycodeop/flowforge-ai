# ADR 0005: Plain JavaScript React with React Flow for Visual Workflow Canvas

## Context
The visual workflow builder requires an interactive graph interface for adding, connecting, and configuring workflow nodes, while adhering to the technical stack specification (React + plain JavaScript with JSDoc, Vite, React Flow).

## Decision
We build the frontend using React 18+ with Vite and React Flow in standard JavaScript:
- Node components represent registered engine node types (Trigger, AI Classify, Structured Extract, Retrieval, Condition, Human Approval, Output).
- Edge validation on the canvas mirrors backend graph rules (preventing self-loops and providing visual feedback).
- Backend remains authoritative for graph validation; canvas calls `/api/v1/workflows/validate` on change or publish.
- Clean separation between API client layer, state management, and presentational components.

## Consequences
- Positive: Excellent developer experience, standard tooling, highly customizable canvas nodes with React Flow, zero TypeScript compilation overhead.
- Negative: Requires disciplined JSDoc annotations and component prop verification to maintain frontend code clarity.
