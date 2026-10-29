import React from "react";
import { X, Trash2, Sliders, ShieldAlert, Sparkles, Zap } from "lucide-react";

/**
 * Inspector panel for configuring the selected node's attributes.
 * @param {{
 *   node: any,
 *   onClose: () => void,
 *   onUpdateNode: (nodeId: string, updates: any) => void,
 *   onDeleteNode: (nodeId: string) => void,
 * }} props
 */
export default function NodeInspector({ node, onClose, onUpdateNode, onDeleteNode }) {
  if (!node) return null;

  const nodeType = node.data.type || "transform";
  const config = node.data.config || {};

  const handleFieldChange = (field, value) => {
    onUpdateNode(node.id, {
      ...node.data,
      [field]: value,
    });
  };

  const handleConfigChange = (key, value) => {
    onUpdateNode(node.id, {
      ...node.data,
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  return (
    <aside
      style={{
        width: "300px",
        background: "var(--surface-card)",
        borderLeft: "1px solid var(--border-light)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "16px",
        flexShrink: 0,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sliders size={15} color="var(--accent-ai)" />
          <span style={{ fontSize: "13px", fontWeight: 600 }}>Configure Node</span>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
        {/* Basic Metadata */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
            Node Label
          </label>
          <input
            type="text"
            value={node.data.name || ""}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
            Description
          </label>
          <input
            type="text"
            value={node.data.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            className="input"
            placeholder="Brief step note..."
          />
        </div>

        {/* Node-Specific Configuration Forms */}
        {nodeType === "trigger" && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
              Trigger Type
            </label>
            <select
              value={config.trigger_type || "api"}
              onChange={(e) => handleConfigChange("trigger_type", e.target.value)}
              className="input"
            >
              <option value="api">REST API Webhook</option>
              <option value="manual">Manual Execution</option>
              <option value="scheduled">Scheduled Interval</option>
            </select>
          </div>
        )}

        {nodeType === "ai_classify" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Prompt Template *
              </label>
              <textarea
                rows={3}
                value={config.prompt_template || ""}
                onChange={(e) => handleConfigChange("prompt_template", e.target.value)}
                className="input"
                placeholder="Classify the incoming ticket text: {ticket}"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Categories (comma-separated) *
              </label>
              <input
                type="text"
                value={(config.categories || ["billing", "technical"]).join(", ")}
                onChange={(e) =>
                  handleConfigChange(
                    "categories",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                className="input"
                placeholder="billing, technical, account"
              />
            </div>
          </>
        )}

        {nodeType === "retrieval" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Knowledge Collection *
              </label>
              <input
                type="text"
                value={config.collection_name || "support-policy-v1"}
                onChange={(e) => handleConfigChange("collection_name", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Query Template *
              </label>
              <input
                type="text"
                value={config.query_template || "{ticket.issue}"}
                onChange={(e) => handleConfigChange("query_template", e.target.value)}
                className="input"
              />
            </div>
          </>
        )}

        {nodeType === "human_approval" && (
          <>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Approval Action Title *
              </label>
              <input
                type="text"
                value={config.title || "Review Refund Request"}
                onChange={(e) => handleConfigChange("title", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Required Role
              </label>
              <input
                type="text"
                value={config.required_role || "reviewer"}
                onChange={(e) => handleConfigChange("required_role", e.target.value)}
                className="input"
              />
            </div>
          </>
        )}

        {/* Execution Policies */}
        <div style={{ marginTop: "10px", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px" }}>
            Execution Policies
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
                Timeout (s)
              </label>
              <input
                type="number"
                value={node.data.timeout_seconds || 60}
                onChange={(e) => handleFieldChange("timeout_seconds", parseInt(e.target.value, 10) || 60)}
                className="input"
                min={1}
                max={1800}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
                Max Retries
              </label>
              <input
                type="number"
                value={node.data.retry_policy?.max_retries ?? 3}
                onChange={(e) =>
                  handleFieldChange("retry_policy", {
                    ...(node.data.retry_policy || {}),
                    max_retries: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="input"
                min={0}
                max={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Action */}
      <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
        <button
          onClick={() => onDeleteNode(node.id)}
          className="btn btn-secondary btn-sm"
          style={{ width: "100%", color: "var(--status-danger)", borderColor: "var(--status-danger-border)" }}
        >
          <Trash2 size={13} />
          <span>Remove Node</span>
        </button>
      </div>
    </aside>
  );
}
