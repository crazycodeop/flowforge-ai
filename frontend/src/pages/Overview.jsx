import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Workflow,
  Plus,
  Search,
  Globe,
  MoreHorizontal,
  Play,
  ArrowRight,
  UserPlus,
  Sparkles,
  Database,
  Cpu,
  Layers,
} from "lucide-react";
import { api } from "../api/client";

export default function Overview() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBanner, setShowBanner] = useState(true);

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
      } catch {
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeWorkflows = workflows.filter((w) => w.latest_version !== null);
  const draftWorkflows = workflows.filter((w) => w.latest_version === null);

  const displayedWorkflows = workflows.filter((w) => {
    if (activeTab === "active" && w.latest_version === null) return false;
    if (activeTab === "draft" && w.latest_version !== null) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${Math.max(1, mins)}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Overview Top Header (Render-style) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: 0 }}>
            Overview
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "none",
              color: "#a3a3a3",
              fontSize: "12px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#a3a3a3")}
          >
            <UserPlus size={14} />
            <span>Invite your team</span>
          </button>
        </div>
      </div>

      {/* Featured Banner Card (Render "Get organized with Projects" style) */}
      {showBanner && (
        <div
          style={{
            background: "#141414",
            border: "1px solid #262626",
            borderRadius: "8px",
            padding: "clamp(16px, 3vw, 24px) clamp(16px, 3.5vw, 28px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            position: "relative",
          }}
        >
          <div style={{ maxWidth: "560px", flex: "1 1 300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background: "rgba(139, 92, 246, 0.15)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a78bfa",
                  flexShrink: 0,
                }}
              >
                <Workflow size={14} />
              </div>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#f5f5f5", margin: 0 }}>
                Get organized with Workflows
              </h2>
            </div>
            <p style={{ fontSize: "13px", color: "#a3a3a3", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              Orchestrate multi-step AI pipelines with deterministic code execution, vector knowledge grounding, human-in-the-loop review gates, and automated benchmark evaluations.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/workflows?action=new")}
                className="btn btn-secondary"
                style={{ fontWeight: 600, fontSize: "12px", padding: "6px 14px" }}
              >
                <Plus size={14} />
                <span>Create your first workflow</span>
              </button>
              <Link
                to="/use-cases"
                style={{
                  fontSize: "12px",
                  color: "#8b5cf6",
                  textDecoration: "none",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>Learn more</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Right Preview Graphic */}
          <div
            style={{
              display: "none",
              background: "#0d0d0d",
              border: "1px solid #222222",
              borderRadius: "6px",
              padding: "16px 20px",
              minWidth: "280px",
              flexDirection: "column",
              gap: "8px",
            }}
            className="overview-preview-box"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1f1f1f", paddingBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#737373", textTransform: "uppercase" }}>Pipeline Engine</span>
              <span className="status-dot status-dot-active" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#f5f5f5" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8b5cf6" }} />
              <span>Customer Support Triage</span>
            </div>
            <div style={{ display: "flex", gap: "6px", fontSize: "10px", color: "#737373" }}>
              <span>Groq LPU</span> &bull; <span>Supabase Postgres</span> &bull; <span>Upstash</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workflows Section (Render "Ungrouped Services" style) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Section Heading & Filter Tabs */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
            Workflows & Services
          </h2>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            {/* Filter Pills (Render Segmented style) */}
            <div className="filter-pills-container">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`filter-pill ${activeTab === "active" ? "active" : ""}`}
              >
                Active ({activeWorkflows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("draft")}
                className={`filter-pill ${activeTab === "draft" ? "active" : ""}`}
              >
                Draft ({draftWorkflows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`filter-pill ${activeTab === "all" ? "active" : ""}`}
              >
                All ({workflows.length})
              </button>
            </div>

            {/* Search Input Box */}
            <div style={{ position: "relative", minWidth: "min(260px, 100%)", flex: "1 1 200px" }}>
              <Search
                size={14}
                color="#737373"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="input"
                style={{ paddingLeft: "32px", fontSize: "12px", width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* High-Density Workflows Table */}
        <div
          className="table-container"
          style={{
            background: "#141414",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
          }}
        >
          <table className="table" style={{ minWidth: "620px" }}>
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Workflow Name</th>
                <th style={{ width: "18%" }}>Status</th>
                <th style={{ width: "18%" }}>Runtime / Model</th>
                <th style={{ width: "15%" }}>Environment</th>
                <th style={{ width: "14%", textAlign: "right" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    Loading workflows...
                  </td>
                </tr>
              ) : displayedWorkflows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
                      {searchQuery ? `No workflows match "${searchQuery}"` : "No workflows found in this view."}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/workflows?action=new")}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={13} />
                      <span>Create workflow</span>
                    </button>
                  </td>
                </tr>
              ) : (
                displayedWorkflows.map((wf) => {
                  const isPublished = wf.latest_version !== null;
                  return (
                    <tr
                      key={wf.id}
                      onClick={() => navigate(`/workflows/${wf.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Name Column */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              background: "#1c1c1c",
                              border: "1px solid #262626",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#8b5cf6",
                              flexShrink: 0,
                            }}
                          >
                            <Globe size={12} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "#f5f5f5", textDecoration: "none" }}>
                              {wf.name}
                            </span>
                            {wf.description && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "320px",
                                  marginTop: "1px",
                                }}
                              >
                                {wf.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td>
                        {isPublished ? (
                          <span
                            className="badge badge-published"
                            style={{ padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}
                          >
                            <span style={{ fontSize: "10px" }}>✓</span>
                            <span>Deployed (v{wf.latest_version})</span>
                          </span>
                        ) : (
                          <span className="badge badge-draft" style={{ padding: "2px 8px", fontSize: "11px" }}>
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Runtime / Model Column */}
                      <td>
                        <span
                          style={{
                            padding: "2px 6px",
                            background: "#1c1c1c",
                            border: "1px solid #262626",
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "#a3a3a3",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Groq LPU
                        </span>
                      </td>

                      {/* Environment Column */}
                      <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        Production
                      </td>

                      {/* Updated Column */}
                      <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                        {formatTimeAgo(wf.updated_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
