import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Workflow,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Layers,
  X,
  AlertCircle,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";

export default function Workflows() {
  const modal = useModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create workflow modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await api.listWorkflows();
      setWorkflows(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
    if (searchParams.get("action") === "new") {
      setIsCreateOpen(true);
    }
  }, [searchParams]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      setCreateError(null);
      const created = await api.createWorkflow({
        name: newTitle.trim(),
        description: newDescription.trim() || null,
      });
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      searchParams.delete("action");
      setSearchParams(searchParams);
      navigate(`/workflows/${created.id}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    const confirmed = await modal.confirm({
      title: "Delete Workflow",
      message: `Are you sure you want to delete workflow "${name}"? This action cannot be undone.`,
      confirmText: "Delete Workflow",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await api.deleteWorkflow(id);
      await loadWorkflows();
    } catch (err) {
      await modal.alert({
        title: "Delete Failed",
        message: `Error deleting workflow: ${err.message}`,
        variant: "danger",
      });
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (statusFilter === "published" && w.latest_version === null) return false;
    if (statusFilter === "draft" && w.latest_version !== null) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${Math.max(1, mins)}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            Workflows
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Catalog of DAG pipelines, published immutable versions, and draft configurations.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn btn-primary"
          style={{ padding: "6px 14px", fontWeight: 600 }}
        >
          <Plus size={14} />
          <span>New workflow</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {/* Segmented Filter Pills */}
        <div className="filter-pills-container">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
          >
            All ({workflows.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("published")}
            className={`filter-pill ${statusFilter === "published" ? "active" : ""}`}
          >
            Published ({workflows.filter((w) => w.latest_version !== null).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("draft")}
            className={`filter-pill ${statusFilter === "draft" ? "active" : ""}`}
          >
            Draft ({workflows.filter((w) => w.latest_version === null).length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", minWidth: "min(260px, 100%)", flex: "1 1 200px" }}>
          <Search
            size={14}
            color="#737373"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: "32px", fontSize: "12px", width: "100%" }}
          />
        </div>
      </div>

      {/* High-Density Workflows Table */}
      <div
        className="table-container"
        style={{
          background: "#141414",
          border: "1px solid var(--border-light)",
          borderRadius: "6px",
        }}
      >
        <table className="table" style={{ minWidth: "620px" }}>
          <thead>
            <tr>
              <th style={{ width: "38%" }}>Workflow Name</th>
              <th style={{ width: "16%" }}>Status</th>
              <th style={{ width: "14%" }}>Nodes</th>
              <th style={{ width: "18%" }}>Updated</th>
              <th style={{ width: "14%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  Loading workflows...
                </td>
              </tr>
            ) : filteredWorkflows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
                    {searchQuery ? `No workflows match "${searchQuery}"` : "No workflows found."}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Plus size={13} />
                    <span>Create workflow</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredWorkflows.map((wf) => {
                const isPublished = wf.latest_version !== null;
                const nodeCount = wf.draft_definition?.nodes?.length || 0;
                return (
                  <tr
                    key={wf.id}
                    onClick={() => navigate(`/workflows/${wf.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "4px",
                            background: "#1c1c1c",
                            border: "1px solid #262626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#8b5cf6",
                            flexShrink: 0,
                          }}
                        >
                          <Globe size={12} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#f5f5f5" }}>
                            {wf.name}
                          </span>
                          {wf.description && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "340px",
                                marginTop: "1px",
                              }}
                            >
                              {wf.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      {isPublished ? (
                        <span className="badge badge-published" style={{ padding: "2px 8px", fontSize: "11px" }}>
                          ✓ Deployed (v{wf.latest_version})
                        </span>
                      ) : (
                        <span className="badge badge-draft" style={{ padding: "2px 8px", fontSize: "11px" }}>
                          Draft
                        </span>
                      )}
                    </td>

                    <td style={{ color: "var(--text-secondary)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
                      {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
                    </td>

                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {formatTimeAgo(wf.updated_at)}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/workflows/${wf.id}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "3px 8px", fontSize: "11px" }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(wf.id, wf.name, e)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "3px 6px", color: "#ef4444" }}
                          title="Delete workflow"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Workflow Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#161616",
              border: "1px solid #333333",
              borderRadius: "8px",
              padding: "clamp(16px, 4vw, 24px)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#f5f5f5" }}>
                Create New Workflow
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: "transparent", border: "none", color: "#737373", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "6px",
                  color: "#f87171",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                <AlertCircle size={15} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#a3a3a3", marginBottom: "6px" }}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoice OCR & Validation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#a3a3a3", marginBottom: "6px" }}>
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Summarize the pipeline goals and integrations..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !newTitle.trim()}
                >
                  {isSubmitting ? "Creating..." : "Create Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
