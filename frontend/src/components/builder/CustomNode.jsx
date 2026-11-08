import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Zap,
  FileInput,
  Sparkles,
  FileCode,
  Search,
  GitBranch,
  Shuffle,
  ShieldAlert,
  CheckCircle2,
  Trash2,
} from "lucide-react";

const NODE_ICONS = {
  trigger: Zap,
  input_data: FileInput,
  ai_classify: Sparkles,
  structured_extract: FileCode,
  retrieval: Search,
  condition: GitBranch,
  transform: Shuffle,
  human_approval: ShieldAlert,
  output: CheckCircle2,
};

const NODE_TAGS = {
  trigger: "Trigger",
  input_data: "Input",
  ai_classify: "AI Classify",
  structured_extract: "AI Extract",
  retrieval: "Knowledge",
  condition: "Logic",
  transform: "Transform",
  human_approval: "Review Gate",
  output: "Result",
};

/**
 * Modern light SaaS custom node card:
 * Crisp white surface `#ffffff`, subtle border `#cbd5e1`,
 * emerald/teal selection halo `#0d9488`, clear typography.
 */
export default function CustomNode({ id, data, selected }) {
  const nodeType = data.type || "transform";
  const Icon = NODE_ICONS[nodeType] || Shuffle;
  const tag = NODE_TAGS[nodeType] || "Node";

  const isStart = nodeType === "trigger" || nodeType === "input_data";
  const isTerminal = nodeType === "output";
  const isCondition = nodeType === "condition";

  return (
    <div
      style={{
        background: "#ffffff",
        border: selected ? "2px solid #0d9488" : "1px solid #cbd5e1",
        borderRadius: "6px",
        boxShadow: selected
          ? "0 0 0 3px rgba(13, 148, 136, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)"
          : "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
        minWidth: "220px",
        maxWidth: "260px",
        fontFamily: "var(--font-sans)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Incoming Connection Handle */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: "#ffffff",
            border: "2px solid #0d9488",
            width: "10px",
            height: "10px",
            top: "-6px",
            cursor: "crosshair",
          }}
        />
      )}

      {/* Node Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: selected ? "#f0fdfa" : "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          borderTopLeftRadius: "5px",
          borderTopRightRadius: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Icon size={14} color="#0d9488" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
            {data.label || data.name || "Node"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              padding: "2px 5px",
              borderRadius: "3px",
              background: "#e2e8f0",
              color: "#334155",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {tag}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (data?.onDelete) {
                data.onDelete(id);
              }
            }}
            title="Delete this node"
            aria-label="Delete this node"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "3px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#dc2626";
              e.currentTarget.style.backgroundColor = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Node Body Details */}
      <div style={{ padding: "8px 10px", background: "#ffffff" }}>
        {data.description ? (
          <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.3, marginBottom: "4px" }}>
            {data.description}
          </div>
        ) : null}

        {/* Dynamic configuration preview pill for all 9 node types */}
        {nodeType === "trigger" && (
          <div style={{ fontSize: "10px", color: "#059669", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Trigger: {data.config?.trigger_type || "api"} webhook
          </div>
        )}
        {nodeType === "input_data" && (
          <div style={{ fontSize: "10px", color: "#0284c7", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Input: External Payload
          </div>
        )}
        {nodeType === "ai_classify" && (
          <div style={{ fontSize: "10px", color: "#0d9488", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            [{(data.config?.categories || ["billing", "technical", "general"]).slice(0, 3).join(", ")}]
          </div>
        )}
        {nodeType === "structured_extract" && (
          <div style={{ fontSize: "10px", color: "#0d9488", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Extracts: {Object.keys(data.config?.schema_definition?.properties || {}).slice(0, 3).join(", ") || "fields"}
          </div>
        )}
        {nodeType === "retrieval" && (
          <div style={{ fontSize: "10px", color: "#0891b2", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Top K: {data.config?.top_k || 3} | {data.config?.collection_name || "policies"}
          </div>
        )}
        {nodeType === "condition" && (() => {
          const field = data.config?.field_path || data.config?.branches?.[0]?.field_path || "amount";
          const op = data.config?.operator || data.config?.branches?.[0]?.operator || "greater_than";
          const val = data.config?.value ?? data.config?.branches?.[0]?.value ?? "100";
          const opSym =
            op === "greater_than" ? ">" :
            op === "less_than" ? "<" :
            op === "not_equals" ? "!=" :
            op === "contains" ? "contains" : "==";

          return (
            <div style={{ fontSize: "10px", color: "#d97706", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
              If {field} {opSym} {String(val)}
            </div>
          );
        })()}
        {nodeType === "transform" && (
          <div style={{ fontSize: "10px", color: "#4f46e5", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Map: {Object.keys(data.config?.mapping_rules || {}).length || 1} fields
          </div>
        )}
        {nodeType === "human_approval" && (
          <div style={{ fontSize: "10px", color: "#dc2626", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Gate: {data.config?.required_role || "reviewer"} ({data.config?.timeout_hours || 24}h SLA)
          </div>
        )}
        {nodeType === "output" && (
          <div style={{ fontSize: "10px", color: "#16a34a", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Result Assembly
          </div>
        )}
      </div>

      {/* Outgoing Connection Handles */}
      {isCondition ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "2px 14px 6px 14px",
            fontSize: "10px",
            fontWeight: 700,
            color: "#64748b",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            borderBottomLeftRadius: "5px",
            borderBottomRightRadius: "5px",
          }}
        >
          {/* TRUE Handle */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "#059669" }}>TRUE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{
                left: "50%",
                background: "#059669",
                border: "2px solid #ffffff",
                width: "10px",
                height: "10px",
                bottom: "-6px",
                cursor: "crosshair",
                boxShadow: "0 0 4px rgba(5, 150, 105, 0.4)",
              }}
            />
          </div>

          {/* FALSE Handle */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "#dc2626" }}>FALSE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{
                left: "50%",
                background: "#dc2626",
                border: "2px solid #ffffff",
                width: "10px",
                height: "10px",
                bottom: "-6px",
                cursor: "crosshair",
                boxShadow: "0 0 4px rgba(220, 38, 38, 0.4)",
              }}
            />
          </div>
        </div>
      ) : !isTerminal ? (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: "#ffffff",
            border: "2px solid #0d9488",
            width: "10px",
            height: "10px",
            bottom: "-6px",
            cursor: "crosshair",
          }}
        />
      ) : null}
    </div>
  );
}
