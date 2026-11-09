import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  PlusCircle,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api } from "../api/client";

export default function PortalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const list = await api.listPortalRequests(50, 0);
      setRequests(list);
    } catch (err) {
      console.error("Failed to load portal requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = requests.filter((r) => {
    const matchesSearch =
      r.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.summary_preview && r.summary_preview.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return r.status === "SUCCEEDED";
    if (statusFilter === "pending_approval") return r.status === "PAUSED";
    if (statusFilter === "processing") return r.status === "RUNNING" || r.status === "PENDING";
    if (statusFilter === "failed") return r.status === "FAILED";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>My Inquiries & Requests</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Track real-time progress, review AI triage stages, and inspect verified resolution receipts.
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", width: isMobile ? "100%" : "auto" }}>
          <button
            type="button"
            onClick={loadRequests}
            className="btn btn-secondary btn-sm"
            style={{ gap: "6px" }}
            title="Refresh requests list"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link to="/portal/new" className="btn btn-primary btn-sm" style={{ gap: "6px" }}>
            <PlusCircle size={14} />
            <span>New Request</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div className="filter-pills-container">
          <button
            type="button"
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All Requests ({requests.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "processing" ? "active" : ""}`}
            onClick={() => setStatusFilter("processing")}
          >
            Processing ({requests.filter((r) => r.status === "RUNNING" || r.status === "PENDING").length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "pending_approval" ? "active" : ""}`}
            onClick={() => setStatusFilter("pending_approval")}
          >
            Awaiting Approval ({requests.filter((r) => r.status === "PAUSED").length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed ({requests.filter((r) => r.status === "SUCCEEDED").length})
          </button>
        </div>

        <div style={{ position: "relative", width: isMobile ? "100%" : "260px" }}>
          <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "10px" }} />
          <input
            type="text"
            placeholder="Search by ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ paddingLeft: "30px", fontSize: "12px" }}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>Service / Workflow</th>
              <th>Summary & Context</th>
              <th>Current Status</th>
              <th>Submitted</th>
              <th>Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--text-muted)" }}>
                  {loading ? "Loading requests..." : "No matching requests found."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isSucceeded = r.status === "SUCCEEDED";
                const isPaused = r.status === "PAUSED";
                const isFailed = r.status === "FAILED";

                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-primary)", fontWeight: 600 }}>
                      {r.id.slice(0, 8)}...
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{r.workflow_name}</td>
                    <td style={{ color: "var(--text-muted)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.summary_preview || "Executing automated pipeline..."}
                    </td>
                    <td>
                      {isSucceeded && <span className="badge badge-success">✓ Completed</span>}
                      {isPaused && <span className="badge badge-warning">⏸ Awaiting Approval</span>}
                      {isFailed && <span className="badge badge-danger">✕ Rejected</span>}
                      {!isSucceeded && !isPaused && !isFailed && (
                        <span className="badge badge-primary">⟳ In Flight</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {new Date(r.submitted_at).toLocaleDateString()} {new Date(r.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      {r.completed_at
                        ? new Date(r.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td>
                      <Link
                        to={`/portal/requests/${r.id}`}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: "11px", gap: "4px" }}
                      >
                        <span>View Details</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
