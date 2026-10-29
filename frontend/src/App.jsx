import React, { useEffect, useState } from "react";
import { api } from "./api/client";

/**
 * Main application layout and diagnostics view.
 * @returns {React.ReactElement}
 */
export default function App() {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
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
    fetchStatus();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "-0.02em" }}>
            FlowForge AI
          </div>
          <span className="badge badge-neutral">v0.1.0</span>
        </div>
        <nav style={{ display: "flex", gap: "20px", fontSize: "13px" }}>
          <a href="#workflows" style={{ color: "var(--text-secondary)" }}>Workflows</a>
          <a href="#evaluations" style={{ color: "var(--text-secondary)" }}>Evaluations</a>
          <a href="#approvals" style={{ color: "var(--text-secondary)" }}>Approvals</a>
          <a href="#system" style={{ color: "var(--text-primary)", fontWeight: 500 }}>System</a>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "32px 28px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, marginBottom: "8px" }}>
            Platform Foundation & Diagnostics
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Core infrastructure, database persistence, and distributed worker services.
          </p>
        </div>

        {/* Diagnostics Card */}
        <section
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Infrastructure Readiness</h2>
            <button onClick={fetchStatus} disabled={loading} style={{ fontSize: "12px" }}>
              {loading ? "Checking..." : "Refresh Status"}
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--accent-danger)",
                borderRadius: "6px",
                color: "#fca5a5",
                marginBottom: "16px",
              }}
            >
              Failed to connect to backend: {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            {/* PostgreSQL Component */}
            <div
              style={{
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "6px",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 500 }}>PostgreSQL</span>
                <span className={`badge ${readiness?.database?.healthy ? "badge-success" : "badge-danger"}`}>
                  {readiness?.database?.healthy ? "Healthy" : "Offline"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {readiness?.database?.details || "Checking database connectivity..."}
              </p>
            </div>

            {/* Redis Component */}
            <div
              style={{
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "6px",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 500 }}>Redis Broker</span>
                <span className={`badge ${readiness?.redis?.healthy ? "badge-success" : "badge-danger"}`}>
                  {readiness?.redis?.healthy ? "Healthy" : "Offline"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {readiness?.redis?.details || "Checking Redis broker..."}
              </p>
            </div>

            {/* Celery Worker Component */}
            <div
              style={{
                border: "1px solid var(--border-color)",
                padding: "16px",
                borderRadius: "6px",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 500 }}>Celery Dispatch</span>
                <span className={`badge ${readiness?.celery?.healthy ? "badge-success" : "badge-danger"}`}>
                  {readiness?.celery?.healthy ? "Ready" : "Offline"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                {readiness?.celery?.details || "Checking worker pipeline..."}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
