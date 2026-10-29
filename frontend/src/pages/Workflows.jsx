import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Workflow,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Layers,
  X,
  AlertCircle,
} from "lucide-react";
import { api } from "../api/client";

export default function Workflows() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      await api.createWorkflow({
        name: newTitle.trim(),
        description: newDescription.trim() || null,
      });
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
      searchParams.delete("action");
      setSearchParams(searchParams);
      await loadWorkflows();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete workflow "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteWorkflow(id);
      await loadWorkflows();
    } catch (err) {
      alert(`Failed to delete workflow: ${err.message}`);
    }
  };

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wf.description && wf.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (statusFilter === "published") return wf.latest_version !== null;
    if (statusFilter === "draft") return wf.latest_version === null;
    return true;
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em" }}>Workflow Library</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Create and orchestrate versioned workflow graphs.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={15} />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
          <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "11px" }} />
          <input
            type="text"
            placeholder="Search workflows by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ paddingLeft: "34px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {["all", "published", "draft"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`btn btn-sm ${statusFilter === tab ? "btn-secondary" : "btn-ghost"}`}
              style={{
                textTransform: "capitalize",
                fontWeight: statusFilter === tab ? 600 : 400,
                background: statusFilter === tab ? "#ffffff" : "transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Loading workflows...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--status-danger)" }}>
            Failed to load workflows: {error}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <Layers size={24} color="#94a3b8" style={{ marginBottom: "12px" }} />
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>No workflows found</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              {searchQuery ? "Try adjusting your search query or status filter." : "Create your first workflow to get started."}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-light)", background: "var(--surface-subtle)", color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 20px", fontWeight: 600 }}>Workflow</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Version</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Nodes</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Updated</th>
                <th style={{ padding: "12px 20px", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.map((wf) => {
                const nodeCount = wf.draft_definition?.nodes?.length || 0;
                return (
                  <tr
                    key={wf.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <Link
                        to={`/workflows/${wf.id}`}
                        style={{ fontWeight: 600, color: "var(--text-main)", textDecoration: "none" }}
                      >
                        {wf.name}
                      </Link>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {wf.description || "No description"}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {wf.latest_version ? (
                        <span className="badge badge-published">v{wf.latest_version} Published</span>
                      ) : (
                        <span className="badge badge-draft">Draft</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>
                      {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: "12px" }}>
                      {new Date(wf.updated_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <Link to={`/workflows/${wf.id}`} className="btn btn-secondary btn-sm">
                          Edit Graph
                        </Link>
                        <button
                          onClick={() => handleDelete(wf.id, wf.name)}
                          className="btn btn-ghost btn-sm"
                          title="Delete Workflow"
                          style={{ color: "#ef4444" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Workflow Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "460px",
              boxShadow: "var(--shadow-lg)",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Create New Workflow</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--status-danger-bg)",
                  border: "1px solid var(--status-danger-border)",
                  borderRadius: "6px",
                  color: "var(--status-danger)",
                  fontSize: "12px",
                  marginBottom: "14px",
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer Ticket Triage"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Summarize the pipeline purpose and outcomes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="btn btn-primary"
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
