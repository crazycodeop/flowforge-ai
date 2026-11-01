import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Save,
  Check,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Shield,
  AlertTriangle,
  UploadCloud,
  ChevronLeft,
  X,
  Play,
  Plus,
  Sliders,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";
import CustomNode from "../components/builder/CustomNode";
import NodePalette from "../components/builder/NodePalette";
import NodeInspector from "../components/builder/NodeInspector";

export const DEFAULT_NODE_CONFIGS = {
  trigger: {
    trigger_type: "api",
    input_schema: {
      type: "object",
      properties: {
        ticket_text: { type: "string" },
      },
    },
  },
  input_data: {
    default_payload: {
      ticket_text: "I was charged $89 twice on my card. Please refund my statement.",
    },
  },
  ai_classify: {
    prompt_template: "Classify incoming customer support request:\n{ticket_text}",
    categories: ["billing", "technical", "general"],
    temperature: 0.0,
    model: null,
  },
  structured_extract: {
    prompt_template: "Extract structured customer information from:\n{ticket_text}",
    schema_definition: {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        email: { type: "string" },
        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["urgency"],
    },
    temperature: 0.0,
    model: null,
  },
  retrieval: {
    collection_name: "support_policies",
    query_template: "{ticket_text}",
    top_k: 3,
    score_threshold: 0.6,
  },
  condition: {
    field_path: "amount",
    operator: "greater_than",
    value: "100",
    branches: [
      {
        branch_name: "true",
        operator: "greater_than",
        field_path: "amount",
        value: "100",
      },
    ],
    default_branch: "false",
  },
  transform: {
    mapping_rules: {
      status: "processed",
      customer_id: "{customer_id}",
      summary: "Processed support inquiry",
    },
  },
  human_approval: {
    title: "High-Priority Compliance Review",
    description_template: "Review required for inquiry: {ticket_text}",
    timeout_hours: 24,
    required_role: "reviewer",
  },
  output: {
    response_template: {
      status: "success",
      category: "{ai_classify.category}",
      resolution: "Request triaged and queued for fulfillment",
    },
  },
};


