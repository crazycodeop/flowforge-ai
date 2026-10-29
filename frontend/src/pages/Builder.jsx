import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  BackgroundVariant,
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
} from "lucide-react";
import { api } from "../api/client";
import CustomNode from "../components/builder/CustomNode";
import NodePalette from "../components/builder/NodePalette";
import NodeInspector from "../components/builder/NodeInspector";

const nodeTypes = {
  custom: CustomNode,
};

export default function Builder() {
  const { id } = useParams();
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

  // Run execution modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runInputJson, setRunInputJson] = useState(
    '{\n  "ticket_text": "I was charged $89 twice on my card. Please refund my statement."\n}'
  );
  const [running, setRunning] = useState(false);
  const [recentRunId, setRecentRunId] = useState(null);

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
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
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
  };

  // Node Inspector updates
  const handleUpdateNode = (nodeId, updatedData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: updatedData } : n))
    );
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

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
      // Auto-save draft first to ensure DB matches canvas
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
      const run = await api.triggerRun(id, { input_payload: payload });
      setRecentRunId(run.id);
      setIsRunModalOpen(false);
      setStatusMessage({
        type: "success",
        text: `Run started: ${run.id.slice(0, 8)}... (Status: ${run.status})`,
      });
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", margin: "-28px", overflow: "hidden" }}>
      {/* Builder Subheader */}
      <div
        style={{
          height: "48px",
          background: "var(--surface-card)",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to="/workflows" className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
            <ChevronLeft size={16} />
          </Link>
          <div style={{ fontWeight: 600, fontSize: "14px" }}>{workflow?.name}</div>
          {workflow?.latest_version ? (
            <span className="badge badge-published">v{workflow.latest_version}</span>
          ) : (
            <span className="badge badge-draft">Draft</span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {statusMessage && (
            <span
              style={{
                fontSize: "12px",
                color: statusMessage.type === "success" ? "var(--status-success)" : "var(--status-danger)",
                marginRight: "8px",
              }}
            >
              {statusMessage.text}
            </span>
          )}
          <button onClick={handleValidate} className="btn btn-secondary btn-sm">
            <CheckCircle size={14} color="var(--accent-ai)" />
            <span>Validate</span>
          </button>
          <button onClick={handleSaveDraft} disabled={saving} className="btn btn-secondary btn-sm">
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>
          <button onClick={handlePublish} disabled={publishing} className="btn btn-secondary btn-sm">
            <UploadCloud size={14} />
            <span>{publishing ? "Publishing..." : "Publish"}</span>
          </button>
          <button
            onClick={() => setIsRunModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ background: "#10b981", borderColor: "#10b981", color: "#fff" }}
          >
            <Play size={14} />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Main Builder Workspace */}
      <div style={{ flex: 1, display: "flex", position: "relative", minHeight: 0 }}>
        {/* Left Node Palette */}
        <NodePalette onAddNode={handleAddNode} />

        {/* Central React Flow Canvas */}
        <div style={{ flex: 1, height: "100%", background: "#f8fafc" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
            <Controls style={{ boxShadow: "var(--shadow-sm)", borderRadius: "6px" }} />
            <MiniMap
              nodeColor="#e2e8f0"
              maskColor="rgba(241, 245, 249, 0.7)"
              style={{ borderRadius: "6px", border: "1px solid var(--border-light)" }}
            />
          </ReactFlow>
        </div>

        {/* Right Node Inspector */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        )}
      </div>

      {/* Bottom Validation Feedback Drawer */}
      {isValidationOpen && validationResult && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "220px",
            right: selectedNode ? "300px" : 0,
            background: "var(--surface-card)",
            borderTop: "1px solid var(--border-light)",
            boxShadow: "0 -4px 10px rgba(0, 0, 0, 0.05)",
            padding: "14px 20px",
            maxHeight: "180px",
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {validationResult.is_valid ? (
                <CheckCircle size={16} color="var(--status-success)" />
              ) : (
                <AlertTriangle size={16} color="var(--status-danger)" />
              )}
              <span style={{ fontSize: "13px", fontWeight: 600 }}>
                {validationResult.is_valid
                  ? "Graph Validation Passed (Ready to Publish)"
                  : `Graph Validation Failed (${validationResult.errors.length} errors)`}
              </span>
            </div>
            <button onClick={() => setIsValidationOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: "2px" }}>
              <X size={15} />
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
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{ width: "480px", maxWidth: "90vw", padding: "24px", background: "var(--surface-card)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Trigger Workflow Run</h3>
              <button onClick={() => setIsRunModalOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
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
