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

const NODE_COLORS = {
  trigger: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  input_data: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
  ai_classify: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  structured_extract: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  retrieval: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  condition: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  transform: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  human_approval: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  output: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
};

/**
 * Custom React Flow Node rendering strong visual hierarchy,
 * icon, title, description, and source/target handles.
 */
export default function CustomNode({ data, selected }) {
  const nodeType = data.type || "transform";
  const colors = NODE_COLORS[nodeType] || NODE_COLORS.transform;
  const Icon = NODE_ICONS[nodeType] || Shuffle;

  const isStart = nodeType === "trigger" || nodeType === "input_data";
  const isTerminal = nodeType === "output";
  const isCondition = nodeType === "condition";

  return (
    <div
      style={{
        background: "#ffffff",
        border: selected ? "2px solid var(--accent-ai)" : "1px solid var(--border-light)",
        borderRadius: "8px",
        boxShadow: selected ? "0 0 0 3px rgba(99, 102, 241, 0.2)" : "var(--shadow-sm)",
        minWidth: "220px",
        maxWidth: "260px",
        padding: "12px 14px",
        fontFamily: "var(--font-sans)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Target Handle (input from upstream) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: "#64748b",
            width: "8px",
            height: "8px",
            border: "2px solid #ffffff",
          }}
        />
      )}

      {/* Node Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "5px",
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.text,
            flexShrink: 0,
          }}
        >
          <Icon size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 600, color: colors.text, letterSpacing: "0.02em" }}>
            {data.typeName || nodeType.replace("_", " ")}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.name || "Untitled Node"}
          </div>
        </div>
      </div>

      {/* Node Description Preview */}
      {data.description && (
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: "1.3" }}>
          {data.description}
        </div>
      )}

      {/* Source Handle(s) (output to downstream) */}
      {!isTerminal && !isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: "var(--accent-ai)",
            width: "8px",
            height: "8px",
            border: "2px solid #ffffff",
          }}
        />
      )}

      {/* Condition handles for multiple branches */}
      {isCondition && (
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "10px", paddingTop: "6px", borderTop: "1px dashed var(--border-light)" }}>
          <div style={{ position: "relative", fontSize: "10px", color: "#b45309", fontWeight: 600 }}>
            <span>branch</span>
            <Handle
              type="source"
              id="branch"
              position={Position.Bottom}
              style={{ background: "#f59e0b", width: "7px", height: "7px", border: "1px solid #ffffff" }}
            />
          </div>
          <div style={{ position: "relative", fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
            <span>default</span>
            <Handle
              type="source"
              id="default"
              position={Position.Bottom}
              style={{ background: "#64748b", width: "7px", height: "7px", border: "1px solid #ffffff" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