export const STARTER_TEMPLATES = [
  {
    id: "flagship",
    name: "Customer Support Triage",
    badge: "Flagship",
    icon: Sparkles,
    desc: "Webhook -> Intent Classifier -> Policy Retrieval -> Extract -> Route -> Synthesizer",
    nodes: [
      { id: "node_webhook", type: "trigger", name: "Customer Support Webhook", position: { x: 280, y: 50 }, config: DEFAULT_NODE_CONFIGS.trigger },
      { id: "node_classify", type: "ai_classify", name: "AI Intent Classifier", position: { x: 280, y: 170 }, config: DEFAULT_NODE_CONFIGS.ai_classify },
      { id: "node_retrieval", type: "retrieval", name: "Policy Knowledge Retrieval", position: { x: 280, y: 290 }, config: DEFAULT_NODE_CONFIGS.retrieval },
      { id: "node_extract", type: "structured_extract", name: "Structured Ticket Extractor", position: { x: 280, y: 410 }, config: DEFAULT_NODE_CONFIGS.structured_extract },
      { id: "node_condition", type: "condition", name: "Priority Route", position: { x: 280, y: 530 }, config: DEFAULT_NODE_CONFIGS.condition },
      { id: "node_output", type: "output", name: "Resolution Synthesizer", position: { x: 280, y: 660 }, config: DEFAULT_NODE_CONFIGS.output },
    ],
    edges: [
      { id: "e1", source: "node_webhook", target: "node_classify", animated: true },
      { id: "e2", source: "node_classify", target: "node_retrieval", animated: true },
      { id: "e3", source: "node_retrieval", target: "node_extract", animated: true },
      { id: "e4", source: "node_extract", target: "node_condition", animated: true },
      { id: "e5", source: "node_condition", target: "node_output", sourceHandle: "true", animated: true },
    ],
  },
  {
    id: "approval",
    name: "Human Review & Compliance Gate",
    badge: "Review Gate",
    icon: Shield,
    desc: "Webhook -> Ticket Extractor -> Amount > $100 -> Human Approval Gate -> Result",
    nodes: [
      { id: "node_webhook", type: "trigger", name: "Refund Request Webhook", position: { x: 280, y: 50 }, config: DEFAULT_NODE_CONFIGS.trigger },
      { id: "node_extract", type: "structured_extract", name: "Amount & Urgency Extractor", position: { x: 280, y: 170 }, config: DEFAULT_NODE_CONFIGS.structured_extract },
      { id: "node_condition", type: "condition", name: "Check Amount > $100", position: { x: 280, y: 290 }, config: DEFAULT_NODE_CONFIGS.condition },
      { id: "node_approval", type: "human_approval", name: "Manager Approval Gate", position: { x: 120, y: 430 }, config: DEFAULT_NODE_CONFIGS.human_approval },
      { id: "node_output", type: "output", name: "Resolution Result", position: { x: 420, y: 430 }, config: DEFAULT_NODE_CONFIGS.output },
    ],
    edges: [
      { id: "e1", source: "node_webhook", target: "node_extract", animated: true },
      { id: "e2", source: "node_extract", target: "node_condition", animated: true },
      { id: "e3", source: "node_condition", target: "node_approval", sourceHandle: "true", animated: true },
      { id: "e4", source: "node_condition", target: "node_output", sourceHandle: "false", animated: true },
    ],
  },
  {
    id: "extraction",
    name: "AI Extraction Pipeline",
    badge: "Fast RAG",
    icon: Sparkles,
    desc: "Input Payload -> AI Intent Classifier -> JSON Field Parser -> Result Assembly",
    nodes: [
      { id: "node_input", type: "input_data", name: "Payload Input", position: { x: 280, y: 50 }, config: DEFAULT_NODE_CONFIGS.input_data },
      { id: "node_classify", type: "ai_classify", name: "Category Classifier", position: { x: 280, y: 180 }, config: DEFAULT_NODE_CONFIGS.ai_classify },
      { id: "node_extract", type: "structured_extract", name: "Field Parser", position: { x: 280, y: 310 }, config: DEFAULT_NODE_CONFIGS.structured_extract },
      { id: "node_output", type: "output", name: "Final Assembled Payload", position: { x: 280, y: 440 }, config: DEFAULT_NODE_CONFIGS.output },
    ],
    edges: [
      { id: "e1", source: "node_input", target: "node_classify", animated: true },
      { id: "e2", source: "node_classify", target: "node_extract", animated: true },
      { id: "e3", source: "node_extract", target: "node_output", animated: true },
    ],
  },
];

const nodeTypes = {
  custom: CustomNode,
};

