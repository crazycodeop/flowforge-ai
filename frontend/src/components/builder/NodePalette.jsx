import React from "react";
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
  X,
} from "lucide-react";

const NODE_CATALOG = [
  {
    category: "Input & Triggers",
    items: [
      { type: "trigger", name: "API Trigger", description: "Webhook entry point", icon: Zap },
      { type: "input_data", name: "Input Data", description: "External payload", icon: FileInput },
    ],
  },
  {
    category: "AI & Intelligence",
    items: [
      { type: "ai_classify", name: "AI Classify", description: "Zero-shot intent classification", icon: Sparkles },
      { type: "structured_extract", name: "Structured Extract", description: "JSON schema entity parser", icon: FileCode },
      { type: "retrieval", name: "Knowledge Retrieval", description: "Vector policy documentation", icon: Search },
    ],
  },
  {
    category: "Logic & Routing",
    items: [
      { type: "condition", name: "Condition Branch", description: "Rule-based branching", icon: GitBranch },
      { type: "transform", name: "Data Transform", description: "Deterministic field mapping", icon: Shuffle },
    ],
  },
  {
    category: "Gates & Results",
    items: [
      { type: "human_approval", name: "Human Review", description: "Pause for compliance gate", icon: ShieldAlert },
      { type: "output", name: "Workflow Result", description: "Final payload assembly", icon: CheckCircle2 },
    ],
  },
];

/**
 * Render-inspired dark node library palette.
 * @param {{
 *   onAddNode: (type: string, name: string) => void,
 *   onClose?: () => void,
 *   isOverlay?: boolean,
 * }} props
 */
export default function NodePalette({ onAddNode, onClose, isOverlay = false }) {
  const onDragStart = (event, nodeType, nodeName) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/name", nodeName);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleItemClick = (type, name) => {
    onAddNode(type, name);
    if (onClose) onClose();
  };

  return (
    <aside
      style={{
        width: isOverlay ? "min(280px, 85vw)" : "210px",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        padding: "14px 12px",
        flexShrink: 0,
        userSelect: "none",
        zIndex: isOverlay ? 40 : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          padding: "0 2px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {isOverlay ? "Add Node to Canvas" : "Node Catalog"}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close palette"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {NODE_CATALOG.map((group) => (
          <div key={group.category}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
                padding: "0 2px",
              }}
            >
              {group.category}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type, item.name)}
                    onClick={() => handleItemClick(item.type, item.name)}
                    role="button"
                    tabIndex={0}
                    style={{
                      padding: "8px 10px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "9px",
                      transition: "border-color 0.1s ease, background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-primary)";
                      e.currentTarget.style.background = "var(--accent-primary-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-light)";
                      e.currentTarget.style.background = "var(--surface-card)";
                    }}
                  >
                    <div style={{ marginTop: "2px", color: "var(--accent-primary)", flexShrink: 0 }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          lineHeight: "1.25",
                          marginTop: "2px",
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
