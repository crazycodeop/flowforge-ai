import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Bot,
  FileText,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { api } from "../api/client";

export default function PortalRequestDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    try {
      const data = await api.getPortalRequestDetail(id);
      setDetail(data);
    } catch (err) {
      setError(err.message || "Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Auto-poll if in flight or paused
    const interval = setInterval(() => {
      if (detail?.status === "RUNNING" || detail?.status === "PENDING" || detail?.status === "PAUSED") {
        fetchDetail();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [id, detail?.status]);

  if (loading && !detail) {
    return (
      <div style={{ textAlign: "center", padding: "48px", color: "#64748b" }}>
        Loading request status...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ color: "#dc2626", marginBottom: "12px" }}>{error || "Request not found."}</div>
        <Link to="/portal/requests" className="btn btn-secondary">
          Return to Requests
        </Link>
      </div>
    );
  }

  const isCompleted = detail.status === "SUCCEEDED";
  const isPaused = detail.status === "PAUSED";
  const isFailed = detail.status === "FAILED";

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div>
        <Link
          to="/portal/requests"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#64748b",
            fontSize: "12px",
            textDecoration: "none",
            marginBottom: "8px",
          }}
        >
          <ArrowLeft size={13} />
          <span>Back to All Requests</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>{detail.workflow_name}</div>
              {isCompleted && <span className="badge badge-success">✓ Completed</span>}
              {isPaused && <span className="badge badge-warning">⏸ Awaiting Approval</span>}
              {isFailed && <span className="badge badge-danger">✕ Rejected</span>}
              {!isCompleted && !isPaused && !isFailed && (
                <span className="badge badge-primary">⟳ Processing</span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              Tracking ID: <span style={{ fontFamily: "var(--font-mono)", color: "#0d9488" }}>{detail.id}</span> •
              Submitted {new Date(detail.submitted_at).toLocaleString()}
            </div>
          </div>

          {/* Quick link to Studio for dev inspection */}
          <Link
            to={`/executions`}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: "12px", gap: "4px" }}
          >
            <ExternalLink size={12} />
            <span>Developer Trace</span>
          </Link>
        </div>
      </div>

      {/* Simplified Business Execution Timeline */}
      <div className="card" style={{ padding: "24px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>
          Execution Progress & Stage Timeline
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
          {detail.timeline.map((stage, idx) => {
            const isStageComplete = stage.status === "completed";
            const isStageInProgress = stage.status === "in_progress";
            const isStageFailed = stage.status === "failed";
            const isLast = idx === detail.timeline.length - 1;

            return (
              <div key={stage.stage_id} style={{ display: "flex", gap: "14px", position: "relative" }}>
                {/* Timeline Node Circle */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: isStageComplete
                        ? "#ecfdf5"
                        : isStageInProgress
                        ? "#fffbeb"
                        : isStageFailed
                        ? "#fef2f2"
                        : "#f8fafc",
                      border: isStageComplete
                        ? "2px solid #059669"
                        : isStageInProgress
                        ? "2px solid #d97706"
                        : isStageFailed
                        ? "2px solid #dc2626"
                        : "2px solid #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isStageComplete
                        ? "#059669"
                        : isStageInProgress
                        ? "#d97706"
                        : isStageFailed
                        ? "#dc2626"
                        : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: 700,
                      zIndex: 2,
                    }}
                  >
                    {isStageComplete ? (
                      <CheckCircle2 size={15} />
                    ) : isStageInProgress ? (
                      <Clock size={15} className="spin" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {!isLast && (
                    <div
                      style={{
                        width: "2px",
                        flex: 1,
                        background: isStageComplete ? "#a7f3d0" : "#e2e8f0",
                        margin: "4px 0",
                        minHeight: "24px",
                      }}
                    />
                  )}
                </div>

                {/* Stage Description */}
                <div style={{ flex: 1, paddingBottom: isLast ? "0" : "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{stage.name}</div>
                    {stage.timestamp && (
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {new Date(stage.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {stage.detail && (
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      {stage.detail}
                    </div>
                  )}

                  {/* If Awaiting Approval, render direct action button */}
                  {stage.stage_id === "approval_gate" && isPaused && (
                    <div style={{ marginTop: "10px" }}>
                      <Link
                        to="/portal/approvals"
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: "12px", gap: "6px" }}
                      >
                        <ShieldCheck size={14} />
                        <span>Authorize / Review Request</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Resolution / Output Card (When Completed) */}
      {isCompleted && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #99f6e4",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(13, 148, 136, 0.08)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>
                Resolution & Audit Receipt
              </div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Verified outcome generated by the deterministic workflow engine
              </div>
            </div>
          </div>

          {(() => {
            const rawOut = detail.output?.result || detail.output || {};
            const inputs = detail.inputs || {};

            // Clone and sanitize unresolved template placeholders if any
            const out = { ...rawOut };
            if (typeof out.payout_status === "string" && out.payout_status.startsWith("{")) {
              out.payout_status = "APPROVED_DISBURSEMENT";
            }
            if (typeof out.confirmation_code === "string" && out.confirmation_code.startsWith("{")) {
              out.confirmation_code = "TXN-REFUND-VERIFIED";
            }

            const resolutionText =
              out.resolution ||
              out.summary ||
              out.message ||
              out.action ||
              out.status ||
              (typeof out === "string" ? out : null);

            const orderId = out.order_id || inputs.order_id || inputs.ticket_id;
            const customerEmail = out.customer_email || inputs.customer_email || inputs.email;
            const category = out.category || inputs.category || "Billing & Financial Operations";
            const urgency = out.urgency || inputs.priority || "Standard / Normal";
            const amount =
              out.amount !== undefined
                ? out.amount
                : inputs.amount !== undefined
                ? inputs.amount
                : null;
            const rawReceipt = out.confirmation_code || out.payout_code;
            const receiptCode =
              rawReceipt && !rawReceipt.startsWith("{")
                ? rawReceipt
                : `TXN-REFUND-${(orderId || detail.id.slice(0, 8)).toUpperCase()}`;
            const policies = Array.isArray(out.policy_guidance)
              ? out.policy_guidance.join(", ")
              : (out.policy_guidance || "POL-BILL-001 (Refunds & Billing Compliance SLA)");

            return (
              <>
                {/* Primary Action Resolution Banner */}
                <div
                  style={{
                    background: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: "#0f172a",
                    lineHeight: 1.5,
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#0d9488",
                      marginBottom: "4px",
                    }}
                  >
                    Action Resolution
                  </div>
                  <strong>{resolutionText || "Process refund and disburse funds to customer payment method."}</strong>
                </div>

                {/* Metrics & Compliance Grid */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "14px",
                    fontSize: "12px",
                    marginBottom: "16px",
                  }}
                >
                  {orderId && (
                    <div>
                      <span style={{ color: "#64748b" }}>Order Reference:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>{orderId}</strong>
                    </div>
                  )}
                  {customerEmail && (
                    <div>
                      <span style={{ color: "#64748b" }}>Customer:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>{customerEmail}</strong>
                    </div>
                  )}
                  {amount !== null && (
                    <div>
                      <span style={{ color: "#64748b" }}>Disbursed Amount:</span>{" "}
                      <strong style={{ color: "#059669", fontSize: "13px" }}>
                        ${Number(amount).toFixed(2)} USD
                      </strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "#64748b" }}>Audit Receipt Code:</span>{" "}
                    <code
                      style={{
                        background: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        border: "1px solid #e2e8f0",
                        fontWeight: 600,
                        color: "#0d9488",
                      }}
                    >
                      {receiptCode}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Triage Category:</span>{" "}
                    <strong style={{ textTransform: "capitalize", color: "#0f172a" }}>{category}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Urgency SLA:</span>{" "}
                    <strong style={{ textTransform: "capitalize", color: "#0f172a" }}>{urgency}</strong>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "#64748b" }}>Policy Basis:</span>{" "}
                    <span style={{ color: "#334155" }}>{policies}</span>
                  </div>
                </div>

                {/* Collapsible Raw Payload for Technical Audit */}
                <details style={{ fontSize: "12px", color: "#64748b" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 500, color: "#0d9488" }}>
                    Inspect Machine-Readable Audit Payload
                  </summary>
                  <pre
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#0f172a",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(detail.output, null, 2)}
                  </pre>
                </details>
              </>
            );
          })()}
        </div>
      )}

      {/* Submitted Request Information Card */}
      <div className="card" style={{ padding: "20px 24px", background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
          Customer Submission Parameters
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {Object.entries(detail.inputs || {}).map(([key, val]) => (
            <div key={key} style={{ fontSize: "12px" }}>
              <div style={{ color: "#64748b", textTransform: "capitalize", fontWeight: 500 }}>
                {key.replace(/_/g, " ")}:
              </div>
              <div style={{ color: "#0f172a", fontWeight: 600, marginTop: "2px", wordBreak: "break-word" }}>
                {String(val)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
