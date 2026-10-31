import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  ChevronLeft,
  X,
  Play,
  Plus,
  Sliders,
} from "lucide-react";
import { api } from "../api/client";
import CustomNode from "../components/builder/CustomNode";
import NodePalette from "../components/builder/NodePalette";
import NodeInspector from "../components/builder/NodeInspector";

const nodeTypes = {
  custom: CustomNode,
};

function BuilderCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

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
          config: {},
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

  // Adding a node from palette
  const handleAddNode = (type, name) => {
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: "custom",
      position: { x: 280 + Math.random() * 60, y: 120 + Math.random() * 60 },
      data: {
        id: newId,
        type,
        name,
        description: "",
        config: {},
        retry_policy: { max_retries: 3, backoff_base_seconds: 1.0 },
        timeout_seconds: 60,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
    if (!isDesktop) {
      setIsPaletteOpen(false);
    }
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

      const changelog = prompt("Enter an optional changelog for this published version:", "Published update") || null;
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
        alert("Input payload must be valid JSON: " + err.message);
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
