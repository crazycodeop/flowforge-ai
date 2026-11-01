import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  PlayCircle,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  Cpu,
  UserCheck,
  Code,
  ArrowRight,
  Zap,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";

export default function UseCases() {
  const modal = useModal();
  const navigate = useNavigate();
  const [runningDemo, setRunningDemo] = useState(false);
  const [demoTicket, setDemoTicket] = useState(
    "I was charged twice on my Amex card for $89.99 on invoice INV-2026. Please refund the duplicate transaction immediately."
  );
  const [selectedCase, setSelectedCase] = useState("support");

  const handleRunLiveDemo = async () => {
    setRunningDemo(true);
    try {
      // 1. Ensure knowledge base is seeded
      try {
        await api.seedKnowledge();
      } catch {
        // Safe to continue if already seeded
      }

      // 2. Look for the flagship workflow
      const workflows = await api.listWorkflows();
      let flagship = workflows.find(
        (w) =>
          w.name.toLowerCase().includes("support") ||
          w.name.toLowerCase().includes("flagship") ||
          w.name.toLowerCase().includes("triage")
      );

      // If no workflow found, use first available or trigger run
      if (!flagship && workflows.length > 0) {
        flagship = workflows[0];
      }

      if (flagship) {
        const runRes = await api.triggerRun(flagship.id, {
          input_payload: {
            ticket_text: demoTicket,
            customer_email: "jane.doe@enterprise-client.com",
          },
        });
        navigate("/executions");
      } else {
        await modal.alert({ title: "Workflow Required", message: "Please create or publish a workflow in the Workflows tab before triggering live demo.", variant: "warning" });
      }
    } catch (err) {
      await modal.alert({ title: "Demo Launch Error", message: err.message || "Failed to start demo workflow.", variant: "danger" });
    } finally {
      setRunningDemo(false);
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "48px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            background: "rgba(139, 92, 246, 0.15)",
            color: "#a78bfa",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          <Sparkles size={14} />
          <span>Interactive Enterprise Blueprints</span>
        </div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text-main)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Enterprise Workflow Use Cases & Live Demonstrations
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
          Explore how FlowForge AI coordinates deterministic business logic, semantic LLM reasoning, and human-in-the-loop governance.
        </p>
      </div>

      {/* Case Selector Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            id: "support",
            title: "Customer Support Triage & Auto-Refund",
            tag: "Flagship Live Demo",
            icon: Sparkles,
            desc: "AI classification, semantic policy search, entity extraction, and human approval for >$50 refunds.",
          },
          {
            id: "invoice",
            title: "Accounts Payable & Invoice Auditing",
            tag: "Financial Operations",
            icon: DollarSign,
            desc: "Document extraction, 3-way PO matching, deterministic arithmetic verification, and ERP reconciliation.",
          },
          {
            id: "compliance",
            title: "Legal Contract & NDA Compliance",
            tag: "Governance & Risk",
            icon: ShieldCheck,
            desc: "Multi-party liability extraction, clause conformance analysis against corporate playbooks, and escalation.",
          },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCase === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedCase(item.id)}
              style={{
                padding: "20px",
                background: isSelected ? "#1c1c1c" : "var(--surface-card)",
                border: isSelected ? "1px solid #8b5cf6" : "1px solid var(--border-light)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <Icon size={20} color={isSelected ? "#8b5cf6" : "#737373"} />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: isSelected ? "#4c1d95" : "var(--surface-subtle)",
                    color: isSelected ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {item.tag}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* CASE 1: Customer Support Triage */}
      {selectedCase === "support" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Live Demonstration Runner Card */}
          <div
            className="card"
            style={{
              padding: "28px",
              background: "#161616",
              border: "1px solid #262626",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-main)" }}>
                  Trigger Live Support Triage Execution
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  Execute the real flagship DAG pipeline against our live Groq LPU inference engine and Supabase Postgres database.
                </p>
              </div>
              <span className="badge badge-primary">Real-Time Execution</span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                Simulated Customer Support Ticket
              </label>
              <textarea
                value={demoTicket}
                onChange={(e) => setDemoTicket(e.target.value)}
                rows={3}
                className="input"
                style={{ width: "100%", fontFamily: "inherit", resize: "vertical" }}
              />
            </div>

            <button
              type="button"
              onClick={handleRunLiveDemo}
              disabled={runningDemo}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <PlayCircle size={16} />
              <span>{runningDemo ? "Submitting to Queue..." : "Run Workflow & View Live Trace"}</span>
            </button>
          </div>

          {/* Architecture Breakdown */}
          <div className="card" style={{ padding: "28px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--text-main)" }}>
              Responsibility Matrix: Code vs AI vs Human
            </h2>
            <div className="table-container">
              <table className="table" style={{ width: "100%", fontSize: "13px", minWidth: "600px" }}>
                <thead>
                  <tr>
                    <th>Workflow Step</th>
                    <th>Executor</th>
                    <th>Responsibility Type</th>
                    <th>Why This Choice?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>1. Ticket Ingestion</td>
                    <td>
                      <span className="badge badge-neutral">Deterministic Code</span>
                    </td>
                    <td>FastAPI Endpoint & JSON Schema validation</td>
                    <td style={{ color: "var(--text-muted)" }}>Ensures clean inputs and validates email format before invoking paid tokens.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>2. Intent Classification</td>
                    <td>
                      <span className="badge badge-primary">Groq AI (Qwen 2.5)</span>
                    </td>
                    <td>Natural language semantic classification</td>
                    <td style={{ color: "var(--text-muted)" }}>Accurately detects nuanced intents (e.g. frustrated billing dispute vs technical outage).</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>3. Policy Retrieval</td>
                    <td>
                      <span className="badge badge-neutral">Postgres Vector</span>
                    </td>
                    <td>Cosine semantic search over corporate policies</td>
                    <td style={{ color: "var(--text-muted)" }}>Grounds response in official refund limits without hallucinations.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>4. Refund Amount Condition</td>
                    <td>
                      <span className="badge badge-neutral">Deterministic Code</span>
                    </td>
                    <td>Branch routing logic (<code>amount &gt; $50.00</code>)</td>
                    <td style={{ color: "var(--text-muted)" }}>Financial limits must never be left to non-deterministic model discretion.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>5. Human Approval Gate</td>
                    <td>
                      <span className="badge badge-warning">Human Operator</span>
                    </td>
                    <td>One-click Approve / Reject in Governance Queue</td>
                    <td style={{ color: "var(--text-muted)" }}>Protects company funds while leaving a cryptographically audited paper trail.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: Accounts Payable */}
      {selectedCase === "invoice" && (
        <div className="card" style={{ padding: "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--text-main)" }}>
            Accounts Payable & Autonomous Invoice Reconciliation
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "20px" }}>
            Manual invoice processing costs enterprises $12 to $30 per invoice. FlowForge AI automates 85% of end-to-end reconciliation while eliminating fraudulent and duplicate payments.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                1. Multi-Format Ingestion
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                Extracts raw PDF line items, tax IDs, and payment terms using OCR and LLM structured schema adapters.
              </p>
            </div>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                2. 3-Way Match Verification
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                Deterministic python transform validates <code>Quantity Invoiced == Quantity Received</code> and <code>PO Total == Invoice Total</code>.
              </p>
            </div>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                3. Automated Payment Scheduling
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                If match succeeds within 0.01 tolerance, schedules ACH disbursement via ERP webhook; otherwise escalates to AP manager.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CASE 3: Legal Contract */}
      {selectedCase === "compliance" && (
        <div className="card" style={{ padding: "28px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px 0", color: "var(--text-main)" }}>
            Contract Conformance & Risk Playbook Auditing
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "20px" }}>
            Reviewing NDAs and master services agreements typically takes legal teams 3 business days. FlowForge AI performs 10-second preliminary compliance checks against internal playbook guidelines.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                1. Clause Extraction
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                AI model isolates indemnification, liability caps, non-solicitation, and governing jurisdiction clauses into structured JSON.
              </p>
            </div>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                2. Policy Gap Analysis
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                Compares extracted terms against enterprise policy knowledge collections (e.g. <code>Liability cap must be &lt;= 12 months fees</code>).
              </p>
            </div>
            <div style={{ padding: "16px", background: "var(--surface-subtle)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)", marginBottom: "4px" }}>
                3. Risk Redline Synthesis
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                Generates actionable attorney notes and proposed alternative clause wording for rapid turnaround.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
