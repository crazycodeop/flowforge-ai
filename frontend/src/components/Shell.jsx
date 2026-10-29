import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  PlayCircle,
  ShieldCheck,
  Gauge,
  Sparkles,
  Settings as SettingsIcon,
  Search,
  Plus,
  ChevronsUpDown,
  X,
  Menu,
  HelpCircle,
  Cpu,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";
import { api } from "../api/client";

/**
 * FlowForge AI application shell featuring Render's flat visual styling:
 * - 50px compact top navigation bar with thin 1px dividers
 * - 240px dark charcoal sidebar with crisp 32px navigation rows
 * - Deep purple (#7E22CE) active item indicator
 * - Functional workspace switcher and search palette
 * - Pure FlowForge AI workflow orchestration content and terminology
 * @param {{ children: React.ReactNode }} props
 */
export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar collapse state
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("ff_sidebar_collapsed") === "true"
  );

  // Responsive breakpoint states
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Workspace selector state
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [activeOrg, setActiveOrg] = useState({
    id: localStorage.getItem("org_id") || "default",
    name: localStorage.getItem("org_name") || "Production Workspace",
    role: localStorage.getItem("org_role") || "owner",
  });
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPromoBox, setShowPromoBox] = useState(true);

  // User profile
  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadOrganizations();
    loadProfile();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOrgDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickSearch((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowQuickSearch(false);
        setOrgDropdownOpen(false);
        setShowCreateOrgModal(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setUserProfile(data);
    } catch {
      // Fallback
    }
  };

  const loadOrganizations = async () => {
    try {
      const orgs = await api.listOrganizations();
      if (orgs && orgs.length > 0) {
        setOrganizations(orgs);
        const savedId = localStorage.getItem("org_id");
        const match = orgs.find((o) => o.id === savedId) || orgs[0];
        setActiveOrg({
          id: match.id,
          name: match.name,
          role: match.role || "owner",
        });
        localStorage.setItem("org_id", match.id);
        localStorage.setItem("org_name", match.name);
        localStorage.setItem("org_role", match.role || "owner");
      }
    } catch {
      // Fallback
    }
  };

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("ff_sidebar_collapsed", String(next));
  };

  const handleSelectOrg = (org) => {
    setActiveOrg({
      id: org.id,
      name: org.name,
      role: org.role || "member",
    });
    localStorage.setItem("org_id", org.id);
    localStorage.setItem("org_name", org.name);
    localStorage.setItem("org_role", org.role || "member");
    setOrgDropdownOpen(false);
    window.location.reload();
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const created = await api.createOrganization({ name: newOrgName.trim() });
      setNewOrgName("");
      setShowCreateOrgModal(false);
      await loadOrganizations();
      handleSelectOrg(created);
    } catch (err) {
      alert("Failed to create workspace: " + (err.message || "Error"));
    } finally {
      setCreatingOrg(false);
    }
  };

  // Pure FlowForge AI Navigation Items
  const workspaceNavItems = [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Workflows", path: "/workflows", icon: Workflow },
    { label: "Executions", path: "/executions", icon: PlayCircle },
    { label: "Approvals", path: "/approvals", icon: ShieldCheck },
  ];

  const aiNavItems = [
    { label: "Evaluations", path: "/evaluations", icon: Gauge },
    { label: "Use Cases", path: "/use-cases", icon: Sparkles },
  ];

  const orgNavItems = [
    { label: "Settings", path: "/settings", icon: SettingsIcon },
    { label: "System Status", path: "/system", icon: Cpu },
  ];

  const userInitials = userProfile.full_name
    ? userProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "FF";

  const getBreadcrumbTitle = () => {
    const p = location.pathname;
    if (p === "/") return "Overview";
    if (p.startsWith("/workflows/")) return "Workflow Canvas";
    if (p === "/workflows") return "Workflows";
    if (p === "/executions") return "Executions";
    if (p === "/approvals") return "Approvals";
    if (p === "/evaluations") return "Evaluations";
    if (p === "/use-cases") return "Use Cases";
    if (p === "/settings") return "Settings";
    if (p === "/system") return "System Status";
    return "Dashboard";
  };

  const isBuilder = location.pathname.startsWith("/workflows/") && location.pathname !== "/workflows";

  // Navigation Links Renderer (Pure FlowForge Sections)
  const renderNavLinks = (isDrawer = false) => {
    const isNarrow = collapsed && !isDrawer;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
        {/* Category 1: WORKSPACE (Hidden when collapsed) */}
        {!isNarrow && (
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              color: "#666666",
              fontWeight: 500,
              letterSpacing: "0.05em",
              padding: "6px 10px 4px 10px",
            }}
          >
            Workspace
          </div>
        )}
        {workspaceNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isNarrow ? item.label : undefined}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`}
              style={isNarrow ? { justifyContent: "center", padding: "0", width: "36px", margin: "0 auto" } : {}}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!isNarrow && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Category 2: AI & PIPELINES (Hidden when collapsed) */}
        {!isNarrow && (
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              color: "#666666",
              fontWeight: 500,
              letterSpacing: "0.05em",
              padding: "16px 10px 4px 10px",
            }}
          >
            AI & Operations
          </div>
        )}
        {aiNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isNarrow ? item.label : undefined}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`}
              style={isNarrow ? { justifyContent: "center", padding: "0", width: "36px", margin: "0 auto" } : {}}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!isNarrow && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Category 3: ORGANIZATION (Hidden when collapsed) */}
        {!isNarrow && (
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              color: "#666666",
              fontWeight: 500,
              letterSpacing: "0.05em",
              padding: "16px 10px 4px 10px",
            }}
          >
            Organization
          </div>
        )}
        {orgNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isNarrow ? item.label : undefined}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? "active" : ""}`}
              style={isNarrow ? { justifyContent: "center", padding: "0", width: "36px", margin: "0 auto" } : {}}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              {!isNarrow && <span>{item.label}</span>}
            </NavLink>
          );
        })}

        {/* Informational Box in expanded desktop mode */}
        {!isNarrow && showPromoBox && (
          <div
            style={{
              marginTop: "auto",
              marginBottom: "10px",
              padding: "12px",
              background: "#121212",
              border: "1px solid #222222",
              borderRadius: "5px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5" }}>
                AI Orchestration
              </span>
              <button
                type="button"
                onClick={() => setShowPromoBox(false)}
                style={{ background: "transparent", border: "none", color: "#666666", cursor: "pointer", padding: "2px" }}
                aria-label="Dismiss info"
              >
                <X size={12} />
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#858585", lineHeight: 1.4, margin: "0 0 8px 0" }}>
              Design multi-step pipelines with code execution, semantic grounding, and review gates.
            </p>
            <Link
              to="/use-cases"
              style={{
                fontSize: "11px",
                color: "#c084fc",
                textDecoration: "none",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>View blueprints</span>
              <span>&rarr;</span>
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--main-bg)" }}>
      {/* ============================================================== */}
      {/* 1. TOP BAR (Height 50px, Full-Width across the top)           */}
      {/* ============================================================== */}
      <header
        style={{
          height: "50px",
          background: "#0b0b0b",
          borderBottom: "1px solid #1f1f1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(10px, 2vw, 18px)",
          flexShrink: 0,
          zIndex: 60,
        }}
      >
        {/* Left: Brand Logo + Workspace Dropdown + Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="mobile-only"
            aria-label="Open navigation menu"
            style={{
              background: "transparent",
              border: "none",
              color: "#a3a3a3",
              padding: "6px",
              cursor: "pointer",
              display: isMobile ? "flex" : "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu size={18} />
          </button>

          {/* FlowForge Logo Mark */}
          <div
            onClick={() => navigate("/")}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              background: "#161616",
              border: "1px solid #2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="FlowForge AI"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Workspace Switcher Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: "transparent",
                border: "none",
                color: "#f5f5f5",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                padding: "3px 6px",
                borderRadius: "4px",
                maxWidth: isMobile ? "130px" : "190px",
              }}
              title={activeOrg.name}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#047857",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {activeOrg.name.charAt(0).toUpperCase()}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {activeOrg.name}
              </span>
              <ChevronsUpDown size={13} color="#737373" style={{ flexShrink: 0 }} />
            </button>

            {/* Workspace Dropdown Menu */}
            {orgDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  width: "240px",
                  background: "#161616",
                  border: "1px solid #2a2a2a",
                  borderRadius: "6px",
                  padding: "6px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.7)",
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#737373", textTransform: "uppercase", padding: "6px 8px 4px 8px" }}>
                  Workspaces
                </div>
                {organizations.map((org) => {
                  const isCurrent = org.id === activeOrg.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelectOrg(org)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        background: isCurrent ? "#222222" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: "#f5f5f5",
                        fontSize: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isCurrent ? "#a855f7" : "#555" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {org.name}
                        </span>
                      </div>
                      {isCurrent && <Check size={13} color="#a855f7" />}
                    </button>
                  );
                })}

                <div style={{ borderTop: "1px solid #262626", margin: "6px 0" }} />

                <button
                  type="button"
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    setShowCreateOrgModal(true);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: "#a855f7",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Thin Vertical Divider */}
          <div
            className="desktop-only"
            style={{ width: "1px", height: "16px", background: "#222222", margin: "0 2px" }}
          />

          {/* FlowForge Breadcrumbs */}
          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#858585" }}>
            <span style={{ color: "#a3a3a3" }}>FlowForge AI</span>
            <span>&gt;</span>
            <span style={{ color: "#f5f5f5", fontWeight: 500 }}>{getBreadcrumbTitle()}</span>
          </div>
        </div>

        {/* Right Utility Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Search Trigger */}
          <button
            type="button"
            onClick={() => setShowQuickSearch(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "4px 8px",
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: "4px",
              color: "#858585",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <Search size={13} />
            <span className="desktop-only">Search</span>
            <span
              className="desktop-only"
              style={{
                fontSize: "10px",
                padding: "1px 4px",
                background: "#222222",
                borderRadius: "3px",
                color: "#a3a3a3",
              }}
            >
              ⌘ K
            </span>
          </button>

          {/* + New Workflow Button */}
          <button
            type="button"
            onClick={() => navigate("/workflows?action=new")}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600, padding: "4px 10px" }}
          >
            <Plus size={13} />
            <span>New Workflow</span>
          </button>

          {/* Blueprints Link */}
          <Link
            to="/use-cases"
            className="desktop-only"
            style={{
              fontSize: "12px",
              color: "#858585",
              textDecoration: "none",
              padding: "4px 6px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#858585")}
          >
            Blueprints
          </Link>

          {/* System Diagnostics Button */}
          <button
            type="button"
            onClick={() => navigate("/system")}
            aria-label="System Diagnostics"
            style={{
              background: "transparent",
              border: "none",
              color: "#858585",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="System Diagnostics & Readiness"
          >
            <HelpCircle size={15} />
          </button>

          {/* User Avatar Circle */}
          <div
            onClick={() => navigate("/settings")}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#fef08a",
              color: "#713f12",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title={`${userProfile.full_name || "User"} (${userProfile.email || "Account"})`}
          >
            {userInitials.charAt(0)}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. BODY AREA: SIDEBAR + MAIN CONTENT                           */}
      {/* ============================================================== */}
      <div style={{ display: "flex", flex: 1, height: "calc(100vh - 50px)", overflow: "hidden", position: "relative" }}>
        {/* Desktop Sidebar */}
        <aside
          className="desktop-only"
          style={{
            width: collapsed ? "54px" : "240px",
            background: "#0b0b0b",
            borderRight: "1px solid #1f1f1f",
            display: isMobile ? "none" : "flex",
            flexDirection: "column",
            flexShrink: 0,
            userSelect: "none",
            transition: "width 0.15s ease",
            padding: collapsed ? "12px 6px" : "14px 10px 10px 10px",
            overflowY: "auto",
            overflowX: "hidden",
            zIndex: 40,
          }}
        >
          {renderNavLinks(false)}

          {/* Footer Controls: NO "Collapse" TEXT! */}
          <div
            style={{
              borderTop: "1px solid #1f1f1f",
              paddingTop: "8px",
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {/* Status Indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: collapsed ? "6px 0" : "6px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                fontSize: "12px",
                color: "#737373",
              }}
              title="All workflow engine services operational"
            >
              <span className="status-dot status-dot-active" />
              {!collapsed && <span>Engine Operational</span>}
            </div>

            {/* Clean Sidebar Toggle Button: Clean icon button without any "Collapse" text */}
            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                width: collapsed ? "36px" : "100%",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                padding: collapsed ? "0" : "0 10px",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "#737373",
                cursor: "pointer",
                margin: collapsed ? "0 auto" : "0",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.backgroundColor = "#161616";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#737373";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
              </span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer (<768px) */}
        {isMobile && mobileMenuOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 120 }}>
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.75)",
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
                width: "min(280px, 85vw)",
                background: "#0b0b0b",
                borderRight: "1px solid #1f1f1f",
                display: "flex",
                flexDirection: "column",
                padding: "16px 12px",
                animation: "slideInLeft 0.25s ease",
                zIndex: 130,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#f5f5f5" }}>FlowForge AI</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#858585", cursor: "pointer", padding: "4px" }}
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {renderNavLinks(true)}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. MAIN WORKSPACE CONTENT CONTAINER                            */}
        {/* ============================================================== */}
        <main
          style={{
            flex: 1,
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            padding: isBuilder ? "0px" : "clamp(18px, 2.5vw, 32px) clamp(16px, 3.5vw, 42px)",
            background: "#0b0b0b",
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>

      {/* ============================================================== */}
      {/* 4. MODALS: QUICK SEARCH (⌘ K) & CREATE WORKSPACE              */}
      {/* ============================================================== */}
      {showQuickSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "min(120px, 15vh)",
            zIndex: 150,
          }}
          onClick={() => setShowQuickSearch(false)}
        >
          <div
            style={{
              width: "min(520px, 94vw)",
              background: "#161616",
              border: "1px solid #2a2a2a",
              borderRadius: "6px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #222222" }}>
              <Search size={14} color="#737373" style={{ marginRight: "10px" }} />
              <input
                type="text"
                placeholder="Search workflows, runs, settings... (ESC to close)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#f5f5f5",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ padding: "8px", maxHeight: "280px", overflowY: "auto" }}>
              {[
                { title: "Overview Dashboard", path: "/", icon: LayoutDashboard },
                { title: "Workflows Catalog", path: "/workflows", icon: Workflow },
                { title: "Execution Traces & Latency", path: "/executions", icon: PlayCircle },
                { title: "Human Review Inbox", path: "/approvals", icon: ShieldCheck },
                { title: "Enterprise Use Cases", path: "/use-cases", icon: Sparkles },
                { title: "AI Benchmark Evaluations", path: "/evaluations", icon: Gauge },
                { title: "System Status & Diagnostics", path: "/system", icon: Cpu },
                { title: "Workspace Settings", path: "/settings", icon: SettingsIcon },
              ]
                .filter((i) => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        setShowQuickSearch(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        background: "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: "#a3a3a3",
                        fontSize: "13px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.backgroundColor = "#222222";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#a3a3a3";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Icon size={14} color="#a855f7" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateOrgModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 150,
            padding: "16px",
          }}
          onClick={() => setShowCreateOrgModal(false)}
        >
          <div
            style={{
              width: "min(440px, 94vw)",
              background: "#161616",
              border: "1px solid #2a2a2a",
              borderRadius: "6px",
              padding: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0", color: "#f5f5f5" }}>
              Create New Workspace
            </h3>
            <form onSubmit={handleCreateOrg}>
              <input
                type="text"
                placeholder="Workspace name (e.g. Staging, Acme Prod)"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="input"
                style={{ marginBottom: "14px" }}
                required
                autoFocus
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowCreateOrgModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creatingOrg} className="btn btn-primary btn-sm">
                  {creatingOrg ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
