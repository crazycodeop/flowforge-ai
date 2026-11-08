import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";

export default function PortalApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState(null); // { approval, decision: "APPROVED" | "REJECTED", comment: "" }
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const list = await api.listPortalPendingApprovals();
      setApprovals(list);
    } catch (err) {
      console.error("Failed to load portal approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleDecisionSubmit = async () => {
    if (!decisionModal) return;
    try {
      setSubmitting(true);
      setActionMessage(null);
      await api.decidePortalApproval(
        decisionModal.approval.id,
        decisionModal.decision,
        decisionModal.comment
      );
      setActionMessage({
        type: "success",
        text: `Request successfully ${decisionModal.decision === "APPROVED" ? "approved" : "rejected"}. Workflow resumed.`,
      });
      setDecisionModal(null);
      await loadApprovals();
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Failed to process decision." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>Pending Human Approvals</div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            Authorized compliance gate: inspect AI-generated recommendations, evaluate threshold policies, and authorize execution resumption.
          </div>
        </div>
        <button
          type="button"
          onClick={loadApprovals}
          className="btn btn-secondary btn-sm"
          style={{ gap: "6px", width: isMobile ? "100%" : "auto", justifyContent: "center" }}
        >
          <RefreshCw size={13} className={loading ? "spin" : ""} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            background: actionMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${actionMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            color: actionMessage.type === "success" ? "#047857" : "#b91c1c",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {actionMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <ShieldCheck size={36} color="#059669" style={{ margin: "0 auto 12px auto" }} />
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
            All Caught Up!
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", maxWidth: "420px", margin: "0 auto 16px auto" }}>
            There are no pending workflow requests awaiting human sign-off. All active automated tasks are running smoothly.
          </div>
          <Link to="/portal/new" className="btn btn-primary btn-sm">
            Submit New Request
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {approvals.map((app) => {
            const inputs = app.customer_input || {};
            const amount = inputs.amount !== undefined ? inputs.amount : null;

            return (
              <div
                key={app.id}
                className="card"
                style={{
                  padding: isMobile ? "14px 14px" : "20px 24px",
                  borderLeft: "4px solid #d97706",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "flex-start", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: "10px", marginBottom: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="badge badge-warning">Required Role: {app.required_role.toUpperCase()}</span>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Waiting since {new Date(app.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                      {app.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      Service: <strong>{app.workflow_name}</strong> • Request ID:{" "}
                      <span style={{ fontFamily: "var(--font-mono)", color: "#0d9488" }}>{app.workflow_run_id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <Link
                    to={`/portal/requests/${app.workflow_run_id}`}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: "11px", gap: "4px" }}
                  >
                    <span>View Timeline</span>
                    <ArrowRight size={11} />
                  </Link>
                </div>

                {/* Evidence & Context Grid */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                    fontSize: "12px",
                  }}
                >
                  {inputs.customer_name && (
                    <div>
                      <span style={{ color: "#64748b" }}>Customer:</span>{" "}
                      <strong>{inputs.customer_name}</strong> ({inputs.customer_email})
                    </div>
                  )}
                  {inputs.order_id && (
                    <div>
                      <span style={{ color: "#64748b" }}>Order ID:</span>{" "}
                      <code style={{ background: "#ffffff", padding: "1px 5px", borderRadius: "3px" }}>
                        {inputs.order_id}
                      </code>
                    </div>
                  )}
                  {amount !== null && (
                    <div>
                      <span style={{ color: "#64748b" }}>Claimed Payout:</span>{" "}
                      <strong style={{ color: "#d97706", fontSize: "13px" }}>${Number(amount).toFixed(2)} USD</strong>
                    </div>
                  )}
                  {inputs.refund_reason && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "#64748b" }}>Reason:</span>{" "}
                      <span style={{ color: "#0f172a" }}>{inputs.refund_reason}</span>
                    </div>
                  )}
                </div>

                {/* Policy Basis & Recommendation */}
                <div
                  style={{
                    background: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    color: "#0f766e",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, marginBottom: "2px" }}>
                    <Sparkles size={13} color="#0d9488" />
                    <span>AI Recommendation & Policy Compliance:</span>
                  </div>
                  <div>
                    {app.description ||
                      "Verified against company billing policy POL-BILL-001. Payout threshold exceeds standard representative limit of $100.00. Requires Finance Manager authorization before automated disbursement."}
                  </div>
                </div>

                {/* Decision Actions & Role Permissions */}
                {(() => {
                  const userRole = (currentUser?.role || "client").toLowerCase();
                  const reqRole = (app.required_role || "manager").toLowerCase();
                  // STRICT ROLE CHECK: Only the exact required role (e.g. manager) can decide.
                  // Engineers/Developers build workflows in Studio and cannot sign off on business gates.
                  const canDecide = userRole === reqRole;

                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                      {canDecide ? (
                        <>
                          <div style={{ fontSize: "12px", color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={14} color="#059669" />
                            <span>Authorized as <strong>{currentUser?.full_name?.split("(")[0]?.trim() || "Operations Manager"} (MANAGER)</strong>: You have approval authority for this gate.</span>
                          </div>

                          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "stretch", width: isMobile ? "100%" : "auto", gap: "10px" }}>
                            <button
                              type="button"
                              onClick={() => setDecisionModal({ approval: app, decision: "REJECTED", comment: "" })}
                              className="btn btn-sm"
                              style={{
                                background: "#ffffff",
                                color: "#dc2626",
                                borderColor: "#fecaca",
                                gap: "6px",
                                cursor: "pointer",
                                justifyContent: "center",
                              }}
                            >
                              <XCircle size={14} />
                              <span>Reject Payout</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDecisionModal({ approval: app, decision: "APPROVED", comment: "" })}
                              className="btn btn-sm btn-primary"
                              style={{ gap: "6px", cursor: "pointer", justifyContent: "center" }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Authorize Payout</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                            <ShieldCheck size={16} color="#64748b" />
                            <span>
                              <strong>Action Restricted:</strong> This gate requires <strong>{reqRole.toUpperCase()}</strong> sign-off. You are currently viewing as <strong>{currentUser?.full_name?.split("(")[0]?.trim() || currentUser?.email} ({userRole.toUpperCase()})</strong>.
                            </span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#0d9488", fontWeight: 600 }}>
                            Sign in as manager@flowforge.ai to authorize
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Confirmation Modal */}
      {decisionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "480px", padding: "24px", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
              Confirm {decisionModal.decision === "APPROVED" ? "Approval & Disbursement" : "Rejection"}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
              {decisionModal.decision === "APPROVED"
                ? "This will resume the workflow, execute transaction authorization, and disburse funds to the customer."
                : "This will halt the workflow, mark the execution as rejected, and notify the customer."}
            </div>

            <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
              Reviewer Notes / Justification:
            </label>
            <textarea
              rows={3}
              value={decisionModal.comment}
              onChange={(e) => setDecisionModal((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder={
                decisionModal.decision === "APPROVED"
                  ? "e.g. Verified duplicate transaction on payment processor ledger. Approved."
                  : "e.g. Claim outside 30-day refund window without prior RMA."
              }
              className="input"
              style={{ fontSize: "12px", marginBottom: "18px" }}
              autoFocus
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecisionSubmit}
                disabled={submitting}
                className="btn btn-sm"
                style={{
                  background: decisionModal.decision === "APPROVED" ? "#059669" : "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  minWidth: "120px",
                }}
              >
                {submitting ? "Submitting..." : `Confirm ${decisionModal.decision}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
