import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../api/client";
import {
  X,
  Trash2,
  Sliders,
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

const NODE_TAGS = {
  trigger: "Trigger",
  input_data: "Input Data",
  ai_classify: "AI Classifier",
  structured_extract: "Structured Extract",
  retrieval: "Knowledge RAG",
  condition: "Condition Branch",
  transform: "Data Transform",
  human_approval: "Human Review Gate",
  output: "Workflow Result",
};

/**
 * Reusable guided model dropdown to prevent typos.
 */
const PROVIDER_MODELS = {
  groq: [
    { label: "qwen/qwen3.8-27b (Groq LPU - Recommended)", value: "qwen/qwen3.8-27b" },
    { label: "openai/gpt-oss-120b (Groq LPU)", value: "openai/gpt-oss-120b" },
    { label: "openai/gpt-oss-20b (Groq LPU)", value: "openai/gpt-oss-20b" },
  ],
  openai: [
    { label: "gpt-4o-mini (OpenAI Fast)", value: "gpt-4o-mini" },
    { label: "gpt-4o (OpenAI Flagship)", value: "gpt-4o" },
  ],
  gemini: [
    { label: "gemini-1.5-flash (Google Fast)", value: "gemini-1.5-flash" },
    { label: "gemini-1.5-pro (Google Deep)", value: "gemini-1.5-pro" },
  ],
  mock: [
    { label: "mock-model-v1 (Simulated)", value: "mock-model-v1" },
  ],
};

/**
 * Filtered model dropdown displaying ONLY models with active/saved API keys.
 */
function ModelSelector({ value, onChange }) {
  const [aiSettings, setAiSettings] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getAISettings()
      .then((data) => {
        if (isMounted) setAiSettings(data);
      })
      .catch((err) => console.warn("Could not load AI settings in inspector:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter available models to ONLY providers that have a configured key
  const availableModels = useMemo(() => {
    const list = [
      {
        label: `Default (Workspace Default${aiSettings?.model ? ` - ${aiSettings.model}` : ""})`,
        value: "",
      },
    ];

    if (!aiSettings) {
      // Default to groq models since groq is the default configured provider
      return [...list, ...(PROVIDER_MODELS.groq || [])];
    }

    const providers = aiSettings.providers || [];
    providers.forEach((prov) => {
      // Only include models if provider has a configured key or is mock
      if (prov.has_key) {
        const models = PROVIDER_MODELS[prov.id] || [];
        list.push(...models);
      }
    });

    return list;
  }, [aiSettings]);

  // Check if current value belongs to an unkeyed provider (e.g. legacy gemini)
  const isUnkeyedCurrent = useMemo(() => {
    if (!value || !aiSettings?.providers) return false;
    // Check if value is from a provider without key
    if (value.startsWith("gemini") && !aiSettings.providers.find(p => p.id === "gemini")?.has_key) return true;
    if (value.startsWith("gpt") && !aiSettings.providers.find(p => p.id === "openai")?.has_key) return true;
    return false;
  }, [value, aiSettings]);

  const isCustom = Boolean(value && !availableModels.some((m) => m.value === value) && !isUnkeyedCurrent);
  const [showCustom, setShowCustom] = useState(isCustom);

  const missingKeyProviders = useMemo(() => {
    if (!aiSettings?.providers) return [];
    return aiSettings.providers.filter((p) => p.requires_key && !p.has_key).map((p) => p.name);
  }, [aiSettings]);

  return (
    <div>
      <select
        value={isUnkeyedCurrent ? "unkeyed" : showCustom ? "custom" : (value || "")}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setShowCustom(true);
          } else if (e.target.value === "unkeyed") {
            // Keep current
          } else {
            setShowCustom(false);
            onChange(e.target.value || null);
          }
        }}
        className="input"
        style={{
          fontSize: "12px",
          width: "100%",
          borderColor: isUnkeyedCurrent ? "#ef4444" : undefined,
        }}
      >
        {isUnkeyedCurrent && (
          <option value="unkeyed" style={{ color: "#f87171" }}>
            ⚠ {value} (Missing API Key — Select a valid model below)
          </option>
        )}
        {availableModels.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
        <option value="custom">Custom Model ID...</option>
      </select>

      {showCustom && (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Enter custom model ID (e.g. meta-llama/llama-3.1)..."
          className="input"
          style={{ fontSize: "11px", marginTop: "4px" }}
          autoFocus
        />
      )}

      {isUnkeyedCurrent && (
        <div style={{ marginTop: "4px", padding: "6px 8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "4px" }}>
          <span style={{ fontSize: "10px", color: "#f87171", display: "block", lineHeight: 1.3 }}>
            ⚠ <strong>{value}</strong> requires an API key that is not configured. Please switch to <strong>Default</strong> or add the key in Settings.
          </span>
        </div>
      )}

      {missingKeyProviders.length > 0 && !isUnkeyedCurrent && (
        <span style={{ fontSize: "10px", color: "#737373", marginTop: "4px", display: "block", lineHeight: 1.3 }}>
          Showing only models with saved keys. Add {missingKeyProviders.join(", ")} keys in <a href="/settings" style={{ color: "#a78bfa", textDecoration: "underline" }}>Settings</a> to unlock more.
        </span>
      )}
    </div>
  );
}

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
  const Icon = NODE_ICONS[nodeType] || Sliders;
  const tag = NODE_TAGS[nodeType] || nodeType;

  // Local state for raw JSON text inputs to allow smooth editing without parsing errors on every keystroke
  const [jsonTextState, setJsonTextState] = useState({});
  const [jsonErrorState, setJsonErrorState] = useState({});

  useEffect(() => {
    // Sync local JSON text buffers when node changes
    if (nodeType === "trigger") {
      setJsonTextState({
        input_schema: JSON.stringify(config.input_schema || {}, null, 2),
      });
    } else if (nodeType === "input_data") {
      setJsonTextState({
        default_payload: JSON.stringify(config.default_payload || {}, null, 2),
      });
    } else if (nodeType === "structured_extract") {
      setJsonTextState({
        schema_definition: JSON.stringify(config.schema_definition || {}, null, 2),
      });
    } else if (nodeType === "transform") {
      setJsonTextState({
        mapping_rules: JSON.stringify(config.mapping_rules || {}, null, 2),
      });
    } else if (nodeType === "output") {
      setJsonTextState({
        response_template: JSON.stringify(config.response_template || {}, null, 2),
      });
    }
    setJsonErrorState({});
  }, [node.id, nodeType]);

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

  const handleJsonFieldChange = (key, text) => {
    setJsonTextState((prev) => ({ ...prev, [key]: text }));
    try {
      const parsed = JSON.parse(text);
      setJsonErrorState((prev) => ({ ...prev, [key]: null }));
      handleConfigChange(key, parsed);
    } catch (err) {
      setJsonErrorState((prev) => ({ ...prev, [key]: "Invalid JSON format" }));
    }
  };

  return (
    <aside
      style={{
        width: isOverlay ? "min(360px, 92vw)" : "320px",
        background: "#111111",
        borderLeft: "1px solid #222222",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "16px",
        flexShrink: 0,
        height: "100%",
        zIndex: isOverlay ? 40 : "auto",
        fontFamily: "var(--font-sans)",
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
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              background: "rgba(139, 92, 246, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5", lineHeight: 1.2 }}>
              Configure Node
            </div>
            <div style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: 500 }}>
              {tag}
            </div>
          </div>
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
            placeholder="e.g. Triage Customer Ticket"
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
            placeholder="Brief explanation of what this step does"
          />
        </div>

        {/* 1. API TRIGGER CONFIG */}
        {nodeType === "trigger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Trigger Type
              </label>
              <select
                value={config.trigger_type || "api"}
                onChange={(e) => handleConfigChange("trigger_type", e.target.value)}
                className="input"
                style={{ fontSize: "12px" }}
              >
                <option value="api">API Webhook (REST POST)</option>
                <option value="manual">Manual Trigger</option>
                <option value="scheduled">Scheduled Cron</option>
              </select>
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                How this workflow is initiated.
              </span>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#888888" }}>
                  Input Schema (JSON Schema)
                </label>
                {jsonErrorState.input_schema && (
                  <span style={{ fontSize: "10px", color: "#ef4444" }}>Invalid JSON</span>
                )}
              </div>
              <textarea
                rows={5}
                value={jsonTextState.input_schema ?? JSON.stringify(config.input_schema || {}, null, 2)}
                onChange={(e) => handleJsonFieldChange("input_schema", e.target.value)}
                className="input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
                placeholder='{\n  "type": "object",\n  "properties": {\n    "ticket_text": { "type": "string" }\n  }\n}'
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Defines the expected payload structure for incoming triggers.
              </span>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#34d399", fontWeight: 600, marginBottom: "2px" }}>
                Webhook Endpoint:
              </div>
              <div style={{ color: "#a3a3a3", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                POST /api/v1/workflows/&#123;id&#125;/run
              </div>
            </div>
          </div>
        )}

        {/* 2. INPUT DATA CONFIG */}
        {nodeType === "input_data" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#888888" }}>
                  Default / Fallback Payload (JSON)
                </label>
                {jsonErrorState.default_payload && (
                  <span style={{ fontSize: "10px", color: "#ef4444" }}>Invalid JSON</span>
                )}
              </div>
              <textarea
                rows={6}
                value={jsonTextState.default_payload ?? JSON.stringify(config.default_payload || {}, null, 2)}
                onChange={(e) => handleJsonFieldChange("default_payload", e.target.value)}
                className="input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
                placeholder='{\n  "ticket_text": "Sample inquiry text...",\n  "user_id": "usr_100"\n}'
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Used if no external payload is provided when executing the workflow.
              </span>
            </div>
          </div>
        )}

        {/* 3. AI CLASSIFY CONFIG */}
        {nodeType === "ai_classify" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Prompt Template
              </label>
              <textarea
                rows={3}
                value={config.prompt_template || ""}
                onChange={(e) => handleConfigChange("prompt_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Classify the incoming ticket intent: {run_input.ticket_text}"
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Interpolate upstream fields using &#123;field_name&#125;.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Categories (comma-separated, at least 2)
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
                placeholder="billing, technical, general"
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                The AI will choose the single best matching category.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Model Override (Select to Prevent Typos)
                </label>
                <ModelSelector
                  value={config.model || ""}
                  onChange={(val) => handleConfigChange("model", val)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Temperature ({config.temperature ?? 0.0})
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={config.temperature ?? 0.0}
                  onChange={(e) => handleConfigChange("temperature", parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#8b5cf6" }}
                />
                <span style={{ fontSize: "10px", color: "#666666" }}>0.0 = deterministic & consistent</span>
              </div>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#a78bfa", fontWeight: 600, marginBottom: "2px" }}>
                Output Provided to Downstream Nodes:
              </div>
              <div style={{ color: "#a3a3a3", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                &#123; category, confidence, reasoning &#125;
              </div>
            </div>
          </div>
        )}

        {/* 4. STRUCTURED EXTRACT CONFIG */}
        {nodeType === "structured_extract" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Prompt Instruction
              </label>
              <textarea
                rows={3}
                value={config.prompt_template || ""}
                onChange={(e) => handleConfigChange("prompt_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Extract customer email, issue summary, and priority from: {run_input.ticket_text}"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#888888" }}>
                  Schema Definition (JSON Schema)
                </label>
                {jsonErrorState.schema_definition && (
                  <span style={{ fontSize: "10px", color: "#ef4444" }}>Invalid JSON</span>
                )}
              </div>
              <textarea
                rows={6}
                value={jsonTextState.schema_definition ?? JSON.stringify(config.schema_definition || {}, null, 2)}
                onChange={(e) => handleJsonFieldChange("schema_definition", e.target.value)}
                className="input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
                placeholder='{\n  "type": "object",\n  "properties": {\n    "amount": { "type": "number" },\n    "priority": { "type": "string" }\n  },\n  "required": ["priority"]\n}'
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Model output is strictly validated against this JSON schema via Pydantic.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Model Override (Select to Prevent Typos)
                </label>
                <ModelSelector
                  value={config.model || ""}
                  onChange={(val) => handleConfigChange("model", val)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Temperature ({config.temperature ?? 0.0})
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={config.temperature ?? 0.0}
                  onChange={(e) => handleConfigChange("temperature", parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#8b5cf6" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. KNOWLEDGE RETRIEVAL CONFIG */}
        {nodeType === "retrieval" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Collection Name
              </label>
              <input
                type="text"
                value={config.collection_name || "support_policies"}
                onChange={(e) => handleConfigChange("collection_name", e.target.value)}
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="support_policies"
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Target knowledge base collection to search against.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Query Template
              </label>
              <textarea
                rows={2}
                value={config.query_template || ""}
                onChange={(e) => handleConfigChange("query_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="{node_classify_ticket.category} policy: {run_input.ticket_text}"
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Dynamic search query rendered before vector retrieval.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Top K Documents ({config.top_k || 3})
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.top_k || 3}
                  onChange={(e) => handleConfigChange("top_k", parseInt(e.target.value) || 3)}
                  className="input"
                  style={{ fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Min Score ({config.score_threshold ?? 0.6})
                </label>
                <input
                  type="number"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={config.score_threshold ?? 0.6}
                  onChange={(e) => handleConfigChange("score_threshold", parseFloat(e.target.value) || 0.6)}
                  className="input"
                  style={{ fontSize: "12px" }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#67e8f9", fontWeight: 600, marginBottom: "2px" }}>
                Output Provided to Downstream Nodes:
              </div>
              <div style={{ color: "#a3a3a3", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                &#123; passages, sources, count &#125;
              </div>
            </div>
          </div>
        )}

        {/* 6. CONDITION BRANCH CONFIG */}
        {nodeType === "condition" && (() => {
          const activeField = config.field_path || config.branches?.[0]?.field_path || "amount";
          const activeOp = config.operator || config.branches?.[0]?.operator || "greater_than";
          const activeVal = config.value ?? config.branches?.[0]?.value ?? "100";

          const updateCondition = (field, val) => {
            const nextField = field === "field_path" ? val : activeField;
            const nextOp = field === "operator" ? val : activeOp;
            const nextVal = field === "value" ? val : activeVal;

            onUpdateNode(node.id, {
              ...node.data,
              config: {
                ...config,
                field_path: nextField,
                operator: nextOp,
                value: nextVal,
                branches: [
                  {
                    branch_name: "true",
                    operator: nextOp,
                    field_path: nextField,
                    value: nextVal,
                  },
                ],
                default_branch: "false",
              },
            });
          };

          const opSymbol =
            activeOp === "greater_than" ? ">" :
            activeOp === "less_than" ? "<" :
            activeOp === "not_equals" ? "!=" :
            activeOp === "contains" ? "contains" :
            activeOp === "is_empty" ? "is empty" :
            activeOp === "is_not_empty" ? "is not empty" : "==";

          const hideValInput = activeOp === "is_empty" || activeOp === "is_not_empty";

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Field / Variable to Check
                </label>
                <input
                  type="text"
                  placeholder="e.g. amount, category, or extract.priority"
                  value={activeField}
                  onChange={(e) => updateCondition("field_path", e.target.value)}
                  className="input"
                  style={{ fontSize: "12px" }}
                />
                <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                  Path in input payload or upstream node output (e.g. <code style={{ color: "#a78bfa" }}>node_extract_fields.extracted.priority</code>)
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Condition Operator
                </label>
                <select
                  value={activeOp}
                  onChange={(e) => updateCondition("operator", e.target.value)}
                  className="input"
                  style={{ fontSize: "12px" }}
                >
                  <option value="greater_than">Greater than (&gt;)</option>
                  <option value="less_than">Less than (&lt;)</option>
                  <option value="equals">Equals (==)</option>
                  <option value="not_equals">Not equals (!=)</option>
                  <option value="contains">Contains text</option>
                  <option value="is_empty">Is Empty / Null</option>
                  <option value="is_not_empty">Is Not Empty</option>
                </select>
              </div>

              {!hideValInput && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                    Comparison Value (Threshold)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100, high, billing"
                    value={activeVal}
                    onChange={(e) => updateCondition("value", e.target.value)}
                    className="input"
                    style={{ fontSize: "12px" }}
                  />
                  <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                    The target value or threshold number to compare against.
                  </span>
                </div>
              )}

              {/* Human-Readable Rule Preview Box */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "#161616",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  fontSize: "11px",
                  lineHeight: "1.4",
                }}
              >
                <div style={{ fontWeight: 600, color: "#f5f5f5", marginBottom: "4px" }}>
                  Rule Logic Preview:
                </div>
                <div style={{ color: "#fbbf24", fontFamily: "var(--font-mono)", marginBottom: "6px" }}>
                  If {activeField || "field"} {opSymbol} {!hideValInput ? (activeVal || '""') : ""}
                </div>
                <div style={{ color: "#a3a3a3", display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>• TRUE</span> ➔ routes to green handle
                  </div>
                  <div>
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>• FALSE</span> ➔ routes to red handle
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 7. DATA TRANSFORM CONFIG */}
        {nodeType === "transform" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#888888" }}>
                  Field Mapping Rules (JSON)
                </label>
                {jsonErrorState.mapping_rules && (
                  <span style={{ fontSize: "10px", color: "#ef4444" }}>Invalid JSON</span>
                )}
              </div>
              <textarea
                rows={6}
                value={jsonTextState.mapping_rules ?? JSON.stringify(config.mapping_rules || {}, null, 2)}
                onChange={(e) => handleJsonFieldChange("mapping_rules", e.target.value)}
                className="input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
                placeholder='{\n  "status": "processed",\n  "ticket_category": "{node_classify_ticket.category}",\n  "escalated": true\n}'
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Maps and reshapes upstream data deterministically. Values inside &#123;curly_braces&#125; are resolved from upstream outputs.
              </span>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#818cf8", fontWeight: 600, marginBottom: "2px" }}>
                Transformed Output Format:
              </div>
              <div style={{ color: "#a3a3a3", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                &#123; transformed: &#123; ...your_rules &#125; &#125;
              </div>
            </div>
          </div>
        )}

        {/* 8. HUMAN REVIEW / APPROVAL GATE CONFIG */}
        {nodeType === "human_approval" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Approval Action Title
              </label>
              <input
                type="text"
                value={config.title || ""}
                onChange={(e) => handleConfigChange("title", e.target.value)}
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="e.g. Review High-Value Refund"
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                The headline displayed on the Approvals inbox page.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                Summary / Instruction Template
              </label>
              <textarea
                rows={3}
                value={config.description_template || ""}
                onChange={(e) => handleConfigChange("description_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Please review ticket {run_input.ticket_text}. Verified refund eligibility required."
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                Detailed context shown to the human reviewer.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Required Role
                </label>
                <select
                  value={config.required_role || "reviewer"}
                  onChange={(e) => handleConfigChange("required_role", e.target.value)}
                  className="input"
                  style={{ fontSize: "12px" }}
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="finance">Finance Specialist</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Timeout (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={config.timeout_hours || 24}
                  onChange={(e) => handleConfigChange("timeout_hours", parseInt(e.target.value) || 24)}
                  className="input"
                  style={{ fontSize: "12px" }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#f87171", fontWeight: 600, marginBottom: "2px" }}>
                Workflow Behavior:
              </div>
              <div style={{ color: "#a3a3a3", fontSize: "10px", lineHeight: "1.4" }}>
                Pauses run execution with status <code style={{ color: "#fbbf24" }}>WAITING_FOR_APPROVAL</code> until approved or rejected via the Approvals portal.
              </div>
            </div>
          </div>
        )}

        {/* 9. WORKFLOW RESULT / OUTPUT CONFIG */}
        {nodeType === "output" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#888888" }}>
                  Response Template (JSON)
                </label>
                {jsonErrorState.response_template && (
                  <span style={{ fontSize: "10px", color: "#ef4444" }}>Invalid JSON</span>
                )}
              </div>
              <textarea
                rows={6}
                value={jsonTextState.response_template ?? JSON.stringify(config.response_template || {}, null, 2)}
                onChange={(e) => handleJsonFieldChange("response_template", e.target.value)}
                className="input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "11px", resize: "vertical" }}
                placeholder='{\n  "status": "triaged",\n  "category": "{node_classify_ticket.category}",\n  "details": "{node_extract_fields.extracted}"\n}'
              />
              <span style={{ fontSize: "10px", color: "#666666", marginTop: "2px", display: "block" }}>
                The final response dictionary returned by the workflow execution to client callers.
              </span>
            </div>

            <div
              style={{
                padding: "8px 10px",
                background: "#161616",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "11px",
              }}
            >
              <div style={{ color: "#4ade80", fontWeight: 600, marginBottom: "2px" }}>
                Workflow Result:
              </div>
              <div style={{ color: "#a3a3a3", fontSize: "10px" }}>
                Terminal node. Assembles final response object from all upstream steps.
              </div>
            </div>
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
