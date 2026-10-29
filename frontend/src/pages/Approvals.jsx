import React from "react";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function Approvals() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Human Approval Queue</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
          Pending approval gates awaiting human decision before proceeding.
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
            color: "#10b981",
          }}
        >
          <ShieldCheck size={24} />
        </div>
        <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Approval Queue Empty</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 0" }}>
          No workflows are currently paused pending review. High-risk ticket triage decisions routed through Human Approval nodes will appear here.
        </p>
      </div>
    </div>
  );
}
