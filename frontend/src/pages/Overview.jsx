import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Workflow,
  Plus,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";

export default function Overview() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [wfData, readyData] = await Promise.all([
          api.listWorkflows().catch(() => []),
          api.getReadiness().catch(() => null),
        ]);
        setWorkflows(wfData || []);
        setReadiness(readyData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPublished = workflows.filter((w) => w.latest_version !== null).length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Welcome Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            FlowForge Operational Control
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Design, execute, monitor, and evaluate reliable AI-powered workflows.
          </p>
        </div>
        <button
          onClick={() => navigate("/workflows?action=new")}
          className="btn btn-primary"
        >
          <Plus size={15} />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Operational Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {/* Card 1: Workflows */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Total Workflows</span>
            <Layers size={16} color="var(--accent-ai)" />
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, marginTop: "8px", color: "var(--text-main)" }}>
            {loading ? "..." : workflows.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            {totalPublished} published immutable versions
          </div>
        </div>

        {/* Card 2: Persistence Health */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>State Store (PostgreSQL)</span>
            <Database size={16} color="var(--status-success)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <span className={`status-dot ${readiness?.database?.healthy ? "status-dot-active" : ""}`} />
            <span style={{ fontSize: "16px", fontWeight: 600 }}>
              {readiness?.database?.healthy ? "Healthy & Synced" : "Checking..."}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Authoritative source of truth
          </div>
        </div>

        {/* Card 3: Worker & Broker Health */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            <span>Task Broker (Redis / Celery)</span>
            <Cpu size={16} color="var(--accent-ai)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <span className={`status-dot ${readiness?.redis?.healthy ? "status-dot-active" : ""}`} />
            <span style={{ fontSize: "16px", fontWeight: 600 }}>
              {readiness?.redis?.healthy ? "Operational" : "Checking..."}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Async step scheduling ready
          </div>
        </div>
      </div>

      {/* Recent Workflows Section */}
      <section className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 600 }}>Recent Workflows</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Active orchestration graphs in this workspace
            </p>
          </div>
          <Link to="/workflows" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>View All</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Workflow List or Empty State */}
        {workflows.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "var(--surface-subtle)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px",
                color: "var(--accent-ai)",
              }}
            >
              <Workflow size={22} />
            </div>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>No workflows created yet</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "420px", margin: "6px auto 16px" }}>
              Workflows chain deterministic steps, AI extraction, and human gates into resilient, repeatable pipelines.
            </p>
            <button
              onClick={() => navigate("/workflows?action=new")}
              className="btn btn-primary"
            >
              <Plus size={14} />
              <span>Create First Workflow</span>
            </button>
          </div>
        ) : (
          <div>
            {workflows.slice(0, 5).map((wf) => (
              <div
                key={wf.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                  transition: "background 0.1s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: "var(--accent-ai-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-ai)",
                    }}
                  >
                    <Workflow size={16} />
                  </div>
                  <div>
                    <Link
                      to={`/workflows/${wf.id}`}
                      style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-main)", textDecoration: "none" }}
                    >
                      {wf.name}
                    </Link>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {wf.description || "No description provided"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {wf.latest_version ? (
                    <span className="badge badge-published">v{wf.latest_version} Published</span>
                  ) : (
                    <span className="badge badge-draft">Draft</span>
                  )}
                  <Link to={`/workflows/${wf.id}`} className="btn btn-secondary btn-sm">
                    Open Builder
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
