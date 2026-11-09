import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Bot,
  FileText,
  Shield,
  Zap,
} from "lucide-react";
import { api } from "../api/client";

export default function PortalNewRequest() {
  const { workflowId } = useParams();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState([]);
  const [selectedWfId, setSelectedWfId] = useState(workflowId || "");
  const [formDef, setFormDef] = useState(null);
  const [loading, setLoading] = useState(true);

  // Submission Mode: "form" or "ai_assistant"
  const [activeTab, setActiveTab] = useState("form");

  // Dynamic Form Values
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Natural Language State
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResult, setNlResult] = useState(null);
  const [nlError, setNlError] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [submitError, setSubmitError] = useState(null);

  // Load available workflows
  useEffect(() => {
    let isMounted = true;
    async function fetchWorkflows() {
      try {
        setLoading(true);
        const list = await api.listPortalWorkflows();
        if (isMounted) {
          setWorkflows(list);
          if (!selectedWfId && list.length > 0) {
            setSelectedWfId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load workflows:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchWorkflows();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected workflow changes, fetch its form definition
  useEffect(() => {
    if (!selectedWfId) return;
    let isMounted = true;
    async function fetchForm() {
      try {
        const def = await api.getPortalWorkflowForm(selectedWfId);
        if (isMounted) {
          setFormDef(def);
          // Initialize default form values
          const initial = {};
          (def.input_contract?.fields || []).forEach((f) => {
            initial[f.name] = f.default_value ?? "";
          });
          setFormData(initial);
          setFormErrors({});
          setNlResult(null);
        }
      } catch (err) {
        console.error("Failed to fetch workflow form:", err);
      }
    }
    fetchForm();
    return () => {
      isMounted = false;
    };
  }, [selectedWfId]);

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const fields = formDef?.input_contract?.fields || [];
    fields.forEach((f) => {
      const val = formData[f.name];
      if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
        errors[f.name] = `${f.label} is required.`;
      }
      if (f.type === "email" && val && !String(val).includes("@")) {
        errors[f.name] = "Please enter a valid email address.";
      }
      if (f.type === "number" && val && isNaN(Number(val))) {
        errors[f.name] = "Please enter a valid numeric value.";
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit structured form
  const handleSubmitForm = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Cast numbers
      const payloadInputs = { ...formData };
      (formDef?.input_contract?.fields || []).forEach((f) => {
        if (f.type === "number" && payloadInputs[f.name] !== undefined) {
          payloadInputs[f.name] = Number(payloadInputs[f.name]);
        }
      });

      const res = await api.submitPortalRequest(selectedWfId, {
        inputs: payloadInputs,
        submitted_by: "Client User",
      });

      // Navigate to tracking view
      navigate(`/portal/requests/${res.run_id}`);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Parse Natural Language with AI
  const handleParseNL = async () => {
    if (!nlPrompt.trim()) return;
    try {
      setNlParsing(true);
      setNlError(null);
      const res = await api.parseNaturalLanguage(selectedWfId, nlPrompt);
      setNlResult(res);

      // Merge extracted fields into formData
      setFormData((prev) => ({
        ...prev,
        ...res.extracted,
      }));
    } catch (err) {
      setNlError(err.message || "Could not parse request text.");
    } finally {
      setNlParsing(false);
    }
  };

  const currentWf = workflows.find((w) => w.id === selectedWfId);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header breadcrumb & Title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Link
            to="/portal"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--text-muted)",
              fontSize: "12px",
              textDecoration: "none",
              marginBottom: "6px",
            }}
          >
            <ArrowLeft size={13} />
            <span>Back to Dashboard</span>
          </Link>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>Submit a Business Request</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Select an automated workflow service and provide your details via form or natural language.
          </div>
        </div>
      </div>

      {/* Service Selector Cards */}
      <div>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
          Select Automated Service:
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          {workflows.map((wf) => {
            const isSelected = wf.id === selectedWfId;
            const isRefund = wf.name.toLowerCase().includes("refund");
            const Icon = isRefund ? Shield : Zap;
            return (
              <button
                type="button"
                key={wf.id}
                onClick={() => setSelectedWfId(wf.id)}
                style={{
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: "6px",
                  border: isSelected ? "2px solid var(--accent-primary)" : "1px solid var(--border-light)",
                  background: isSelected ? "var(--accent-primary-bg)" : "var(--surface-card)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 0 0 2px rgba(13, 148, 136, 0.15)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon size={16} color={isSelected ? "#0d9488" : "#64748b"} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "var(--accent-primary)" : "var(--text-main)" }}>
                      {wf.name}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 size={15} color="#0d9488" />}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.3 }}>
                  {wf.description?.slice(0, 85)}...
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Request Submission Panel */}
      <div className="card" style={{ padding: isMobile ? "16px" : "24px" }}>
        {/* Service Header Info */}
        <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>{formDef?.workflow_name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{formDef?.description}</div>
            </div>
            <span className="badge badge-published">v{formDef?.version_number} Active Contract</span>
          </div>

          {/* Submission Mode Toggle (Structured Form vs AI Natural Language) */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "8px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 600,
                border: activeTab === "form" ? "1px solid var(--accent-primary)" : "1px solid var(--border-light)",
                background: activeTab === "form" ? "var(--accent-primary-bg)" : "var(--surface-card)",
                color: activeTab === "form" ? "var(--accent-primary)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <FileText size={14} />
              <span>Standard Form</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai_assistant")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 600,
                border: activeTab === "ai_assistant" ? "1px solid var(--accent-primary)" : "1px solid var(--border-light)",
                background: activeTab === "ai_assistant" ? "var(--accent-primary-bg)" : "var(--surface-card)",
                color: activeTab === "ai_assistant" ? "var(--accent-primary)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <Bot size={14} color="#0d9488" />
              <span>Natural Language AI Assistant</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Natural Language Assistant */}
        {activeTab === "ai_assistant" && (
          <div style={{ marginBottom: "24px", background: "var(--surface-subtle)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
              Describe your request in plain English
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Our AI engine will parse your statement, extract order IDs, amounts, and customer context, and populate the required contract fields.
            </div>

            <textarea
              rows={4}
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder="e.g. My payment of $150 was deducted twice for order ORD-12345. My name is Alex Mercer (alex.mercer@example.com). Please issue a refund."
              className="input"
              style={{ fontSize: "13px", resize: "vertical", marginBottom: "10px" }}
            />

            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() =>
                    setNlPrompt(
                      "My payment was deducted twice for order ORD-12345. Claimed refund amount is $150.00. Customer: Alex Mercer (alex.mercer@example.com). Double charge during checkout."
                    )
                  }
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: "11px", color: "var(--accent-primary)" }}
                >
                  + Insert Sample Refund ($150)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNlPrompt(
                      "I cannot access my billing invoice for account ORD-94821. Sarah Connor (sarah@cyberdyne.io). High urgency."
                    )
                  }
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: "11px", color: "var(--accent-primary)" }}
                >
                  + Insert Support Ticket
                </button>
              </div>

              <button
                type="button"
                onClick={handleParseNL}
                disabled={nlParsing || !nlPrompt.trim()}
                className="btn btn-sm btn-primary"
                style={{ gap: "6px", width: isMobile ? "100%" : "auto", justifyContent: "center" }}
              >
                {nlParsing ? <Sparkles size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{nlParsing ? "Extracting..." : "Analyze & Extract Fields"}</span>
              </button>
            </div>

            {/* Extracted preview tags */}
            {nlResult && (
              <div style={{ marginTop: "16px", padding: "12px", background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "5px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
                  AI Extraction Preview:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {Object.entries(nlResult.extracted || {}).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "var(--status-success-bg)",
                        color: "var(--status-success-text)",
                        border: "1px solid var(--status-success-border)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <CheckCircle2 size={11} />
                      <strong>{k}:</strong> {String(v)}
                    </span>
                  ))}
                </div>

                {/* Clarification prompt if required info missing */}
                {nlResult.needs_clarification && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertCircle size={14} color="#d97706" />
                    <span>{nlResult.clarification_prompt}</span>
                  </div>
                )}
              </div>
            )}

            {nlError && (
              <div style={{ marginTop: "10px", color: "#dc2626", fontSize: "12px" }}>
                {nlError}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Dynamic Form Fields */}
        <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {(formDef?.input_contract?.fields || []).map((field) => {
            const hasError = !!formErrors[field.name];

            return (
              <div key={field.name}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: hasError ? "#dc2626" : "#334155",
                    marginBottom: "4px",
                  }}
                >
                  <span>{field.label}</span>
                  {field.required && <span style={{ color: "#dc2626" }}>*</span>}
                  {field.description && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
                      ({field.description})
                    </span>
                  )}
                </label>

                {field.type === "multiline" ? (
                  <textarea
                    rows={3}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    className="input"
                    style={{
                      borderColor: hasError ? "#dc2626" : undefined,
                      resize: "vertical",
                    }}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="input"
                    style={{ borderColor: hasError ? "#dc2626" : undefined }}
                  >
                    {(field.options || ["low", "medium", "high", "critical"]).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                    step={field.type === "number" ? "0.01" : undefined}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    className="input"
                    style={{ borderColor: hasError ? "#dc2626" : undefined }}
                  />
                )}

                {hasError && (
                  <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "3px" }}>
                    {formErrors[field.name]}
                  </div>
                )}
              </div>
            );
          })}

          {submitError && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "5px",
                color: "#b91c1c",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column-reverse" : "row",
              alignItems: "stretch",
              justifyContent: isMobile ? "stretch" : "flex-end",
              gap: "12px",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "16px",
              marginTop: "8px",
            }}
          >
            <Link to="/portal" className="btn btn-secondary" style={{ textAlign: "center" }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ minWidth: isMobile ? "100%" : "160px", gap: "8px", justifyContent: "center" }}
            >
              {submitting ? (
                <Sparkles size={14} className="spin" />
              ) : (
                <Send size={14} />
              )}
              <span>{submitting ? "Submitting..." : "Submit Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
