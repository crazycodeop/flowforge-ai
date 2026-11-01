import React, { useState, useEffect, useMemo } from "react";
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
  HelpCircle,
} from "lucide-react";
import { api } from "../../api/client";

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

const PROVIDER_MODELS = {
  groq: [
    { label: "qwen/qwen3.8-27b (Groq LPU)", value: "qwen/qwen3.8-27b" },
    { label: "openai/gpt-oss-120b (Groq LPU)", value: "openai/gpt-oss-120b" },
    { label: "openai/gpt-oss-20b (Groq LPU)", value: "openai/gpt-oss-20b" },
  ],
  openai: [
    { label: "gpt-4o-mini (OpenAI Fast)", value: "gpt-4o-mini" },
    { label: "gpt-4o (OpenAI Flagship)", value: "gpt-4o" },
  ],
  gemini: [
    { label: "gemini-2.5-flash (Google Fast - Recommended)", value: "gemini-2.5-flash" },
    { label: "gemini-2.0-flash (Google Low Latency)", value: "gemini-2.0-flash" },
    { label: "gemini-2.5-pro (Google Deep Reasoning)", value: "gemini-2.5-pro" },
    { label: "gemini-1.5-flash (Google Legacy Checkpoint)", value: "gemini-1.5-flash" },
  ],
  mock: [
    { label: "mock-model-v1 (Simulated)", value: "mock-model-v1" },
  ],
};

/**
 * Clean field label with optional native hover tooltip.
 */
function FieldLabel({ label, tooltip }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#888888",
        marginBottom: "4px",
      }}
    >
      <span>{label}</span>
      {tooltip && (
        <span
          title={tooltip}
          style={{
            cursor: "help",
            color: "#666666",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <HelpCircle size={11} />
        </span>
      )}
    </label>
  );
}

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

  const availableModels = useMemo(() => {
    const list = [
      {
        label: `Default (${aiSettings?.model || "Workspace Settings"})`,
        value: "",
      },
    ];

    if (!aiSettings) {
      return [...list, ...(PROVIDER_MODELS.groq || [])];
    }

    const providers = aiSettings.providers || [];
    providers.forEach((prov) => {
      if (prov.has_key) {
        const models = PROVIDER_MODELS[prov.id] || [];
        list.push(...models);
      }
    });

    return list;
  }, [aiSettings]);

  const isUnkeyedCurrent = useMemo(() => {
    if (!value || !aiSettings?.providers) return false;
    if (value.startsWith("gemini") && !aiSettings.providers.find((p) => p.id === "gemini")?.has_key) return true;
    if (value.startsWith("gpt") && !aiSettings.providers.find((p) => p.id === "openai")?.has_key) return true;
    return false;
  }, [value, aiSettings]);

  const isCustom = Boolean(value && !availableModels.some((m) => m.value === value) && !isUnkeyedCurrent);
  const [showCustom, setShowCustom] = useState(isCustom);

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
            ⚠ {value} (Missing Key)
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
          placeholder="e.g. meta-llama/llama-3.1"
          className="input"
          style={{ fontSize: "11px", marginTop: "4px" }}
          autoFocus
        />
      )}
    </div>
  );
}

