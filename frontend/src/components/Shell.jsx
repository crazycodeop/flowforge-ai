import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  PlayCircle,
  ShieldCheck,
  Gauge,
  Server,
  Settings,
  ChevronDown,
} from "lucide-react";

/**
 * Main application shell featuring a dark navigation surface
 * and a light workspace canvas.
 * @param {{ children: React.ReactNode }} props
 */
export default function Shell({ children }) {
  const location = useLocation();

  const navItems = [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Workflows", path: "/workflows", icon: Workflow },
    { label: "Executions", path: "/executions", icon: PlayCircle },
    { label: "Approvals", path: "/approvals", icon: ShieldCheck },
    { label: "Evaluations", path: "/evaluations", icon: Gauge },
    { label: "System Status", path: "/system", icon: Server },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: "240px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--sidebar-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Geometric FlowForge Mark */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 4px rgba(99, 102, 241, 0.3)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#ffffff", fontWeight: 600, fontSize: "14px", letterSpacing: "-0.01em" }}>
              FlowForge AI
            </div>
            <div style={{ color: "var(--sidebar-text)", fontSize: "11px", letterSpacing: "0.02em" }}>
              Orchestration Platform
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div style={{ padding: "12px 14px 8px 14px" }}>
          <div
            style={{
              padding: "7px 10px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#cbd5e1",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="status-dot status-dot-active" />
              <span style={{ fontWeight: 500 }}>Production Workspace</span>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#475569", fontWeight: 600, padding: "8px 10px 4px" }}>
            Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  background: isActive ? "var(--sidebar-active)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.1s ease",
                }}
              >
                <Icon size={16} color={isActive ? "#818cf8" : "#64748b"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--sidebar-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--sidebar-text)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e2e8f0",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                FF
              </div>
              <span>Engineer</span>
            </div>
            <Settings size={15} color="#64748b" style={{ cursor: "pointer" }} />
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", background: "var(--main-bg)" }}>
        {/* Topbar */}
        <header
          style={{
            height: "52px",
            borderBottom: "1px solid var(--border-light)",
            background: "var(--surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
            <span style={{ color: "var(--text-muted)" }}>Platform</span>
            <span style={{ color: "var(--border-dark)" }}>/</span>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {location.pathname === "/"
                ? "Overview"
                : location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Live System Indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--text-muted)",
                padding: "4px 8px",
                background: "var(--surface-subtle)",
                borderRadius: "9999px",
                border: "1px solid var(--border-light)",
              }}
            >
              <span className="status-dot status-dot-active" />
              <span>Engine Active</span>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px", minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
