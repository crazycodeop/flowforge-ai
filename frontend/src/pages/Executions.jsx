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
  Search,
  Activity,
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
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.listRuns();
      const runList = data || [];
      setRuns(runList);
      if (runList.length > 0) {
        setSelectedRun((prev) => {
          if (!prev) {
            handleSelectRun(runList[0]);
            return runList[0];
          }
          return prev;
        });
      }
    } catch {
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
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.id.toLowerCase().includes(q) || (r.status && r.status.toLowerCase().includes(q));
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <span className="badge badge-published" style={{ padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>
            <span>✓</span> Succeeded
          </span>
        );
      case "RUNNING":
        return (
          <span
            className="badge badge-ai"
            style={{ padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}
          >
            <RefreshCw size={11} className="spin" />
            <span>Running</span>
          </span>
        );
      case "PAUSED":
        return (
          <span className="badge badge-warning" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <PauseCircle size={11} />
            <span>Paused</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="badge badge-danger" style={{ padding: "2px 8px", fontSize: "11px" }}>
            <XCircle size={11} />
            <span>Failed</span>
          </span>
        );
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            Executions
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Observability traces, DAG step latencies, token consumption, and audit events.
          </p>
        </div>
        <button onClick={fetchRuns} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {/* Segmented Filter Pills */}
        <div className="filter-pills-container">
          {["ALL", "RUNNING", "PAUSED", "SUCCEEDED", "FAILED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`filter-pill ${statusFilter === tab ? "active" : ""}`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: "min(260px, 100%)", flex: "1 1 200px" }}>
          <Search
            size={14}
            color="#737373"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Search run IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: "32px", fontSize: "12px", width: "100%" }}
          />
        </div>
      </div>

      {/* Runs Table */}
      {filteredRuns.length === 0 ? (
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
              color: "#8b5cf6",
            }}
          >
            <PlayCircle size={20} />
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>No execution runs found</h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "440px", margin: "6px auto 0" }}>
            {statusFilter === "ALL"
              ? "Trigger a workflow run from the Workflow Builder to record live background traces."
              : `No runs currently match the filter '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div
          className="table-container"
          style={{
            background: "#141414",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
          }}
        >
          <table className="table" style={{ minWidth: "640px" }}>
            <thead>
              <tr>
                <th style={{ width: "24%" }}>Execution Run ID</th>
                <th style={{ width: "18%" }}>Status</th>
                <th style={{ width: "16%" }}>Tokens</th>
                <th style={{ width: "16%" }}>Est. Cost</th>
                <th style={{ width: "16%" }}>Started</th>
                <th style={{ width: "10%", textAlign: "right" }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((r) => {
                const isSelected = selectedRun?.id === r.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => handleSelectRun(r)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#1c1c1c" : "transparent",
                    }}
                  >
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#f5f5f5" }}>
                      {r.id.slice(0, 8)}...
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      {r.total_tokens || 0}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      ${(r.total_cost_usd || 0).toFixed(4)}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {r.started_at ? new Date(r.started_at).toLocaleTimeString() : "Pending"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                      >
                        <span>Details</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution Detail Drawer with Backdrop */}
      {selectedRun && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div
            onClick={() => setSelectedRun(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              animation: "fadeInOverlay 0.2s ease",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 101,
              width: "min(580px, 100vw)",
              maxWidth: "100%",
              height: "100%",
              background: "#141414",
              borderLeft: "1px solid #262626",
              boxShadow: "-12px 0 35px rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.25s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #262626",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#111111",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5", margin: 0 }}>
                    Run: {selectedRun.id.slice(0, 8)}
                  </h3>
                  {getStatusBadge(selectedRun.status)}
                </div>
                <p style={{ fontSize: "11px", color: "#737373", fontFamily: "var(--font-mono)", margin: "3px 0 0 0", wordBreak: "break-all" }}>
                  {selectedRun.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                style={{ background: "transparent", border: "none", color: "#737373", cursor: "pointer", padding: "4px" }}
                aria-label="Close drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "clamp(14px, 3vw, 20px)", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Run Metrics Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px" }}>
              <div style={{ padding: "12px", background: "#1a1a1a", border: "1px solid #262626", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#737373" }}>Total Tokens</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                  {selectedRun.total_tokens || 0}
                </div>
              </div>
              <div style={{ padding: "12px", background: "#1a1a1a", border: "1px solid #262626", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#737373" }}>Est. Cost (USD)</div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5", marginTop: "2px", fontFamily: "var(--font-mono)" }}>
                  ${(selectedRun.total_cost_usd || 0).toFixed(4)}
                </div>
              </div>
              <div style={{ padding: "12px", background: "#1a1a1a", border: "1px solid #262626", borderRadius: "6px" }}>
                <div style={{ fontSize: "11px", color: "#737373" }}>Status</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5", marginTop: "4px" }}>
                  {selectedRun.status}
                </div>
              </div>
            </div>

            {/* Steps Timeline */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#737373", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Step Execution Timeline
              </h4>
              {loadingDetail ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading step details...</div>
              ) : runSteps.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No steps recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {runSteps.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "12px",
                        background: "#181818",
                        border: "1px solid #262626",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#737373" }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "#f5f5f5" }}>{s.node_id}</span>
                          <span className="badge badge-draft" style={{ fontSize: "10px" }}>{s.node_type}</span>
                        </div>
                        {getStatusBadge(s.status)}
                      </div>

                      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px", fontFamily: "var(--font-mono)" }}>
                        <span>Latency: {s.latency_ms ? `${s.latency_ms}ms` : "-"}</span>
                        <span>Tokens: {s.total_tokens || 0}</span>
                        <span>Attempts: {s.attempt_count}</span>
                      </div>

                      {s.output_data && (
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#a3a3a3", marginBottom: "3px" }}>Output:</div>
                          <pre
                            style={{
                              margin: 0,
                              padding: "8px 10px",
                              background: "#0d0d0d",
                              border: "1px solid #222222",
                              borderRadius: "4px",
                              fontSize: "11px",
                              color: "#a5b4fc",
                              fontFamily: "var(--font-mono)",
                              maxHeight: "130px",
                              overflowY: "auto",
                            }}
                          >
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
              <h4 style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "#737373", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Chronological Audit Trail
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {runEvents.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      padding: "6px 10px",
                      background: "#181818",
                      border: "1px solid #222222",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#8b5cf6" }}>{e.event_type}</span>
                    <span style={{ color: "#737373" }}>{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
