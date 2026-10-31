import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User, Building, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../api/client";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Register user
      await api.register(email, password, fullName, role);

      // 2. Log in
      const loginData = await api.login(email, password);
      localStorage.setItem("token", loginData.access_token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      // 3. Check or create custom organization if companyName provided
      try {
        const orgs = await api.listOrganizations();
        if (companyName && companyName.trim()) {
          const newOrg = await api.createOrganization({
            name: companyName.trim(),
            description: `${fullName}'s primary workspace`,
          });
          localStorage.setItem("org_id", newOrg.id);
          localStorage.setItem("org_name", newOrg.name);
          localStorage.setItem("org_role", "owner");
        } else if (orgs && orgs.length > 0) {
          localStorage.setItem("org_id", orgs[0].id);
          localStorage.setItem("org_name", orgs[0].name);
          localStorage.setItem("org_role", orgs[0].role || "owner");
        }
      } catch {
        // Fallback default
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B0B0B",
        padding: "clamp(12px, 3vw, 24px)",
        color: "#F5F5F5",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#161616",
          border: "1px solid #262626",
          borderRadius: "8px",
          padding: "clamp(24px, 5vw, 36px) clamp(16px, 4vw, 32px)",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: "#8B5CF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.01em", color: "#F5F5F5" }}>
            Create your FlowForge AI Workspace
          </h1>
          <p style={{ fontSize: "13px", color: "#A3A3A3", margin: 0 }}>
            Production AI orchestration with multi-tenant team governance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#A3A3A3",
                marginBottom: "6px",
              }}
            >
              Full Name *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User size={16} color="#737373" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Connor"
                required
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#A3A3A3",
                marginBottom: "6px",
              }}
            >
              Work Email *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail size={16} color="#737373" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@cyberdyne.io"
                required
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#A3A3A3",
                marginBottom: "6px",
              }}
            >
              Organization / Team Name (Optional)
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Building size={16} color="#737373" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Autonomous AI"
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#A3A3A3",
                marginBottom: "6px",
              }}
            >
              Password *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={16} color="#737373" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "10px 16px",
              background: "#8B5CF6",
              border: "none",
              borderRadius: "6px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.7 : 1,
              transition: "background 0.15s",
            }}
          >
            {loading ? "Provisioning Workspace..." : "Create Organization & Continue"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#737373" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#A78BFA", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
