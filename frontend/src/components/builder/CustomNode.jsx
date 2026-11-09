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
        background: "var(--surface-card)",
        border: selected ? "2px solid var(--accent-primary)" : "1px solid var(--border-light)",
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
            background: "var(--surface-card)",
            border: "2px solid var(--accent-primary)",
            width: "12px",
            height: "12px",
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
          background: selected ? "var(--accent-primary-bg)" : "var(--surface-subtle)",
          borderBottom: "1px solid var(--border-light)",
          borderTopLeftRadius: "5px",
          borderTopRightRadius: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Icon size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
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
              background: "var(--surface-subtle)",
              color: "var(--text-secondary)",
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
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "3px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--status-danger-text)";
              e.currentTarget.style.backgroundColor = "var(--status-danger-bg)";
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
      <div style={{ padding: "8px 10px", background: "var(--surface-card)" }}>
        {data.description ? (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.3, marginBottom: "4px" }}>
            {data.description}
          </div>
        ) : null}

        {/* Dynamic configuration preview pill for all 9 node types */}
        {nodeType === "trigger" && (
          <div style={{ fontSize: "10px", color: "var(--status-success-text)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Trigger: {data.config?.trigger_type || "api"} webhook
          </div>
        )}
        {nodeType === "input_data" && (
          <div style={{ fontSize: "10px", color: "var(--accent-primary-light)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Input: External Payload
          </div>
        )}
        {nodeType === "ai_classify" && (
          <div style={{ fontSize: "10px", color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            [{(data.config?.categories || ["billing", "technical", "general"]).slice(0, 3).join(", ")}]
          </div>
        )}
        {nodeType === "structured_extract" && (
          <div style={{ fontSize: "10px", color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Extracts: {Object.keys(data.config?.schema_definition?.properties || {}).slice(0, 3).join(", ") || "fields"}
          </div>
        )}
        {nodeType === "retrieval" && (
          <div style={{ fontSize: "10px", color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
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
            <div style={{ fontSize: "10px", color: "var(--status-warning-text)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
              If {field} {opSym} {String(val)}
            </div>
          );
        })()}
        {nodeType === "transform" && (
          <div style={{ fontSize: "10px", color: "var(--accent-primary-hover)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Map: {Object.keys(data.config?.mapping_rules || {}).length || 1} fields
          </div>
        )}
        {nodeType === "human_approval" && (
          <div style={{ fontSize: "10px", color: "var(--status-danger-text)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
            Gate: {data.config?.required_role || "reviewer"} ({data.config?.timeout_hours || 24}h SLA)
          </div>
        )}
        {nodeType === "output" && (
          <div style={{ fontSize: "10px", color: "var(--status-success-text)", fontFamily: "var(--font-mono)", marginTop: "2px", fontWeight: 500 }}>
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
            color: "var(--text-muted)",
            background: "var(--surface-subtle)",
            borderTop: "1px solid var(--border-light)",
            borderBottomLeftRadius: "5px",
            borderBottomRightRadius: "5px",
          }}
        >
          {/* TRUE Handle */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--status-success-text)" }}>TRUE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{
                left: "50%",
                background: "var(--status-success)",
                border: "2px solid var(--surface-card)",
                width: "12px",
                height: "12px",
                bottom: "-6px",
                cursor: "crosshair",
                boxShadow: "0 0 4px rgba(5, 150, 105, 0.4)",
              }}
            />
          </div>

          {/* FALSE Handle */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--status-danger-text)" }}>FALSE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{
                left: "50%",
                background: "var(--status-danger)",
                border: "2px solid var(--surface-card)",
                width: "12px",
                height: "12px",
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
            background: "var(--surface-card)",
            border: "2px solid var(--accent-primary)",
            width: "12px",
            height: "12px",
            bottom: "-6px",
            cursor: "crosshair",
          }}
        />
      ) : null}
    </div>
  );
}
