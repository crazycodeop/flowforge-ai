import React, { useState, useEffect } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
} from "lucide-react";

export default function PortalShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  const navLinks = [
    { to: "/portal", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/portal/new", label: "New Request", icon: PlusCircle },
    { to: "/portal/requests", label: "My Requests", icon: Clock },
    { to: "/portal/approvals", label: "Pending Approvals", icon: ShieldCheck },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: isMobile ? "52px" : "56px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 14px" : "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
        }}
      >
        {/* Left: Hamburger (mobile) + Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "12px", minWidth: 0 }}>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              style={{
                background: "transparent",
                border: "none",
                color: "#334155",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Menu size={20} />
            </button>
          )}

          <div
            onClick={() => navigate("/portal")}
            style={{
              width: isMobile ? "28px" : "32px",
              height: isMobile ? "28px" : "32px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #0d9488, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: isMobile ? "12px" : "14px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            FF
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                onClick={() => navigate("/portal")}
                style={{
                  fontWeight: 700,
                  fontSize: isMobile ? "13px" : "14px",
                  color: "#0f172a",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                FlowForge
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  padding: "1px 5px",
                  borderRadius: "10px",
                  background: "#f0fdfa",
                  color: "#0d9488",
                  border: "1px solid #99f6e4",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Portal
              </span>
            </div>
            {!isMobile && (
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Self-Service AI Workflows & Approvals
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation Links (Desktop Only >=768px) */}
        {!isMobile && (
          <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  })}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}

        {/* Right Action: Studio Switch & User Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "10px" }}>
          {/* Allow admins/developers to switch to Studio (Desktop only, mobile gets it in drawer) */}
          {!isMobile && (user?.role === "admin" || user?.role === "developer") && (
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
              <span>Studio</span>
            </Link>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingLeft: isMobile ? "0" : "8px",
              borderLeft: isMobile ? "none" : "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                width: isMobile ? "28px" : "30px",
                height: isMobile ? "28px" : "30px",
                borderRadius: "50%",
                background: user?.role === "manager" ? "#f0fdfa" : "#f1f5f9",
                border: `1px solid ${user?.role === "manager" ? "#99f6e4" : "#cbd5e1"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                color: user?.role === "manager" ? "#0f766e" : "#334155",
                flexShrink: 0,
              }}
              title={user?.full_name || user?.email}
            >
              {getInitials(user?.full_name, user?.email)}
            </div>

            {!isMobile && (
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
                  <span style={{ fontSize: "10px", color: "#64748b" }}>
                    {user?.organization_name || "Acme Corporation"}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Sign Out Header Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="btn btn-ghost btn-sm"
              style={{
                height: "28px",
                width: "28px",
                padding: 0,
                color: "#94a3b8",
                marginLeft: "2px",
              }}
              title="Sign Out of Portal"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer (<768px) */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120 }}>
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(2px)",
              animation: "fadeInOverlay 0.2s ease",
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: "min(300px, 85vw)",
              background: "#ffffff",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              padding: "18px 16px",
              animation: "slideInLeft 0.25s ease",
              zIndex: 130,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "14px",
                borderBottom: "1px solid #f1f5f9",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #0d9488, #059669)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  FF
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                    FlowForge
                  </div>
                  <div style={{ fontSize: "10px", color: "#0d9488", fontWeight: 600, textTransform: "uppercase" }}>
                    Client Portal
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* User Persona Profile in Drawer */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: user?.role === "manager" ? "#f0fdfa" : "#ffffff",
                  border: `1px solid ${user?.role === "manager" ? "#99f6e4" : "#cbd5e1"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: user?.role === "manager" ? "#0f766e" : "#334155",
                  flexShrink: 0,
                }}
              >
                {getInitials(user?.full_name, user?.email)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.full_name ? user.full_name.split("(")[0].trim() : (user?.email || "Client User")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: user?.role === "manager" ? "#dcfce7" : "#e2e8f0",
                      color: user?.role === "manager" ? "#166534" : "#475569",
                    }}
                  >
                    {user?.role || "client"}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user?.organization_name || "Acme Corporation"}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#94a3b8",
                  padding: "4px 8px",
                }}
              >
                Navigation
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#0d9488" : "#334155",
                      background: isActive ? "#f0fdfa" : "transparent",
                      border: isActive ? "1px solid #99f6e4" : "1px solid transparent",
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Icon size={16} color={isActive ? "#0d9488" : "#64748b"} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight size={14} color="#0d9488" />}
                  </Link>
                );
              })}
            </div>

            {/* Switcher & Sign Out at Bottom of Drawer */}
            <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "6px" }}>
              {(user?.role === "admin" || user?.role === "developer") && (
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#0f766e",
                    background: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} color="#0d9488" />
                  <span>Switch to FlowForge Studio</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#dc2626",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Portal Viewport */}
      <main
        style={{
          flex: 1,
          padding: isMobile ? "16px 14px 28px 14px" : "28px 32px",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: isMobile ? "14px 16px" : "16px 32px",
          fontSize: "12px",
          color: "#64748b",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "8px" : "16px",
        }}
      >
        <div>FlowForge AI Enterprise Platform • Business Client Portal</div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11px" }}>
          <span>PostgreSQL Source of Truth</span>
          <span>•</span>
          <span>Celery Reliable Execution</span>
          <span>•</span>
          <Link to="/" style={{ color: "#0d9488", textDecoration: "none", fontWeight: 600 }}>
            Developer Studio →
          </Link>
        </div>
      </footer>
    </div>
  );
}
