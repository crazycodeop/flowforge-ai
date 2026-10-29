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
} from "lucide-react";

const NODE_CATALOG = [
  {
    category: "Input & Triggers",
    items: [
      { type: "trigger", name: "API Trigger", description: "Webhook or API entry point", icon: Zap },
      { type: "input_data", name: "Input Data", description: "Inject static or external payload", icon: FileInput },
    ],
  },
  {
    category: "AI & Intelligence",
    items: [
      { type: "ai_classify", name: "AI Classify", description: "Zero-shot ticket or intent classification", icon: Sparkles },
      { type: "structured_extract", name: "Structured Extract", description: "Extract strongly typed JSON schema fields", icon: FileCode },
      { type: "retrieval", name: "Knowledge Retrieval", description: "Search approved policy documentation", icon: Search },
    ],
  },
  {
    category: "Logic & Routing",
    items: [
      { type: "condition", name: "Condition Branch", description: "Route flow based on rules", icon: GitBranch },
      { type: "transform", name: "Data Transform", description: "Deterministic field mapping", icon: Shuffle },
    ],
  },
  {
    category: "Gates & Results",
    items: [
      { type: "human_approval", name: "Human Review", description: "Pause run for authorized review", icon: ShieldAlert },
      { type: "output", name: "Workflow Result", description: "Final output payload assembly", icon: CheckCircle2 },
    ],
  },
];

/**
 * Node palette for dragging or clicking to add nodes to the canvas.
 * @param {{ onAddNode: (type: string, name: string) => void }} props
 */
export default function NodePalette({ onAddNode }) {
  const onDragStart = (event, nodeType, nodeName) => {
    event.dataTransfer.setData("application/reactflow/type", nodeType);
    event.dataTransfer.setData("application/reactflow/name", nodeName);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      style={{
        width: "220px",
        background: "var(--surface-card)",
        borderRight: "1px solid var(--border-light)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "16px 12px",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: "12px", padding: "0 4px" }}>
        Node Library
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {NODE_CATALOG.map((group) => (
          <div key={group.category}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", padding: "0 4px" }}>
              {group.category}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type, item.name)}
                    onClick={() => onAddNode(item.type, item.name)}
                    style={{
                      padding: "8px 10px",
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      cursor: "grab",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      transition: "all 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-ai-border)";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.background = "var(--surface-subtle)";
                    }}
                  >
                    <div style={{ marginTop: "2px", color: "var(--accent-ai)" }}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: "1.2", marginTop: "1px" }}>
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
