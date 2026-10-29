import React from "react";
import { PlayCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export default function Executions() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Workflow Executions</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
          Chronological execution traces, step latencies, and token usage history.
        </p>
      </div>

      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--surface-subtle)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            color: "var(--accent-ai)",
          }}
        >
          <PlayCircle size={24} />
        </div>
        <h3 style={{ fontSize: "15px", fontWeight: 600 }}>No execution runs recorded yet</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 0" }}>
          Publish a workflow in the Workflow Builder to trigger background execution runs via Celery workers with step-level persistence.
        </p>
      </div>
    </div>
  );
}
