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
    <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            System Status & Diagnostics
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Operational diagnostics for PostgreSQL persistence, Upstash Redis broker, and Celery workers.
          </p>
        </div>
        <button onClick={checkStatus} disabled={loading} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "6px",
            color: "#f87171",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "16px" }}>
        {/* PostgreSQL Card */}
        <div style={{ padding: "20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={16} color="#8b5cf6" />
              <span style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "13px" }}>Supabase PostgreSQL</span>
            </div>
            <span className={`badge ${readiness?.database?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.database?.healthy ? "Online" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
            {readiness?.database?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid #222222", paddingTop: "8px", fontFamily: "var(--font-mono)" }}>
            Pooler Active • SSL Mode Required
          </div>
        </div>

        {/* Redis Card */}
        <div style={{ padding: "20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={16} color="#06b6d4" />
              <span style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "13px" }}>Upstash Redis Broker</span>
            </div>
            <span className={`badge ${readiness?.redis?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.redis?.healthy ? "Online" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
            {readiness?.redis?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid #222222", paddingTop: "8px", fontFamily: "var(--font-mono)" }}>
            TLS Encrypted • Prefetch Locked to 1
          </div>
        </div>

        {/* Celery Pipeline Card */}
        <div style={{ padding: "20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Server size={16} color="#10b981" />
              <span style={{ fontWeight: 600, color: "#f5f5f5", fontSize: "13px" }}>Celery Distributed Workers</span>
            </div>
            <span className={`badge ${readiness?.celery?.healthy ? "badge-published" : "badge-danger"}`}>
              {readiness?.celery?.healthy ? "Ready" : "Offline"}
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: 1.4 }}>
            {readiness?.celery?.details || "Connecting..."}
          </p>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid #222222", paddingTop: "8px", fontFamily: "var(--font-mono)" }}>
            Task Queue Ready • Dynamic Lease Recovery
          </div>
        </div>
      </div>
    </div>
  );
}
