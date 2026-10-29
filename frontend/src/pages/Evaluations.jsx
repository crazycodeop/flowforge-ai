import React from "react";
import { Gauge, Sparkles } from "lucide-react";

export default function Evaluations() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>AI Quality Evaluations</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
          Benchmark accuracy, classification F1, and retrieval grounding against versioned datasets.
        </p>
      </div>

      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "var(--accent-ai-subtle)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px",
            color: "var(--accent-ai)",
          }}
        >
          <Gauge size={24} />
        </div>
        <h3 style={{ fontSize: "15px", fontWeight: 600 }}>No evaluation runs configured</h3>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 0" }}>
          FlowForge AI benchmarks support-ticket workflows across 50–100 labelled test cases to objectively measure classification accuracy, latency, and token cost.
        </p>
      </div>
    </div>
  );
}
