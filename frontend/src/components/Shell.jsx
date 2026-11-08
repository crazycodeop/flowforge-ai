import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  Globe,
  PlayCircle,
  ShieldCheck,
  Gauge,
  BookOpen,
  Sparkles,
  Settings as SettingsIcon,
  ExternalLink,
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Sun,
  Moon,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";
import { useTheme } from "../context/ThemeContext";

/**
 * FlowForge AI application shell featuring Render's flat visual styling:
 * - 50px compact top navigation bar with thin 1px dividers
 * - 240px dark charcoal sidebar with crisp 32px navigation rows
 * - Primary teal (#0d9488) active item indicator
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
  const { theme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("org_id");
    localStorage.removeItem("org_name");
    localStorage.removeItem("org_role");
    navigate("/login");
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
      await modal.alert({ title: "Workspace Creation Failed", message: err.message || "Failed to create workspace.", variant: "danger" });
    } finally {
      setCreatingOrg(false);
    }
  };

  // Pure FlowForge AI Navigation Items
  const workspaceNavItems = [
    { label: "Client Portal", path: "/portal", icon: Globe },
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Workflows", path: "/workflows", icon: Workflow },
    { label: "Executions", path: "/executions", icon: PlayCircle },
    { label: "Approvals", path: "/approvals", icon: ShieldCheck },
  ];

  const aiNavItems = [
    { label: "Knowledge Base", path: "/knowledge", icon: BookOpen },
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
    if (p === "/knowledge") return "Knowledge Base";
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
              background: "var(--surface-card)",
              border: "1px solid var(--border-light)",
              borderRadius: "5px",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
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
                color: "#0d9488",
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
          background: "var(--topbar-bg)",
          borderBottom: "1px solid var(--topbar-border)",
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
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="FlowForge AI"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                color: "var(--text-main)",
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
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-light)",
                  borderRadius: "6px",
                  padding: "6px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", padding: "6px 8px 4px 8px" }}>
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
                        background: isCurrent ? "var(--surface-subtle)" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        color: "var(--text-main)",
                        fontSize: "12px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isCurrent ? "#0d9488" : "#94a3b8" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {org.name}
                        </span>
                      </div>
                      {isCurrent && <Check size={13} color="#0d9488" />}
                    </button>
                  );
                })}

                <div style={{ borderTop: "1px solid var(--border-light)", margin: "6px 0" }} />

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
                    color: "#0d9488",
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
            style={{ width: "1px", height: "16px", background: "var(--border-light)", margin: "0 2px" }}
          />

          {/* FlowForge Breadcrumbs */}
          <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#858585" }}>
            <span style={{ color: "#a3a3a3" }}>FlowForge AI</span>
            <span>&gt;</span>
            <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{getBreadcrumbTitle()}</span>
          </div>
        </div>

        {/* Right Utility Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "6px" : "8px" }}>
          {/* Search Trigger */}
          {isMobile ? (
            <button
              type="button"
              onClick={() => setShowQuickSearch(true)}
              className="header-icon-btn"
              title="Search (⌘K)"
            >
              <Search size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowQuickSearch(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "4px 8px",
                height: "32px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-light)",
                borderRadius: "6px",
                color: "var(--text-muted)",
                fontSize: "12px",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
              title="Search (⌘K)"
            >
              <Search size={13} />
              <span>Search</span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 4px",
                  background: "var(--surface-subtle)",
                  borderRadius: "3px",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-light)",
                }}
              >
                ⌘ K
              </span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="header-icon-btn"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={14} color="#fbbf24" /> : <Moon size={14} />}
          </button>

          {/* + New Workflow Button */}
          {isMobile ? (
            <button
              type="button"
              onClick={() => navigate("/workflows?action=new")}
              className="header-icon-btn"
              title="New Workflow"
            >
              <Plus size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/workflows?action=new")}
              className="btn btn-secondary btn-sm"
              style={{
                fontWeight: 600,
                padding: "4px 10px",
                height: "32px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
              title="New Workflow"
            >
              <Plus size={13} />
              <span>New Workflow</span>
            </button>
          )}

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
          {!isMobile && (
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
          )}

          {/* User Avatar Circle with Account Menu */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setUserMenuOpen((prev) => !prev)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#fef08a",
                color: "#713f12",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                boxSizing: "border-box",
                outline: userMenuOpen ? "2px solid var(--accent-primary)" : "none",
                outlineOffset: "1px",
              }}
              title={`${userProfile.full_name || "User"} (${userProfile.email || "Account"})`}
            >
              {userInitials.charAt(0)}
            </div>

            {userMenuOpen && (
              <>
                <div
                  onClick={() => setUserMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 140 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "220px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.35)",
                    padding: "6px",
                    zIndex: 150,
                    animation: "fadeInOverlay 0.15s ease",
                  }}
                >
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-light)", marginBottom: "4px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userProfile.full_name || "Operator"}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userProfile.email || "account"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate("/settings"); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-main)",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <SettingsIcon size={14} color="var(--text-muted)" />
                    <span>Workspace Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate("/portal"); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-main)",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <ExternalLink size={14} color="var(--text-muted)" />
                    <span>Client Portal</span>
                  </button>

                  <div style={{ borderTop: "1px solid var(--border-light)", margin: "4px 0" }} />

                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--status-danger-text)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--status-danger-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <LogOut size={14} />
                    <span>Sign Out of Studio</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Sign Out Header Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border-light)",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 0,
              width: "32px",
              height: "32px",
              display: isMobile ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "all 0.15s ease",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ef4444";
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#737373";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={15} />
          </button>
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
            background: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sidebar-border)",
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

          {/* Refined Sidebar Footer: Perfectly aligned navigation link & operational bar */}
          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "6px",
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {/* Sign Out (Styled identically to sidebar-nav-link for seamless alignment) */}
            <button
              type="button"
              onClick={handleLogout}
              className="sidebar-nav-link"
              title={collapsed ? "Sign Out" : undefined}
              style={{
                width: collapsed ? "36px" : "100%",
                border: "none",
                cursor: "pointer",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "0" : "6px 10px",
                margin: collapsed ? "0 auto" : "0",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <LogOut size={14} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Sign Out</span>}
            </button>

            {/* Bottom Status & Collapse Bar */}
            {collapsed ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "4px",
                  paddingTop: "6px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div
                  title="All workflow engine services operational"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
                >
                  <span className="status-dot status-dot-active" />
                </div>
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8fafc",
                    border: "1px solid #262626",
                    borderRadius: "4px",
                    color: "#858585",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.backgroundColor = "#262626";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#858585";
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  marginTop: "4px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#737373",
                  }}
                  title="All workflow engine services operational"
                >
                  <span className="status-dot status-dot-active" />
                  <span>Engine Operational</span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  style={{
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8fafc",
                    border: "1px solid #262626",
                    borderRadius: "4px",
                    color: "#858585",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.backgroundColor = "#262626";
                    e.currentTarget.style.borderColor = "#383838";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#858585";
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#262626";
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
              </div>
            )}
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
                background: "var(--sidebar-bg)",
                borderRight: "1px solid var(--sidebar-border)",
                display: "flex",
                flexDirection: "column",
                padding: "16px 14px",
                animation: "slideInLeft 0.25s ease",
                zIndex: 130,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              }}
            >
              {/* Drawer Brand Header with FlowForge Logo & Close Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "14px",
                  borderBottom: "1px solid var(--border-light)",
                  marginBottom: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.2 }}>FlowForge AI</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Developer Studio</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="header-icon-btn"
                  style={{ width: "28px", height: "28px" }}
                  aria-label="Close navigation menu"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Navigation Links Scrollable Body */}
              <div style={{ flex: 1, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
                {renderNavLinks(true)}
              </div>

              {/* Drawer Footer with User Identity & Sign Out Button */}
              <div
                style={{
                  borderTop: "1px solid var(--border-light)",
                  paddingTop: "12px",
                  marginTop: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* User Card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#fef08a",
                      color: "#713f12",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {userInitials.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userProfile.full_name || "Operator"}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userProfile.email || "developer"}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button (Prominent & Clear) */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "var(--status-danger-text)",
                    borderColor: "var(--status-danger-border)",
                    background: "var(--status-danger-bg)",
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out of Studio</span>
                </button>
              </div>
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
            padding: isBuilder ? "0px" : isMobile ? "14px 12px 24px 12px" : "clamp(18px, 2.5vw, 32px) clamp(16px, 3.5vw, 42px)",
            background: "var(--main-bg)",
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
              background: "var(--surface-card)",
              border: "1px solid var(--border-light)",
              borderRadius: "6px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <Search size={14} color="var(--text-muted)" style={{ marginRight: "10px" }} />
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
                  color: "var(--text-main)",
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
                        color: "var(--text-main)",
                        fontSize: "13px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--surface-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <Icon size={14} color="#0d9488" />
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
              background: "var(--surface-card)",
              border: "1px solid var(--border-light)",
              borderRadius: "6px",
              padding: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0", color: "var(--text-main)" }}>
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