function BuilderCanvas() {
  const modal = useModal();
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved"); // "saved", "saving", "unsaved", "error"
  const isInitialMount = useRef(true);
  const autoSaveTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  // Responsive Drawer states
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;
  const isMobile = windowWidth < 768;

  // Run execution modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runInputJson, setRunInputJson] = useState(
    '{\n  "ticket_text": "I was charged $89 twice on my card. Please refund my statement."\n}'
  );
  const [running, setRunning] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  // Drag over handler for canvas
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop handler: drop a node from the catalog palette onto canvas
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type");
      const name = event.dataTransfer.getData("application/reactflow/name");

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = `node_${Date.now()}`;
      const newNode = {
        id: newId,
        type: "custom",
        position,
        data: {
          id: newId,
          type,
          name: name || "Node",
          description: "",
          config: DEFAULT_NODE_CONFIGS[type] ? JSON.parse(JSON.stringify(DEFAULT_NODE_CONFIGS[type])) : {},
          retry_policy: { max_retries: 3, backoff_base_seconds: 1.0 },
          timeout_seconds: 60,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);
    },
    [screenToFlowPosition]
  );

  // Keyboard / native deletion handler
  const onNodesDelete = useCallback(
    (deletedNodes) => {
      const deletedIds = new Set(deletedNodes.map((n) => n.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
      if (selectedNodeId && deletedIds.has(selectedNodeId)) {
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId]
  );

  // Load workflow from backend
  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getWorkflow(id);
      setWorkflow(data);

      const rawNodes = data.draft_definition?.nodes || [];
      const rawEdges = data.draft_definition?.edges || [];

      // Map to React Flow node format
      const flowNodes = rawNodes.map((n, idx) => ({
        id: n.id,
        type: "custom",
        position: n.position || { x: 250, y: 80 + idx * 110 },
        data: {
          id: n.id,
          type: n.type,
          name: n.name,
          description: n.description,
          config: n.config || {},
          retry_policy: n.retry_policy || {},
          timeout_seconds: n.timeout_seconds || 60,
        },
      }));

      // Map to React Flow edge format
      const flowEdges = rawEdges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle || undefined,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 1.5 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to load workflow: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  // React Flow change handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge_${Date.now()}`,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 1.5 },
          },
          eds
        )
      ),
    []
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Adding a node from palette with smart auto-positioning & connection
  const handleAddNode = (type, name) => {
    const newId = `node_${Date.now()}`;
    const selected = nodes.find((n) => n.id === selectedNodeId);

    const position = selected
      ? { x: selected.position.x, y: selected.position.y + 130 }
      : { x: 280, y: 80 + nodes.length * 120 };

    const newNode = {
      id: newId,
      type: "custom",
      position,
      data: {
        id: newId,
        type,
        name,
        description: "",
        config: DEFAULT_NODE_CONFIGS[type] ? JSON.parse(JSON.stringify(DEFAULT_NODE_CONFIGS[type])) : {},
        retry_policy: { max_retries: 3, backoff_base_seconds: 1.0 },
        timeout_seconds: 60,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    if (selected) {
      setEdges((eds) => [
        ...eds,
        {
          id: `e_${selected.id}_${newId}`,
          source: selected.id,
          target: newId,
          animated: true,
        },
      ]);
    }
    setSelectedNodeId(newId);
    if (!isDesktop) {
      setIsPaletteOpen(false);
    }
  };

  // 1-Click Starter Template applicator
  const handleApplyTemplate = (tpl) => {
    const formattedNodes = tpl.nodes.map((n) => ({
      id: n.id,
      type: "custom",
      position: n.position,
      data: {
        id: n.id,
        type: n.type,
        name: n.name,
        description: "",
        config: JSON.parse(JSON.stringify(n.config)),
        retry_policy: { max_retries: 3, backoff_base_seconds: 1.0 },
        timeout_seconds: 60,
      },
    }));
    setNodes(formattedNodes);
    setEdges(tpl.edges);
    setSelectedNodeId(null);
  };

  // Node Inspector updates
  const handleUpdateNode = (nodeId, updatedData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n))
    );
  };

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Inject onDelete callback into all nodes for direct header deletion
  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: handleDeleteNode,
      },
    }));
  }, [nodes, handleDeleteNode]);


  // Debounced Auto-Save effect
  useEffect(() => {
    if (loading) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setAutoSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving");
        const definition = buildDefinitionPayload();
        await api.updateWorkflow(id, { definition });
        setAutoSaveStatus("saved");
      } catch (err) {
        console.warn("Auto-save failed:", err);
        setAutoSaveStatus("error");
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [nodes, edges]);

  // Convert React Flow graph to backend WorkflowDefinition
  const buildDefinitionPayload = () => {
    const serializedNodes = nodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      name: n.data.name,
      description: n.data.description || null,
      config: n.data.config || {},
      retry_policy: n.data.retry_policy || { max_retries: 3 },
      timeout_seconds: n.data.timeout_seconds || 60,
      position: n.position,
    }));

    const serializedEdges = edges.map((e) => ({
      id: e.id,
      source_node_id: e.source,
      target_node_id: e.target,
      source_handle: e.sourceHandle || null,
    }));

    return {
      schema_version: "1.0.0",
      name: workflow?.name || "Workflow",
      description: workflow?.description || null,
      nodes: serializedNodes,
      edges: serializedEdges,
      default_timeout_seconds: 3600,
    };
  };

  // Save draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const definition = buildDefinitionPayload();
      await api.updateWorkflow(id, { definition });
      setStatusMessage({ type: "success", text: "Draft saved successfully" });
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to save draft: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Validate graph
  const handleValidate = async () => {
    try {
      setStatusMessage(null);
      const definition = buildDefinitionPayload();
      const result = await api.validateWorkflow(id, definition);
      setValidationResult(result);
      setIsValidationOpen(true);
    } catch (err) {
      setStatusMessage({ type: "error", text: `Validation check failed: ${err.message}` });
    }
  };

  // Publish immutable version
  const handlePublish = async () => {
    try {
      setPublishing(true);
      setStatusMessage(null);
      const definition = buildDefinitionPayload();
      await api.updateWorkflow(id, { definition });

      const changelog = await modal.prompt({
        title: "Publish Immutable Version",
        message: "Enter an optional changelog description for this published version snapshot:",
        defaultValue: "Published update",
        placeholder: "e.g. Added compliance review gate",
        confirmText: "Publish Version",
      });
      if (changelog === null) {
        setPublishing(false);
        return;
      }
      const published = await api.publishWorkflow(id, changelog);
      setWorkflow((prev) => ({ ...prev, latest_version: published.version_number }));
      setStatusMessage({
        type: "success",
        text: `Published immutable Version ${published.version_number}!`,
      });
      setIsValidationOpen(false);
    } catch (err) {
      setStatusMessage({ type: "error", text: `Publish failed: ${err.message}` });
      setIsValidationOpen(true);
    } finally {
      setPublishing(false);
    }
  };

  // Trigger live run
  const handleTriggerRun = async () => {
    try {
      setRunning(true);
      setStatusMessage(null);
      let payload = {};
      try {
        payload = JSON.parse(runInputJson);
      } catch (err) {
        await modal.alert({ title: "Invalid Input JSON", message: "Input payload must be valid JSON: " + err.message, variant: "warning" });
        setRunning(false);
        return;
      }
      await api.triggerRun(id, { input_payload: payload });
      setIsRunModalOpen(false);
      navigate("/executions");
    } catch (err) {
      setStatusMessage({ type: "error", text: `Run failed to trigger: ${err.message}` });
    } finally {
      setRunning(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
        Loading workflow canvas...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", position: "relative" }}>
      {/* Builder Subheader */}
      <div
        style={{
          minHeight: "44px",
          background: "#111111",
          borderBottom: "1px solid #222222",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(8px, 2vw, 16px)",
          zIndex: 10,
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {/* Left Subheader: Back, Title, Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <Link to="/workflows" className="btn btn-ghost btn-sm" style={{ padding: "4px" }} aria-label="Back to workflows">
            <ChevronLeft size={16} />
          </Link>
          <div
            style={{
              fontWeight: 600,
              fontSize: "13px",
              color: "#f5f5f5",
              maxWidth: isMobile ? "120px" : "240px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={workflow?.name}
          >
            {workflow?.name}
          </div>
          {workflow?.latest_version ? (
            <span className="badge badge-published" style={{ fontSize: "10px", padding: "1px 6px" }}>
              v{workflow.latest_version}
            </span>
          ) : (
            <span className="badge badge-draft" style={{ fontSize: "10px", padding: "1px 6px" }}>
              Draft
            </span>
          )}

          {/* Auto-Save Indicator */}
          {autoSaveStatus === "saved" && (
            <span style={{ fontSize: "10px", color: "#10b981", display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <Check size={10} /> Auto-saved
            </span>
          )}
          {autoSaveStatus === "saving" && (
            <span style={{ fontSize: "10px", color: "#a78bfa", display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", background: "rgba(167, 139, 250, 0.12)", border: "1px solid rgba(167, 139, 250, 0.25)" }}>
              <RefreshCw size={10} className="spin" /> Saving...
            </span>
          )}
          {autoSaveStatus === "unsaved" && (
            <span style={{ fontSize: "10px", color: "#eab308", display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", background: "rgba(234, 179, 8, 0.12)", border: "1px solid rgba(234, 179, 8, 0.25)" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#eab308" }} /> Unsaved
            </span>
          )}

          {/* Palette toggle button on tablet/mobile */}
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              title="Add Node to Canvas"
            >
              <Plus size={13} color="#8b5cf6" />
              <span className="desktop-only">Nodes</span>
            </button>
          )}

          {/* Inspector toggle button on tablet/mobile if node is selected */}
          {!isDesktop && selectedNode && (
            <button
              type="button"
              onClick={() => setSelectedNodeId(selectedNode.id)}
              className="btn btn-secondary btn-sm"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              title="Configure Selected Node"
            >
              <Sliders size={13} color="#a78bfa" />
              <span className="desktop-only">Config</span>
            </button>
          )}
        </div>

        {/* Right Subheader: Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {statusMessage && (
            <span
              style={{
                fontSize: "11px",
                color: statusMessage.type === "success" ? "var(--status-success)" : "var(--status-danger)",
                marginRight: "4px",
                display: isMobile ? "none" : "inline",
              }}
            >
              {statusMessage.text}
            </span>
          )}
          <button
            onClick={handleValidate}
            className="btn btn-secondary btn-sm"
            style={{ padding: isMobile ? "5px 7px" : "4px 10px", fontSize: "12px" }}
            title="Validate Workflow Graph"
          >
            <CheckCircle size={14} color="#8b5cf6" />
            <span className={isMobile ? "desktop-only" : ""}>Validate</span>
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="btn btn-secondary btn-sm"
            style={{ padding: isMobile ? "5px 7px" : "4px 10px", fontSize: "12px" }}
            title="Save Draft Definition"
          >
            <Save size={14} />
            <span className={isMobile ? "desktop-only" : ""}>{saving ? "Saving..." : "Save"}</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="btn btn-secondary btn-sm"
            style={{ padding: isMobile ? "5px 7px" : "4px 10px", fontSize: "12px" }}
            title="Publish Immutable Version"
          >
            <UploadCloud size={14} />
            <span className={isMobile ? "desktop-only" : ""}>{publishing ? "Publishing..." : "Publish"}</span>
          </button>
          <button
            onClick={() => setIsRunModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ padding: isMobile ? "5px 9px" : "4px 12px", fontSize: "12px" }}
            title="Trigger Run"
          >
            <Play size={14} />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Main Builder Workspace */}
      <div style={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}>
        {/* Left Node Palette: In-flow on desktop */}
        {isDesktop && <NodePalette onAddNode={handleAddNode} />}

        {/* Central React Flow Canvas with Drag & Drop and Keyboard Deletion */}
        <div
          onDragOver={onDragOver}
          onDrop={onDrop}
          style={{ flex: 1, height: "100%", background: "#0b0b0b", position: "relative" }}
        >
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            deleteKeyCode={["Backspace", "Delete"]}
            nodeTypes={nodeTypes}
            colorMode="dark"
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#383838" bgColor="#0b0b0b" />
            <Controls
              style={{
                bottom: isMobile ? 12 : 20,
                left: isMobile ? 12 : 20,
              }}
            />
            {/* Show MiniMap only on screens >= 768px to prevent blocking touch canvas on mobile */}
            {!isMobile && (
              <MiniMap
                nodeColor="#8b5cf6"
                maskColor="rgba(11, 11, 11, 0.7)"
                style={{
                  borderRadius: "6px",
                  border: "1px solid #262626",
                  backgroundColor: "#111111",
                }}
              />
            )}
          </ReactFlow>
        </div>

        {/* Right Node Inspector: In-flow on desktop */}
        {isDesktop && selectedNode && (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        )}
      </div>

      {/* Mobile/Tablet Off-Canvas Node Palette Drawer */}
      {!isDesktop && isPaletteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
          <div
            onClick={() => setIsPaletteOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              animation: "fadeInOverlay 0.2s ease",
            }}
          />
          <div style={{ position: "relative", zIndex: 101, height: "100%", animation: "slideInLeft 0.25s ease" }}>
            <NodePalette onAddNode={handleAddNode} onClose={() => setIsPaletteOpen(false)} isOverlay />
          </div>
        </div>
      )}

      {/* Mobile/Tablet Off-Canvas Node Inspector Drawer */}
      {!isDesktop && selectedNode && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div
            onClick={() => setSelectedNodeId(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              animation: "fadeInOverlay 0.2s ease",
            }}
          />
          <div style={{ position: "relative", zIndex: 101, height: "100%", animation: "slideInRight 0.25s ease" }}>
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              isOverlay
            />
          </div>
        </div>
      )}

      {/* Bottom Validation Feedback Drawer */}
      {isValidationOpen && validationResult && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: isDesktop ? "210px" : 0,
            right: isDesktop && selectedNode ? "290px" : 0,
            background: "#141414",
            borderTop: "1px solid #262626",
            boxShadow: "0 -4px 15px rgba(0, 0, 0, 0.5)",
            padding: "14px 18px",
            maxHeight: "180px",
            overflowY: "auto",
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {validationResult.is_valid ? (
                <CheckCircle size={15} color="#10b981" />
              ) : (
                <AlertTriangle size={15} color="#ef4444" />
              )}
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5" }}>
                {validationResult.is_valid
                  ? "Graph Validation Passed (Ready to Publish)"
                  : `Graph Validation Failed (${validationResult.errors.length} errors)`}
              </span>
            </div>
            <button
              onClick={() => setIsValidationOpen(false)}
              aria-label="Close validation output"
              style={{ background: "transparent", border: "none", color: "#737373", cursor: "pointer", padding: "4px" }}
            >
              <X size={14} />
            </button>
          </div>

          {validationResult.errors.map((err, i) => (
            <div key={i} style={{ fontSize: "12px", color: "var(--status-danger)", marginBottom: "4px" }}>
              • [{err.code}] {err.message}
            </div>
          ))}

          {validationResult.warnings.map((warn, i) => (
            <div key={i} style={{ fontSize: "12px", color: "var(--status-warning)", marginBottom: "4px" }}>
              • [WARNING] {warn}
            </div>
          ))}
        </div>
      )}

      {/* Run Modal */}
      {isRunModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            className="card"
            style={{ width: "480px", maxWidth: "100%", padding: "20px clamp(16px, 4vw, 24px)", background: "var(--surface-card)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Trigger Workflow Run</h3>
              <button
                onClick={() => setIsRunModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px" }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Provide the JSON input payload to pass to the trigger node.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Input Payload (JSON)
              </label>
              <textarea
                value={runInputJson}
                onChange={(e) => setRunInputJson(e.target.value)}
                rows={6}
                className="input"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  width: "100%",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setIsRunModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleTriggerRun}
                disabled={running}
                className="btn btn-primary btn-sm"
                style={{ background: "#10b981", borderColor: "#10b981", color: "#fff" }}
              >
                <Play size={14} />
                <span>{running ? "Starting Run..." : "Execute Run"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function Builder() {
  return (
    <ReactFlowProvider>
      <BuilderCanvas />
    </ReactFlowProvider>
  );
}
