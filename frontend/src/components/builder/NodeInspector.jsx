import React from "react";
import { X, Trash2, Sliders } from "lucide-react";

/**
 * Render-inspired dark inspector panel for configuring selected nodes.
 * @param {{
 *   node: any,
 *   onClose: () => void,
 *   onUpdateNode: (nodeId: string, updates: any) => void,
 *   onDeleteNode: (nodeId: string) => void,
 *   isOverlay?: boolean,
 * }} props
 */
export default function NodeInspector({
  node,
  onClose,
  onUpdateNode,
  onDeleteNode,
  isOverlay = false,
}) {
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
        width: isOverlay ? "min(340px, 92vw)" : "290px",
        background: "#111111",
        borderLeft: "1px solid #222222",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "16px",
        flexShrink: 0,
        height: "100%",
        zIndex: isOverlay ? 40 : "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "10px",
          borderBottom: "1px solid #222222",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sliders size={14} color="#8b5cf6" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5" }}>
            Configure Node
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            title="Delete this node"
            aria-label="Delete this node"
            style={{
              background: "transparent",
              border: "none",
              color: "#737373",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#737373";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close configuration"
            style={{
              background: "transparent",
              border: "none",
              color: "#737373",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f5f5f5")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
        {/* Node Label */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
            Node Label
          </label>
          <input
            type="text"
            value={node.data.name || ""}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className="input"
            style={{ fontSize: "12px" }}
          />
        </div>

        {/* Node Description */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
            Description
          </label>
          <input
            type="text"
            value={node.data.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            className="input"
            style={{ fontSize: "12px" }}
          />
        </div>

        {/* Specific Node Configurations */}
        {nodeType === "ai_classify" && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
              Categories (comma-separated)
            </label>
            <input
              type="text"
              value={(config.categories || []).join(", ")}
              onChange={(e) =>
                handleConfigChange(
                  "categories",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              className="input"
              style={{ fontSize: "12px" }}
            />
          </div>
        )}

        {nodeType === "retrieval" && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
              Top K Documents
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.top_k || 3}
              onChange={(e) => handleConfigChange("top_k", parseInt(e.target.value) || 3)}
              className="input"
              style={{ fontSize: "12px" }}
            />
          </div>
        )}

        {nodeType === "condition" && (
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
              Condition Operator
            </label>
            <select
              value={config.operator || "greater_than"}
              onChange={(e) => handleConfigChange("operator", e.target.value)}
              className="input"
              style={{ fontSize: "12px" }}
            >
              <option value="greater_than">Greater than (&gt;)</option>
              <option value="less_than">Less than (&lt;)</option>
              <option value="equals">Equals (==)</option>
              <option value="contains">Contains</option>
            </select>
          </div>
        )}

        {/* Danger Zone: Delete Node */}
        <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #222222" }}>
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 10px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} />
            <span>Delete Node</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
