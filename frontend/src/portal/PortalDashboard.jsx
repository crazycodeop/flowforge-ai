import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  FileText,
  AlertCircle,
} from "lucide-react";
import { api } from "../api/client";

export default function PortalDashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [wfList, reqList, appList] = await Promise.all([
          api.listPortalWorkflows().catch(() => []),
          api.listPortalRequests(10, 0).catch(() => []),
          api.listPortalPendingApprovals().catch(() => []),
        ]);
        if (isMounted) {
          setWorkflows(wfList);
          setRequests(reqList);
          setPendingApprovals(appList);
        }
      } catch (err) {
        console.error("Failed to load portal dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const completedCount = requests.filter((r) => r.status === "SUCCEEDED").length;
  const processingCount = requests.filter((r) => r.status === "RUNNING" || r.status === "PENDING").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "24px" }}>
      {/* Hero Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
          borderRadius: "8px",
          padding: isMobile ? "18px 16px" : "24px 28px",
          color: "#ffffff",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? "14px" : "20px",
          boxShadow: "0 4px 12px rgba(13, 148, 136, 0.15)",
        }}
      >
        <div>
          <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 700, marginBottom: "4px" }}>
            Welcome to the FlowForge Client Portal
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "13px", opacity: 0.9, maxWidth: "600px", lineHeight: 1.4 }}>
            Submit business inquiries, trigger AI-powered automated resolutions, track processing statuses, and review compliance approvals without technical complexity.
          </div>
        </div>
        <Link
          to="/portal/new"
          className="btn"
          style={{
            background: "#ffffff",
            color: "#0f766e",
            fontWeight: 600,
            padding: isMobile ? "10px 16px" : "8px 16px",
            border: "none",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            justifyContent: "center",
            width: isMobile ? "100%" : "auto",
            flexShrink: 0,
          }}
        >
          <PlusCircle size={16} />
          <span>New Request</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: isMobile ? "10px" : "16px",
        }}
      >
        <div className="card" style={{ padding: isMobile ? "12px 14px" : "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", marginBottom: "6px" }}>
            <span style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 600, textTransform: "uppercase" }}>Active Requests</span>
            <Clock size={15} color="#0284c7" />
          </div>
          <div style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 700, color: "#0f172a" }}>{processingCount}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>In flight / queued</div>
        </div>

        <div className="card" style={{ padding: isMobile ? "12px 14px" : "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", marginBottom: "6px" }}>
            <span style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 600, textTransform: "uppercase" }}>Approvals</span>
            <ShieldCheck size={15} color="#d97706" />
          </div>
          <div style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 700, color: "#d97706" }}>{pendingApprovals.length}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Awaiting review</div>
        </div>

        <div className="card" style={{ padding: isMobile ? "12px 14px" : "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", marginBottom: "6px" }}>
            <span style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 600, textTransform: "uppercase" }}>Completed</span>
            <CheckCircle2 size={15} color="#059669" />
          </div>
          <div style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 700, color: "#059669" }}>{completedCount}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Resolved</div>
        </div>

        <div className="card" style={{ padding: isMobile ? "12px 14px" : "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#64748b", marginBottom: "6px" }}>
            <span style={{ fontSize: isMobile ? "10px" : "11px", fontWeight: 600, textTransform: "uppercase" }}>Avg SLA Time</span>
            <Sparkles size={15} color="#0d9488" />
          </div>
          <div style={{ fontSize: isMobile ? "22px" : "26px", fontWeight: 700, color: "#0f172a" }}>18.4s</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Autonomous turnaround</div>
        </div>
      </div>

      {/* Available Automated Services Catalog */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: isMobile ? "15px" : "16px", fontWeight: 700, color: "#0f172a" }}>Available Automated Services</div>
          <Link to="/portal/new" style={{ fontSize: "12px", color: "#0d9488", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
            <span>View All</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(clamp(260px, 100%, 340px), 1fr))", gap: "14px" }}>
          {workflows.map((wf) => {
            const isRefund = wf.name.toLowerCase().includes("refund");
            const Icon = isRefund ? Shield : Zap;
            const accentColor = isRefund ? "#d97706" : "#0d9488";
            const fieldCount = wf.input_contract?.fields?.length || 0;

            return (
              <div
                key={wf.id}
                className="card"
                style={{
                  padding: isMobile ? "16px" : "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: isRefund ? "#fffbeb" : "#f0fdfa",
                        border: `1px solid ${isRefund ? "#fde68a" : "#99f6e4"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} color={accentColor} />
                    </div>
                    <span className="badge badge-published">v{wf.latest_version} Published</span>
                  </div>

                  <div style={{ fontSize: isMobile ? "14px" : "15px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                    {wf.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4, marginBottom: "16px" }}>
                    {wf.description}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: "12px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {fieldCount} input field{fieldCount !== 1 ? "s" : ""} • AI Enabled
                  </span>
                  <Link
                    to={`/portal/new/${wf.id}`}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: "12px", justifyContent: "center" }}
                  >
                    <span>Submit Request</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Approvals Alert Bar (if any) */}
      {pendingApprovals.length > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            padding: isMobile ? "12px 14px" : "14px 18px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: isMobile ? "10px" : "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400e" }}>
                You have {pendingApprovals.length} pending approval request{pendingApprovals.length !== 1 ? "s" : ""} awaiting decision
              </div>
              <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px" }}>
                Review AI-generated evidence, verify refund thresholds, and authorize payouts.
              </div>
            </div>
          </div>
          <Link
            to="/portal/approvals"
            className="btn btn-sm"
            style={{
              background: "#d97706",
              color: "#ffffff",
              border: "none",
              justifyContent: "center",
              width: isMobile ? "100%" : "auto",
              flexShrink: 0,
            }}
          >
            <span>Review Queue</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Recent Client Requests */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ fontSize: isMobile ? "15px" : "16px", fontWeight: 700, color: "#0f172a" }}>Recent Inquiries & Requests</div>
          <Link to="/portal/requests" style={{ fontSize: "12px", color: "#0d9488", textDecoration: "none", fontWeight: 600 }}>
            View Full History →
          </Link>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Service Name</th>
                <th>Summary Preview</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    No requests submitted yet. Click "New Request" to start your first automated workflow.
                  </td>
                </tr>
              ) : (
                requests.slice(0, 5).map((r) => {
                  const isSucceeded = r.status === "SUCCEEDED";
                  const isPaused = r.status === "PAUSED";
                  const isFailed = r.status === "FAILED";

                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#0d9488", fontWeight: 600 }}>
                        {r.id.slice(0, 8)}...
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{r.workflow_name}</td>
                      <td style={{ color: "#64748b", maxWidth: isMobile ? "180px" : "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.summary_preview || "Processing request..."}
                      </td>
                      <td>
                        {isSucceeded && <span className="badge badge-success">✓ Completed</span>}
                        {isPaused && <span className="badge badge-warning">⏸ Awaiting Approval</span>}
                        {isFailed && <span className="badge badge-danger">✕ Rejected</span>}
                        {!isSucceeded && !isPaused && !isFailed && (
                          <span className="badge badge-primary">⟳ Processing</span>
                        )}
                      </td>
                      <td style={{ color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {new Date(r.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td>
                        <Link
                          to={`/portal/requests/${r.id}`}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: "11px", gap: "4px", whiteSpace: "nowrap" }}
                        >
                          <span>Track</span>
                          <ArrowRight size={11} />
                        </Link>
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
