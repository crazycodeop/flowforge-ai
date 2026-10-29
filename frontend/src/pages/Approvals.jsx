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
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Human Approval Queue</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Pending gates where execution is paused awaiting authorized reviewer decision.
          </p>
        </div>
        <button onClick={fetchApprovals} disabled={loading} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {approvals.length === 0 ? (
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
            No workflows are currently paused pending review. High-risk actions routed through Human Approval nodes will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {approvals.map((req) => (
            <div key={req.id} className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700 }}>{req.title}</h3>
                    <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                      Pending Decision
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Run ID: {req.workflow_run_id} • Step ID: {req.step_run_id}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                  <Clock size={13} />
                  <span>{new Date(req.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              {req.description && (
                <div style={{ fontSize: "13px", padding: "10px", background: "var(--surface-subtle)", borderRadius: "4px", marginBottom: "12px" }}>
                  {req.description}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Optional review comment or justification..."
                  value={comments[req.id] || ""}
                  onChange={(e) => setComments({ ...comments, [req.id]: e.target.value })}
                  className="input"
                  style={{ flex: 1, fontSize: "12px" }}
                />

                <button
                  onClick={() => handleDecision(req.id, "REJECTED")}
                  disabled={actionInProgress === req.id}
                  className="btn btn-secondary btn-sm"
                  style={{ color: "#ef4444", borderColor: "#fecaca" }}
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleDecision(req.id, "APPROVED")}
                  disabled={actionInProgress === req.id}
                  className="btn btn-primary btn-sm"
                  style={{ background: "#10b981", borderColor: "#10b981", color: "#fff" }}
                >
                  <CheckCircle2 size={14} />
                  <span>{actionInProgress === req.id ? "Submitting..." : "Approve & Resume"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
