import React, { useEffect, useState } from "react";
import { Server, Database, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../api/client";

export default function SystemStatus() {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getReadiness();
      setReadiness(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>System Health & Readiness</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Operational diagnostics for PostgreSQL persistence and Celery message broker.
          </p>
        </div>
        <button onClick={checkStatus} disabled={loading} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "var(--status-danger-bg)", border: "1px solid var(--status-danger-border)", borderRadius: "6px", color: "var(--status-danger)", fontSize: "13px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {/* PostgreSQL Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} color="var(--accent-ai)" />
              <span style={{ fontWeight: 600 }}>PostgreSQL</span>
            </div>
            <span className={`badge ${readiness?.database?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.database?.healthy ? "Online" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
            {readiness?.database?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-subtle)", borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
            Port 5433 • Schema Migrations Applied
          </div>
        </div>

        {/* Redis Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={18} color="var(--accent-ai)" />
              <span style={{ fontWeight: 600 }}>Redis Message Broker</span>
            </div>
            <span className={`badge ${readiness?.redis?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.redis?.healthy ? "Online" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
            {readiness?.redis?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-subtle)", borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
            Port 6379 • Broker & Result Backend
          </div>
        </div>

        {/* Celery Pipeline Card */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Server size={18} color="var(--accent-ai)" />
              <span style={{ fontWeight: 600 }}>Celery Dispatch</span>
            </div>
            <span className={`badge ${readiness?.celery?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.celery?.healthy ? "Ready" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "10px" }}>
            {readiness?.celery?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-subtle)", borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
            Task Queue Ready • Prefork Concurrency 4
          </div>
        </div>
      </div>
    </div>
  );
}
