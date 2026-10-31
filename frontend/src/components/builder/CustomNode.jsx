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
 * Render-inspired dark custom node card:
 * Neutral dark surface `#161616`, thin border `#262626`,
 * restrained violet selection ring `#8b5cf6`, compact typography.
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
        background: "#161616",
        border: selected ? "1px solid #8b5cf6" : "1px solid #2a2a2a",
        borderRadius: "6px",
        boxShadow: selected
          ? "0 0 0 2px rgba(139, 92, 246, 0.35), 0 4px 12px rgba(0, 0, 0, 0.5)"
          : "0 2px 6px rgba(0, 0, 0, 0.4)",
        minWidth: "210px",
        maxWidth: "250px",
        fontFamily: "var(--font-sans)",
        transition: "border-color 0.1s ease, box-shadow 0.1s ease",
      }}
    >
      {/* Incoming Connection Handle */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: "#111111",
            border: "2px solid #8b5cf6",
            width: "8px",
            height: "8px",
            top: "-5px",
          }}
        />
      )}

      {/* Node Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 10px",
          background: "#1b1b1b",
          borderBottom: "1px solid #242424",
          borderTopLeftRadius: "5px",
          borderTopRightRadius: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Icon size={13} color="#a78bfa" />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#f5f5f5" }}>
            {data.label || data.name || "Node"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "#222222",
              color: "#a3a3a3",
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
              color: selected ? "#ef4444" : "#666666",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "3px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = selected ? "#ef4444" : "#666666";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Node Body Details */}
      <div style={{ padding: "8px 10px" }}>
        {data.description ? (
          <div style={{ fontSize: "11px", color: "#888888", lineHeight: 1.3, marginBottom: "4px" }}>
            {data.description}
          </div>
        ) : null}

        {/* Dynamic configuration preview pill */}
        {nodeType === "ai_classify" && data.config?.categories && (
          <div style={{ fontSize: "10px", color: "#a78bfa", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            [{data.config.categories.slice(0, 3).join(", ")}]
          </div>
        )}
        {nodeType === "retrieval" && (
          <div style={{ fontSize: "10px", color: "#67e8f9", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            Top K: {data.config?.top_k || 3}
          </div>
        )}
        {nodeType === "condition" && (
          <div style={{ fontSize: "10px", color: "#fbbf24", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
            Rule: {data.config?.operator || "equals"}
          </div>
        )}
      </div>

      {/* Outgoing Connection Handles */}
      {isCondition ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0 14px 4px 14px",
            fontSize: "9px",
            fontWeight: 600,
            color: "#737373",
          }}
        >
          <div style={{ position: "relative" }}>
            <span>TRUE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              style={{
                left: "50%",
                background: "#10b981",
                border: "2px solid #064e3b",
                width: "8px",
                height: "8px",
                bottom: "-5px",
              }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <span>FALSE</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              style={{
                left: "50%",
                background: "#ef4444",
                border: "2px solid #7f1d1d",
                width: "8px",
                height: "8px",
                bottom: "-5px",
              }}
            />
          </div>
        </div>
      ) : !isTerminal ? (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: "#111111",
            border: "2px solid #8b5cf6",
            width: "8px",
            height: "8px",
            bottom: "-5px",
          }}
        />
      ) : null}
    </div>
  );
}