/**
 * Render-inspired dark inspector panel for configuring selected nodes.
 * Streamlined, clean, and minimal without noisy helper paragraphs.
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

  const [jsonTextState, setJsonTextState] = useState({});
  const [jsonErrorState, setJsonErrorState] = useState({});

  useEffect(() => {
    if (nodeType === "trigger") {
      setJsonTextState({ input_schema: JSON.stringify(config.input_schema || {}, null, 2) });
    } else if (nodeType === "input_data") {
      setJsonTextState({ default_payload: JSON.stringify(config.default_payload || {}, null, 2) });
    } else if (nodeType === "structured_extract") {
      setJsonTextState({ schema_definition: JSON.stringify(config.schema_definition || {}, null, 2) });
    } else if (nodeType === "transform") {
      setJsonTextState({ mapping_rules: JSON.stringify(config.mapping_rules || {}, null, 2) });
    } else if (nodeType === "output") {
      setJsonTextState({ response_template: JSON.stringify(config.response_template || {}, null, 2) });
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
    } catch {
      setJsonErrorState((prev) => ({ ...prev, [key]: "Invalid JSON" }));
    }
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
        padding: "14px 16px",
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
          marginBottom: "14px",
          paddingBottom: "8px",
          borderBottom: "1px solid #222222",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "4px",
              background: "rgba(139, 92, 246, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={13} color="#a78bfa" />
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
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
            <Trash2 size={13} />
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
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        {/* Node Label */}
        <div>
          <FieldLabel label="Label" />
          <input
            type="text"
            value={node.data.name || ""}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            className="input"
            style={{ fontSize: "12px" }}
            placeholder="e.g. AI Intent Classifier"
          />
        </div>

        {/* Node Description */}
        <div>
          <FieldLabel label="Description" />
          <input
            type="text"
            value={node.data.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            className="input"
            style={{ fontSize: "12px" }}
            placeholder="Optional step notes"
          />
        </div>

        {/* 1. API TRIGGER */}
        {nodeType === "trigger" && (
          <>
            <div>
              <FieldLabel label="Trigger Type" />
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
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FieldLabel label="Input Schema" tooltip="JSON Schema validating incoming payload structure" />
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
            </div>
          </>
        )}

        {/* 2. INPUT DATA */}
        {nodeType === "input_data" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldLabel label="Default Payload (JSON)" tooltip="Fallback mock data if none is provided at runtime" />
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
              placeholder='{\n  "ticket_text": "Sample inquiry..."\n}'
            />
          </div>
        )}

        {/* 3. AI CLASSIFY */}
        {nodeType === "ai_classify" && (
          <>
            <div>
              <FieldLabel label="Prompt Template" tooltip="Supports {variable} interpolation from upstream steps" />
              <textarea
                rows={3}
                value={config.prompt_template || ""}
                onChange={(e) => handleConfigChange("prompt_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Classify customer request: {ticket_text}"
              />
            </div>

            <div>
              <FieldLabel label="Categories" tooltip="Comma-separated target classification classes" />
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
            </div>

            <div>
              <FieldLabel label="Model" tooltip="Override system default model for this step" />
              <ModelSelector
                value={config.model || ""}
                onChange={(val) => handleConfigChange("model", val)}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FieldLabel label="Temperature" tooltip="0.0 = deterministic & consistent, 1.0 = creative" />
                <span style={{ fontSize: "10px", color: "#a3a3a3", fontFamily: "var(--font-mono)" }}>
                  {config.temperature ?? 0.0}
                </span>
              </div>
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
          </>
        )}

        {/* 4. STRUCTURED EXTRACT */}
        {nodeType === "structured_extract" && (
          <>
            <div>
              <FieldLabel label="Prompt Instruction" tooltip="Instruction guiding what fields to extract" />
              <textarea
                rows={3}
                value={config.prompt_template || ""}
                onChange={(e) => handleConfigChange("prompt_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Extract customer email, amount, and priority from: {ticket_text}"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FieldLabel label="Schema Definition" tooltip="Pydantic validated JSON Schema for extracted entities" />
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
                placeholder='{\n  "type": "object",\n  "properties": {\n    "amount": { "type": "number" }\n  }\n}'
              />
            </div>

            <div>
              <FieldLabel label="Model" tooltip="Override system default model for this step" />
              <ModelSelector
                value={config.model || ""}
                onChange={(val) => handleConfigChange("model", val)}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FieldLabel label="Temperature" />
                <span style={{ fontSize: "10px", color: "#a3a3a3", fontFamily: "var(--font-mono)" }}>
                  {config.temperature ?? 0.0}
                </span>
              </div>
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
          </>
        )}

        {/* 5. KNOWLEDGE RETRIEVAL */}
        {nodeType === "retrieval" && (
          <>
            <div>
              <FieldLabel label="Collection" tooltip="Vector knowledge base collection to query" />
              <input
                type="text"
                value={config.collection_name || "support_policies"}
                onChange={(e) => handleConfigChange("collection_name", e.target.value)}
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="support_policies"
              />
            </div>

            <div>
              <FieldLabel label="Query Template" tooltip="Supports {variable} interpolation before vector search" />
              <textarea
                rows={2}
                value={config.query_template || ""}
                onChange={(e) => handleConfigChange("query_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="{node_classify.category} policy: {ticket_text}"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <FieldLabel label="Top K" tooltip="Maximum relevant passages to retrieve (1-20)" />
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
                <FieldLabel label="Min Score" tooltip="Vector similarity cut-off filter (0.0 to 1.0)" />
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
          </>
        )}

        {/* 6. CONDITION BRANCH */}
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
            <>
              <div>
                <FieldLabel label="Field Path" tooltip="Path in context, e.g. amount or node_extract.extracted.priority" />
                <input
                  type="text"
                  placeholder="amount, category, or extract.priority"
                  value={activeField}
                  onChange={(e) => updateCondition("field_path", e.target.value)}
                  className="input"
                  style={{ fontSize: "12px" }}
                />
              </div>

              <div>
                <FieldLabel label="Operator" />
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
                  <option value="contains">Contains</option>
                  <option value="is_empty">Is Empty</option>
                  <option value="is_not_empty">Is Not Empty</option>
                </select>
              </div>

              {!hideValInput && (
                <div>
                  <FieldLabel label="Threshold Value" tooltip="Value or number to compare against" />
                  <input
                    type="text"
                    placeholder="100, high, billing"
                    value={activeVal}
                    onChange={(e) => updateCondition("value", e.target.value)}
                    className="input"
                    style={{ fontSize: "12px" }}
                  />
                </div>
              )}

              {/* Compact Logic Rule Preview */}
              <div
                style={{
                  padding: "8px 10px",
                  background: "#161616",
                  border: "1px solid #242424",
                  borderRadius: "5px",
                  fontSize: "11px",
                }}
              >
                <div style={{ color: "#d4d4d4", marginBottom: "4px" }}>
                  Rule: <span style={{ color: "#fbbf24", fontFamily: "var(--font-mono)" }}>If {activeField || "field"} {opSymbol} {!hideValInput ? (activeVal || '""') : ""}</span>
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "10px" }}>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>• TRUE ➔ green</span>
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>• FALSE ➔ red</span>
                </div>
              </div>
            </>
          );
        })()}

        {/* 7. DATA TRANSFORM */}
        {nodeType === "transform" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldLabel label="Mapping Rules (JSON)" tooltip="Maps and projects fields deterministically" />
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
              placeholder='{\n  "status": "processed",\n  "category": "{node_classify.category}"\n}'
            />
          </div>
        )}

        {/* 8. HUMAN REVIEW */}
        {nodeType === "human_approval" && (
          <>
            <div>
              <FieldLabel label="Action Title" tooltip="Headline shown in the Approvals queue" />
              <input
                type="text"
                value={config.title || ""}
                onChange={(e) => handleConfigChange("title", e.target.value)}
                className="input"
                style={{ fontSize: "12px" }}
                placeholder="Review High-Value Refund"
              />
            </div>

            <div>
              <FieldLabel label="Instruction Template" tooltip="Context shown to the human reviewer" />
              <textarea
                rows={3}
                value={config.description_template || ""}
                onChange={(e) => handleConfigChange("description_template", e.target.value)}
                className="input"
                style={{ fontSize: "12px", resize: "vertical" }}
                placeholder="Review refund request: {ticket_text}"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <FieldLabel label="Required Role" tooltip="Minimum permission required to approve" />
                <select
                  value={config.required_role || "reviewer"}
                  onChange={(e) => handleConfigChange("required_role", e.target.value)}
                  className="input"
                  style={{ fontSize: "12px" }}
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="finance">Finance</option>
                </select>
              </div>

              <div>
                <FieldLabel label="Timeout (hrs)" tooltip="Hours before approval expires" />
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
          </>
        )}

        {/* 9. WORKFLOW RESULT */}
        {nodeType === "output" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldLabel label="Response Template (JSON)" tooltip="Final response payload assembled and returned to the API caller" />
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
              placeholder='{\n  "status": "success",\n  "category": "{node_classify.category}"\n}'
            />
          </div>
        )}

        {/* Danger Zone: Delete Node */}
        <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #222222" }}>
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "7px 10px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "5px",
              color: "#f87171",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Trash2 size={12} />
            <span>Delete Node</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
