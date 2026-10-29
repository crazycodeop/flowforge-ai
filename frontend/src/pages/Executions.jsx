import React, { useEffect, useState } from "react";
import {
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  XCircle,
  RefreshCw,
  X,
  ChevronRight,
  Coins,
  Cpu,
} from "lucide-react";
import { api } from "../api/client";

export default function Executions() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRun, setSelectedRun] = useState(null);
  const [runSteps, setRunSteps] = useState([]);
  const [runEvents, setRunEvents] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.listRuns();
      setRuns(data || []);
    } catch {
      // Default to empty array on failure
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    try {
      setLoadingDetail(true);
      const [steps, events] = await Promise.all([
        api.getRunSteps(run.id),
        api.getRunEvents(run.id),
      ]);
      setRunSteps(steps || []);
      setRunEvents(events || []);
    } catch {
      setRunSteps([]);
      setRunEvents([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "SUCCEEDED":
        return <span className="badge badge-published" style={{ background: "#ecfdf5", color: "#065f46" }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Succeeded</span>;
      case "RUNNING":
        return <span className="badge badge-draft" style={{ background: "#eef2ff", color: "#4338ca" }}><RefreshCw size={12} className="spin" style={{ marginRight: 4 }} /> Running</span>;
      case "PAUSED":
        return <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}><PauseCircle size={12} style={{ marginRight: 4 }} /> Paused</span>;
      case "FAILED":
        return <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}><XCircle size={12} style={{ marginRight: 4 }} /> Failed</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Workflow Executions</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Real-time execution traces, step latencies, token consumption, and audit events.
          </p>
        </div>
        <button onClick={fetchRuns} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
        {["ALL", "RUNNING", "PAUSED", "SUCCEEDED", "FAILED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className="btn btn-sm"
            style={{
              background: statusFilter === tab ? "var(--surface-card)" : "transparent",
              borderColor: statusFilter === tab ? "var(--border-strong)" : "transparent",
              color: statusFilter === tab ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: statusFilter === tab ? 600 : 400,
            }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filteredRuns.length === 0 ? (
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
          <h3 style={{ fontSize: "15px", fontWeight: 600 }}>No execution runs found</h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 0" }}>
            {statusFilter === "ALL"
              ? "Trigger a workflow run from the Workflow Builder to record live background traces."
              : `No runs currently match the filter '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--surface-subtle)", borderBottom: "1px solid var(--border-light)", color: "var(--text-muted)", fontSize: "12px" }}>
                <th style={{ padding: "12px 16px" }}>Run ID</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Tokens</th>
                <th style={{ padding: "12px 16px" }}>Est. Cost</th>
                <th style={{ padding: "12px 16px" }}>Started</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => handleSelectRun(r)}
                  style={{
                    borderBottom: "1px solid var(--border-light)",
                    cursor: "pointer",
                    background: selectedRun?.id === r.id ? "var(--surface-subtle)" : "transparent",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                    {r.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: "12px 16px" }}>{getStatusBadge(r.status)}</td>
                  <td style={{ padding: "12px 16px" }}>{r.total_tokens || 0}</td>
                  <td style={{ padding: "12px 16px" }}>${(r.total_cost_usd || 0).toFixed(4)}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                    {r.started_at ? new Date(r.started_at).toLocaleTimeString() : "Pending"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button className="btn btn-secondary btn-sm" style={{ padding: "2px 8px", fontSize: "11px" }}>
                      Inspect <ChevronRight size={12} style={{ marginLeft: 2 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution Detail Drawer / Modal */}
      {selectedRun && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "600px",
            maxWidth: "90vw",
            background: "var(--surface-card)",
            borderLeft: "1px solid var(--border-light)",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.1)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Run Trace: {selectedRun.id.slice(0, 8)}</h3>
                {getStatusBadge(selectedRun.status)}
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {selectedRun.id}
              </p>
            </div>
            <button onClick={() => setSelectedRun(null)} className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Run Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div className="card" style={{ padding: "12px", background: "var(--surface-subtle)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Tokens</div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "2px" }}>{selectedRun.total_tokens || 0}</div>
              </div>
              <div className="card" style={{ padding: "12px", background: "var(--surface-subtle)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Est. Cost (USD)</div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "2px" }}>${(selectedRun.total_cost_usd || 0).toFixed(4)}</div>
              </div>
              <div className="card" style={{ padding: "12px", background: "var(--surface-subtle)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Status</div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>{selectedRun.status}</div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>Step Execution Timeline</h4>
              {loadingDetail ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading step details...</div>
              ) : runSteps.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No steps recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {runSteps.map((s, idx) => (
                    <div key={s.id} className="card" style={{ padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 600, fontSize: "13px" }}>{s.node_id}</span>
                          <span className="badge badge-draft" style={{ fontSize: "10px" }}>{s.node_type}</span>
                        </div>
                        {getStatusBadge(s.status)}
                      </div>

                      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                        <span>Latency: {s.latency_ms ? `${s.latency_ms}ms` : "-"}</span>
                        <span>Tokens: {s.total_tokens || 0}</span>
                        <span>Attempts: {s.attempt_count}</span>
                      </div>

                      {s.output_data && (
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>Output:</div>
                          <pre style={{ margin: 0, padding: "8px", background: "var(--surface-subtle)", borderRadius: "4px", fontSize: "11px", maxHeight: "120px", overflowY: "auto" }}>
                            {JSON.stringify(s.output_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Events */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>Chronological Audit Trail</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {runEvents.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "6px 8px", background: "var(--surface-subtle)", borderRadius: "4px" }}>
                    <span style={{ fontWeight: 600, color: "var(--accent-ai)" }}>{e.event_type}</span>
                    <span style={{ color: "var(--text-muted)" }}>{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
