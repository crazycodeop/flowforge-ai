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
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";

/**
 * FlowForge AI Workspace Settings page.
 * Uses Render's flat, compact visual styling while preserving FlowForge AI's
 * actual multi-tenant organization, profile, AI provider runtime, and security settings.
 */
export default function Settings() {
  const modal = useModal();
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
  const [providerInput, setProviderInput] = useState("groq");
  const [modelInput, setModelInput] = useState("qwen/qwen3.8-27b");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaveMessage, setAiSaveMessage] = useState(null);

  // Dynamic Available Models State
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState(null);

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

  const loadAvailableModels = async (prov, key) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await api.fetchAvailableModels({
        provider: prov,
        api_key: key ? key.trim() : undefined,
      });
      if (res && res.models && res.models.length > 0) {
        setAvailableModels(res.models);
        setModelInput((prev) => {
          if (res.models.some((m) => m.id === prev)) return prev;
          return res.models[0].id;
        });
      } else {
        setAvailableModels([]);
        if (res && res.error) {
          setModelsError(res.error);
        }
      }
    } catch (err) {
      setModelsError(err.message || "Failed to fetch models from provider.");
      setAvailableModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  const loadAISettings = async () => {
    try {
      const data = await api.getAISettings();
      setAiStatus(data);
      if (data?.provider) {
        setProviderInput(data.provider);
        loadAvailableModels(data.provider, "");
      }
      if (data?.model) setModelInput(data.model);
    } catch (e) {
      console.warn("Could not load AI settings:", e);
    }
  };

  const handleProviderSelect = (newProv) => {
    setProviderInput(newProv);
    setApiKeyInput("");
    setAiTestResult(null);
    setAiSaveMessage(null);
    if (newProv === "groq") setModelInput("qwen/qwen3.8-27b");
    else if (newProv === "openai") setModelInput("gpt-4o-mini");
    else if (newProv === "gemini") setModelInput("gemini-3.5-flash");
    else if (newProv === "mock") setModelInput("mock-model-v1");
    loadAvailableModels(newProv, "");
  };

  const handleSaveAISettings = async (e, setAsDefault = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setAiSaving(true);
    setAiSaveMessage(null);
    try {
      const payload = {
        provider: providerInput,
        model: modelInput,
        set_as_active: setAsDefault,
      };
      if (apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      }
      const res = await api.updateAISettings(payload);
      setAiStatus(res);
      setApiKeyInput("");
      const provName = currentProvDetail?.name || providerInput.toUpperCase();
      setAiSaveMessage({
        type: "success",
        text: `${provName} saved! It is now active and available for workflow creation.`,
      });
    } catch (err) {
      setAiSaveMessage({ type: "error", text: err.message || "Failed to save AI settings." });
    } finally {
      setAiSaving(false);
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
    const confirmed = await modal.confirm({
      title: "Remove Team Member",
      message: "Are you sure you want to remove this member from the organization? They will immediately lose access to workspace workflows.",
      confirmText: "Remove Member",
      variant: "danger",
    });
    if (!confirmed) return;
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
      const res = await api.testAIConnection({
        provider: providerInput,
        model: modelInput,
        api_key: apiKeyInput.trim() || undefined,
      });
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
      {activeTab === "ai" && (() => {
        const currentProvDetail = aiStatus?.providers?.find((p) => p.id === providerInput) || {
          id: providerInput,
          name: providerInput.toUpperCase(),
          is_active: aiStatus?.provider === providerInput,
          has_key: aiStatus?.provider === providerInput ? aiStatus?.api_key_configured : false,
          masked_key: aiStatus?.provider === providerInput ? aiStatus?.api_key_masked : null,
          requires_key: providerInput !== "mock",
        };

        return (
          <div className="card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text-main)" }}>
              AI Providers & Credentials
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Configure inference providers. Any provider with a saved key is Active and available across all workflows.
            </p>

            {aiSaveMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  marginBottom: "16px",
                  background: aiSaveMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: aiSaveMessage.type === "success" ? "#34d399" : "#f87171",
                  border: aiSaveMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                {aiSaveMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{aiSaveMessage.text}</span>
              </div>
            )}

            {/* Provider Selection Cards */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
                {[
                  { id: "groq", name: "Groq Cloud LPU", desc: "Ultra-low latency inference", badge: "Fastest" },
                  { id: "gemini", name: "Google Gemini", desc: "Gemini 3.5 Flash & Pro", badge: "Multimodal" },
                  { id: "openai", name: "OpenAI", desc: "GPT-4o & GPT-4o-mini", badge: "Standard" },
                  { id: "mock", name: "Mock Sandbox", desc: "Simulated token execution", badge: "Zero Cost" },
                ].map((prov) => {
                  const isSelected = providerInput === prov.id;
                  const detail = aiStatus?.providers?.find((p) => p.id === prov.id);
                  const isActive = detail ? detail.is_active : false;
                  const isDefault = detail ? detail.is_default : (aiStatus?.provider === prov.id);

                  return (
                    <div
                      key={prov.id}
                      onClick={() => handleProviderSelect(prov.id)}
                      style={{
                        padding: "14px",
                        borderRadius: "6px",
                        background: isSelected ? "rgba(139, 92, 246, 0.12)" : "#161616",
                        border: isSelected ? "1px solid #8b5cf6" : "1px solid #262626",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: "92px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "#ffffff" : "#d4d4d4" }}>
                            {prov.name}
                          </span>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 600,
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: isSelected ? "#8b5cf6" : "#222222",
                              color: isSelected ? "#ffffff" : "#a3a3a3",
                            }}
                          >
                            {prov.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#888888", marginBottom: "10px" }}>{prov.desc}</div>
                      </div>

                      {/* Status indicator */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {isActive ? (
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#34d399", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }}></span>
                            Active
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f87171" }}></span>
                            Key Required
                          </span>
                        )}

                        {isDefault && (
                          <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "3px", background: "rgba(139, 92, 246, 0.2)", color: "#a78bfa", fontWeight: 600, border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provider Configuration Form */}
            <form onSubmit={handleSaveAISettings} style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "560px", marginBottom: "20px" }}>
              <div style={{ padding: "16px", background: "#161616", border: "1px solid #262626", borderRadius: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                    Configuring: <span style={{ color: "#a78bfa" }}>{currentProvDetail.name}</span>
                  </div>
                  {currentProvDetail.is_active ? (
                    <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }}></span>
                      Active {currentProvDetail.masked_key ? `(${currentProvDetail.masked_key})` : ""}
                    </span>
                  ) : currentProvDetail.requires_key ? (
                    <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 500 }}>
                      • Key Required
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 500 }}>
                      ✓ Local Sandbox
                    </span>
                  )}
                </div>

                {/* API Key Input */}
                {providerInput !== "mock" && (
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "6px" }}>
                      API Key
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={
                          currentProvDetail.has_key
                            ? `Key saved (${currentProvDetail.masked_key}) — enter new key to update`
                            : `Enter your ${currentProvDetail.name} API key`
                        }
                        className="input"
                        style={{ fontSize: "12px", paddingRight: "36px", width: "100%" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "#737373",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title={showApiKey ? "Hide key" : "Show key"}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Default Model */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "6px" }}>
                    Default Model
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={modelInput}
                      onChange={(e) => setModelInput(e.target.value)}
                      className="input"
                      style={{ fontSize: "12px", flex: 1 }}
                      disabled={modelsLoading}
                    >
                      {modelsLoading && <option>Fetching models...</option>}
                      {!modelsLoading && availableModels.length > 0 && availableModels.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                      {!modelsLoading && availableModels.length === 0 && (
                        <option value={modelInput}>{modelInput || "No models loaded"}</option>
                      )}
                    </select>

                    {providerInput !== "mock" && (
                      <button
                        type="button"
                        onClick={() => loadAvailableModels(providerInput, apiKeyInput.trim())}
                        disabled={modelsLoading}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "0 12px",
                          height: "36px",
                          whiteSpace: "nowrap",
                          fontSize: "11px",
                          fontWeight: 500,
                        }}
                        title="Query provider API to load active models"
                      >
                        <RefreshCw size={12} className={modelsLoading ? "spin" : ""} />
                        <span>{modelsLoading ? "Loading..." : "Fetch Models"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Clean & Direct */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={aiSaving}
                  className="btn btn-primary btn-sm"
                  style={{ padding: "8px 18px", fontSize: "12px", fontWeight: 600 }}
                >
                  <Save size={13} />
                  <span>{aiSaving ? "Saving..." : "Save Key"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={aiTesting}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "8px 16px", fontSize: "12px" }}
                >
                  <RefreshCw size={13} className={aiTesting ? "spin" : ""} />
                  <span>{aiTesting ? "Testing Ping..." : "Test Connection"}</span>
                </button>

                {!currentProvDetail.is_default && currentProvDetail.is_active && (
                  <button
                    type="button"
                    onClick={(e) => handleSaveAISettings(e, true)}
                    disabled={aiSaving}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: "8px 14px", fontSize: "11px", color: "#a78bfa" }}
                    title="Make this provider the default fallback for new nodes"
                  >
                    Set as Default Fallback
                  </button>
                )}
              </div>
            </form>

            {/* Test Results Output Banner */}
            {aiTestResult && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  maxWidth: "560px",
                  background: aiTestResult.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  color: aiTestResult.success ? "#34d399" : "#f87171",
                  border: aiTestResult.success ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                {aiTestResult.success ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      ✓ {aiTestResult.data?.provider?.toUpperCase()} Verified Successfully
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", color: "#d4d4d4", fontSize: "11px" }}>
                      Provider: {aiTestResult.data?.provider} • Model: {aiTestResult.data?.model} • Latency: {aiTestResult.data?.latency_ms}ms • Tokens: {aiTestResult.data?.tokens}
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#a3a3a3" }}>
                      Response: <span style={{ color: "#34d399", fontWeight: 600 }}>"{aiTestResult.data?.response}"</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                      ✕ {providerInput.toUpperCase()} Connection Test Failed
                    </div>
                    <div style={{ fontSize: "11px", lineHeight: "1.4" }}>{aiTestResult.error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

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
