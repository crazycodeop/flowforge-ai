import React, { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Clock } from "lucide-react";
import { api } from "../api/client";

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.listPendingApprovals();
      setApprovals(data || []);
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (approvalId, decision) => {
    try {
      setActionInProgress(approvalId);
      const comment = comments[approvalId] || "";
      await api.decideApproval(approvalId, decision, comment);
      await fetchApprovals();
    } catch (err) {
      alert(`Decision failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            Human Approval Queue
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Pending gates where execution is paused awaiting authorized reviewer decision.
          </p>
        </div>
        <button onClick={fetchApprovals} disabled={loading} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {approvals.length === 0 ? (
        <div
          style={{
            background: "#141414",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#1c1c1c",
              border: "1px solid #262626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              color: "#10b981",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>Approval Queue Clear</h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "460px", margin: "6px auto 0" }}>
            No workflows are currently paused pending review. High-risk actions routed through Human Approval nodes will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {approvals.map((req) => (
            <div
              key={req.id}
              style={{
                background: "#141414",
                border: "1px solid var(--border-light)",
                borderRadius: "6px",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5", margin: 0 }}>
                      {req.title}
                    </h3>
                    <span className="badge badge-warning" style={{ fontSize: "10px" }}>
                      Pending Decision
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", margin: "4px 0 0 0" }}>
                    Run ID: {req.workflow_run_id?.slice(0, 8)}... • Step ID: {req.step_run_id?.slice(0, 8)}...
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                  <Clock size={12} />
                  <span>{new Date(req.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              {req.description && (
                <div
                  style={{
                    fontSize: "12px",
                    padding: "10px 12px",
                    background: "#1c1c1c",
                    border: "1px solid #262626",
                    borderRadius: "4px",
                    color: "#cbd5e1",
                    marginBottom: "14px",
                  }}
                >
                  {req.description}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Optional review comment or justification..."
                  value={comments[req.id] || ""}
                  onChange={(e) => setComments({ ...comments, [req.id]: e.target.value })}
                  className="input"
                  style={{ flex: "1 1 240px", fontSize: "12px", minWidth: "min(240px, 100%)" }}
                />

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  <button
                    onClick={() => handleDecision(req.id, "REJECTED")}
                    disabled={actionInProgress === req.id}
                    className="btn btn-secondary btn-sm"
                    style={{ color: "#ef4444", minHeight: "36px" }}
                  >
                    <XCircle size={13} />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleDecision(req.id, "APPROVED")}
                    disabled={actionInProgress === req.id}
                    className="btn btn-primary btn-sm"
                    style={{ background: "#10b981", borderColor: "#059669", minHeight: "36px" }}
                  >
                    <CheckCircle2 size={13} />
                    <span>{actionInProgress === req.id ? "Submitting..." : "Approve & Resume"}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
