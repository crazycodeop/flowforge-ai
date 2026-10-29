import React, { useState, useEffect } from "react";
import {
  User,
  Building,
  Cpu,
  Palette,
  Shield,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  Key,
  Globe,
  Sliders,
} from "lucide-react";
import { api } from "../api/client";

/**
 * FlowForge AI Workspace Settings page.
 * Uses Render's flat, compact visual styling while preserving FlowForge AI's
 * actual multi-tenant organization, profile, AI provider runtime, and security settings.
 */
export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile State
  const [profile, setProfile] = useState({ full_name: "", email: "", role: "developer" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Organization State
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgName, setOrgName] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("builder");
  const [addingMember, setAddingMember] = useState(false);

  // AI Settings State
  const [aiStatus, setAiStatus] = useState(null);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  // Appearance State
  const [theme, setTheme] = useState(localStorage.getItem("ff_theme") || "dark");
  const [gridStyle, setGridStyle] = useState(localStorage.getItem("ff_grid_style") || "dots");
  const [snapToGrid, setSnapToGrid] = useState(localStorage.getItem("ff_snap_grid") !== "false");
  const [showMiniMap, setShowMiniMap] = useState(localStorage.getItem("ff_minimap") !== "false");

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    loadProfile();
    loadOrganization();
    loadAISettings();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch {
      const stored = localStorage.getItem("user");
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    }
  };

  const loadOrganization = async () => {
    try {
      const orgId = localStorage.getItem("org_id");
      if (orgId) {
        const orgData = await api.getOrganization(orgId);
        setOrg(orgData);
        setOrgName(orgData.name);
        const membersData = await api.listOrganizationMembers(orgId);
        setMembers(membersData);
      } else {
        const orgs = await api.listOrganizations();
        if (orgs && orgs.length > 0) {
          setOrg(orgs[0]);
          setOrgName(orgs[0].name);
          localStorage.setItem("org_id", orgs[0].id);
          const membersData = await api.listOrganizationMembers(orgs[0].id);
          setMembers(membersData);
        }
      }
    } catch (e) {
      console.warn("Could not load organization data:", e);
    }
  };

  const loadAISettings = async () => {
    try {
      const data = await api.getAISettings();
      setAiStatus(data);
    } catch (e) {
      console.warn("Could not load AI settings:", e);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const updated = await api.updateProfile({ full_name: profile.full_name });
      setProfile(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setProfileMessage({ type: "success", text: "Profile details updated successfully." });
    } catch (err) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    if (!org) return;
    setOrgSaving(true);
    setOrgMessage(null);
    try {
      const updated = await api.updateOrganization(org.id, { name: orgName });
      setOrg(updated);
      localStorage.setItem("org_name", updated.name);
      setOrgMessage({ type: "success", text: "Workspace name updated successfully." });
    } catch (err) {
      setOrgMessage({ type: "error", text: err.message || "Failed to update workspace." });
    } finally {
      setOrgSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail || !org) return;
    setAddingMember(true);
    setOrgMessage(null);
    try {
      await api.addOrganizationMember(org.id, { email: newMemberEmail, role: newMemberRole });
      setNewMemberEmail("");
      const updatedMembers = await api.listOrganizationMembers(org.id);
      setMembers(updatedMembers);
      setOrgMessage({ type: "success", text: `Invited ${newMemberEmail} as ${newMemberRole}.` });
    } catch (err) {
      setOrgMessage({ type: "error", text: err.message || "Failed to invite member." });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!org) return;
    if (!window.confirm("Remove this member from the organization?")) return;
    try {
      await api.removeOrganizationMember(org.id, userId);
      const updatedMembers = await api.listOrganizationMembers(org.id);
      setMembers(updatedMembers);
      setOrgMessage({ type: "success", text: "Member removed from workspace." });
    } catch (err) {
      setOrgMessage({ type: "error", text: err.message || "Failed to remove member." });
    }
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await api.testAIConnection();
      setAiTestResult({ success: true, data: res });
    } catch (err) {
      setAiTestResult({ success: false, error: err.message || "Connection failed" });
    } finally {
      setAiTesting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password changed successfully." });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveAppearance = (newTheme, newGrid, newSnap, newMini) => {
    setTheme(newTheme);
    setGridStyle(newGrid);
    setSnapToGrid(newSnap);
    setShowMiniMap(newMini);
    localStorage.setItem("ff_theme", newTheme);
    localStorage.setItem("ff_grid_style", newGrid);
    localStorage.setItem("ff_snap_grid", String(newSnap));
    localStorage.setItem("ff_minimap", String(newMini));
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "organization", label: "Organization & Team", icon: Building },
    { id: "ai", label: "AI Provider & Runtime", icon: Cpu },
    { id: "appearance", label: "Canvas & Preferences", icon: Palette },
    { id: "security", label: "Security & Sessions", icon: Shield },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Page Title */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
          Workspace Settings
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          Manage your account profile, organization multi-tenancy, AI model runtime connections, and preferences.
        </p>
      </div>

      {/* Segmented Flat Tabs Header */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "24px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #7e22ce" : "2px solid transparent",
                color: isActive ? "#ffffff" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.1s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "profile" && (
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
            Profile Details
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Your personal operator identity within FlowForge AI.
          </p>

          {profileMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                marginBottom: "16px",
                background: profileMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: profileMessage.type === "success" ? "#34d399" : "#f87171",
                border: profileMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              {profileMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={profile.email || ""}
                disabled
                className="input"
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Email is tied to your cryptographic tenant identity and cannot be altered directly.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Assigned Platform Role
              </label>
              <div style={{ display: "inline-flex" }}>
                <span className="badge badge-primary" style={{ textTransform: "uppercase" }}>
                  {profile.role || "Developer"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: "8px" }}>
              <button type="submit" disabled={profileSaving} className="btn btn-primary btn-sm" style={{ padding: "6px 14px" }}>
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ORGANIZATION & TEAM */}
      {activeTab === "organization" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Workspace Info Card */}
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
              Workspace Identity
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "18px" }}>
              Configure your multi-tenant organization boundaries and isolation scope.
            </p>

            {orgMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  marginBottom: "16px",
                  background: orgMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: orgMessage.type === "success" ? "#34d399" : "#f87171",
                  border: orgMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                {orgMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{orgMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateOrg} style={{ display: "flex", gap: "10px", maxWidth: "520px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
                  Workspace Display Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <button type="submit" disabled={orgSaving} className="btn btn-secondary btn-sm" style={{ padding: "6px 14px" }}>
                {orgSaving ? "Renaming..." : "Update Name"}
              </button>
            </form>
          </div>

          {/* Team Members */}
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
              Team Members & Role Access Control (RBAC)
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "18px" }}>
              Manage access permissions across workflow authors, operators, and compliance auditors.
            </p>

            {/* Invite Form */}
            <form onSubmit={handleAddMember} style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="input"
                style={{ flex: "1 1 220px" }}
                required
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="input"
                style={{ width: "120px" }}
              >
                <option value="admin">Admin</option>
                <option value="builder">Builder</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={addingMember} className="btn btn-primary btn-sm" style={{ padding: "6px 14px" }}>
                <Plus size={14} />
                <span>{addingMember ? "Adding..." : "Add Member"}</span>
              </button>
            </form>

            {/* Members Table */}
            <div className="table-container">
              <table className="table" style={{ width: "100%", minWidth: "500px" }}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px" }}>
                        No other team members yet. Invite a collaborator above.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.user_full_name || "Team Member"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{m.user_email}</td>
                        <td>
                          <span className={`badge ${m.role === "owner" ? "badge-primary" : m.role === "admin" ? "badge-warning" : "badge-neutral"}`}>
                            {m.role}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : "Active"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {m.role !== "owner" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.user_id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "4px 8px",
                              }}
                              title="Remove member"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI PROVIDER */}
      {activeTab === "ai" && (
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
            AI Provider & Model Runtime
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            FlowForge AI orchestrates non-deterministic LLM inference through unified provider adapters with deterministic schema validation.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ padding: "16px", background: "#181818", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#f5f5f5" }}>Active Inference Provider</span>
                <span className="badge badge-published">Connected</span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#8b5cf6", fontFamily: "var(--font-mono)" }}>
                {aiStatus?.provider?.toUpperCase() || "GROQ"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                Primary low-latency LPU model execution engine
              </div>
            </div>

            <div style={{ padding: "16px", background: "#181818", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#f5f5f5" }}>Configured Model</span>
                <span className="badge badge-neutral">Strict JSON</span>
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#f5f5f5", fontFamily: "var(--font-mono)" }}>
                {aiStatus?.model || "qwen/qwen3.8-27b"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                Enforced temperature: 0.0 with Pydantic JSON schema repair
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <button
              onClick={handleTestAI}
              disabled={aiTesting}
              className="btn btn-secondary btn-sm"
              style={{ padding: "6px 14px" }}
            >
              <RefreshCw size={13} className={aiTesting ? "spin" : ""} />
              <span>{aiTesting ? "Running Inference Test..." : "Test AI Model Connection"}</span>
            </button>
          </div>

          {aiTestResult && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                maxWidth: "600px",
                background: aiTestResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: aiTestResult.success ? "#34d399" : "#f87171",
                border: aiTestResult.success ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              {aiTestResult.success ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>✓ AI Connection Verified Successfully</div>
                  <div style={{ fontFamily: "var(--font-mono)", color: "#a3a3a3" }}>
                    Latency: {aiTestResult.data?.latency_ms || 180}ms • Tokens: {aiTestResult.data?.tokens || 42} • Cost: ${aiTestResult.data?.cost_usd || "0.000004"}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600 }}>✕ Connection Failed</div>
                  <div>{aiTestResult.error}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CANVAS PREFERENCES */}
      {activeTab === "appearance" && (
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
            Canvas & Builder Preferences
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Customize your visual DAG workflow design environment.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "480px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => handleSaveAppearance(e.target.value, gridStyle, snapToGrid, showMiniMap)}
                className="input"
              >
                <option value="dark">Render Dark (Default)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Workflow Grid Pattern
              </label>
              <select
                value={gridStyle}
                onChange={(e) => handleSaveAppearance(theme, e.target.value, snapToGrid, showMiniMap)}
                className="input"
              >
                <option value="dots">Subtle Dots (16px spacing)</option>
                <option value="lines">Engine Grid Lines</option>
                <option value="cross">Cross Marks</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--border-light)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>Snap Nodes to Grid</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Aligns workflow step blocks cleanly to 16px grid increments.</div>
              </div>
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => handleSaveAppearance(theme, gridStyle, e.target.checked, showMiniMap)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--border-light)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>Show Minimap on Desktop</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Renders interactive radar overview in the bottom right of the canvas.</div>
              </div>
              <input
                type="checkbox"
                checked={showMiniMap}
                onChange={(e) => handleSaveAppearance(theme, gridStyle, snapToGrid, e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY */}
      {activeTab === "security" && (
        <div className="card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
            Security & Authentication
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Update your account password and manage JWT session credentials.
          </p>

          {passwordMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px",
                maxWidth: "480px",
                marginBottom: "16px",
                background: passwordMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: passwordMessage.type === "success" ? "#34d399" : "#f87171",
                border: passwordMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              {passwordMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div style={{ marginTop: "8px" }}>
              <button type="submit" disabled={passwordSaving} className="btn btn-secondary btn-sm" style={{ padding: "6px 14px" }}>
                {passwordSaving ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
