import React from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Bot,
  UserCheck,
  CheckCircle2,
  LogOut,
} from "lucide-react";

export default function PortalShell() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("org_id");
    navigate("/portal/login");
  };

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(" ").filter(Boolean);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "CU";
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: "56px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #0d9488, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            FF
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>FlowForge</span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "#f0fdfa",
                  color: "#0d9488",
                  border: "1px solid #99f6e4",
                  textTransform: "uppercase",
                }}
              >
                Client Portal
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Self-Service AI Workflows & Approvals</div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `btn btn-ghost ${isActive ? "btn-active-portal" : ""}`
            }
            style={({ isActive }) => ({
              height: "36px",
              fontSize: "13px",
              fontWeight: 500,
              padding: "0 12px",
              borderRadius: "6px",
              color: isActive ? "#0d9488" : "#475569",
              background: isActive ? "#f0fdfa" : "transparent",
              border: isActive ? "1px solid #99f6e4" : "1px solid transparent",
            })}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/portal/new"
            className={({ isActive }) =>
              `btn btn-ghost ${isActive ? "btn-active-portal" : ""}`
            }
            style={({ isActive }) => ({
              height: "36px",
              fontSize: "13px",
              fontWeight: 500,
              padding: "0 12px",
              borderRadius: "6px",
              color: isActive ? "#0d9488" : "#475569",
              background: isActive ? "#f0fdfa" : "transparent",
              border: isActive ? "1px solid #99f6e4" : "1px solid transparent",
            })}
          >
            <PlusCircle size={15} />
            <span>New Request</span>
          </NavLink>

          <NavLink
            to="/portal/requests"
            className={({ isActive }) =>
              `btn btn-ghost ${isActive ? "btn-active-portal" : ""}`
            }
            style={({ isActive }) => ({
              height: "36px",
              fontSize: "13px",
              fontWeight: 500,
              padding: "0 12px",
              borderRadius: "6px",
              color: isActive ? "#0d9488" : "#475569",
              background: isActive ? "#f0fdfa" : "transparent",
              border: isActive ? "1px solid #99f6e4" : "1px solid transparent",
            })}
          >
            <Clock size={15} />
            <span>My Requests</span>
          </NavLink>

          <NavLink
            to="/portal/approvals"
            className={({ isActive }) =>
              `btn btn-ghost ${isActive ? "btn-active-portal" : ""}`
            }
            style={({ isActive }) => ({
              height: "36px",
              fontSize: "13px",
              fontWeight: 500,
              padding: "0 12px",
              borderRadius: "6px",
              color: isActive ? "#0d9488" : "#475569",
              background: isActive ? "#f0fdfa" : "transparent",
              border: isActive ? "1px solid #99f6e4" : "1px solid transparent",
            })}
          >
            <ShieldCheck size={15} />
            <span>Pending Approvals</span>
          </NavLink>
        </nav>

        {/* Right Action: Switch to FlowForge Studio & User Persona */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Allow admins/developers to switch to Studio */}
          {(user?.role === "admin" || user?.role === "developer") && (
            <Link
              to="/"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: "12px",
                gap: "6px",
                borderColor: "#cbd5e1",
                color: "#334155",
              }}
              title="Switch to FlowForge Studio (Developer Workflow Builder)"
            >
              <ExternalLink size={13} color="#0d9488" />
              <span>FlowForge Studio</span>
            </Link>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: "8px",
              borderLeft: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: user?.role === "manager" ? "#f0fdfa" : "#f1f5f9",
                border: `1px solid ${user?.role === "manager" ? "#99f6e4" : "#cbd5e1"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: user?.role === "manager" ? "#0f766e" : "#334155",
              }}
            >
              {getInitials(user?.full_name, user?.email)}
            </div>
            <div style={{ fontSize: "12px" }}>
              <div style={{ fontWeight: 600, color: "#0f172a", lineHeight: 1.2 }}>
                {user?.full_name ? user.full_name.split("(")[0].trim() : (user?.email || "Client User")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "0 4px",
                    borderRadius: "4px",
                    background: user?.role === "manager" ? "#dcfce7" : "#e2e8f0",
                    color: user?.role === "manager" ? "#166534" : "#475569",
                  }}
                >
                  {user?.role || "client"}
                </span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{user?.organization_name || "Acme Corporation"}</span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="btn btn-ghost btn-sm"
              style={{
                height: "28px",
                width: "28px",
                padding: 0,
                color: "#94a3b8",
                marginLeft: "4px",
              }}
              title="Sign Out of Portal"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Portal Viewport */}
      <main style={{ flex: 1, padding: "28px 32px", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "16px 32px",
          fontSize: "12px",
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>FlowForge AI Enterprise Platform • Business Client Portal</div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>PostgreSQL Source of Truth</span>
          <span>•</span>
          <span>Celery Reliable Execution</span>
          <span>•</span>
          <Link to="/overview" style={{ color: "#0d9488", textDecoration: "none" }}>
            Developer Studio →
          </Link>
        </div>
      </footer>
    </div>
  );
}
