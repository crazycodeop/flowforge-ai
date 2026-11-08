import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, User, Building, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("developer");
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

      // 3. Create custom organization if companyName provided
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
        background: "var(--main-bg)",
        padding: "24px 16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Theme Switcher Top-Right */}
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "var(--surface-card)",
          border: "1px solid var(--border-light)",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
          boxShadow: "var(--card-shadow)",
        }}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {theme === "dark" ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
      </button>


      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--surface-card)",
          border: "1px solid var(--border-light)",
          borderRadius: "12px",
          padding: "clamp(24px, 5vw, 36px) clamp(16px, 5vw, 32px)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
            }}
          >
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              margin: "0 0 4px 0",
              color: "var(--text-main)",
            }}
          >
            Create your Workspace
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Start building AI workflows with multi-tenant governance
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#b91c1c",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
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
                color: "var(--text-secondary)",
                marginBottom: "5px",
              }}
            >
              Full name *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sarah Connor"
                required
                className="input"
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
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
                color: "var(--text-secondary)",
                marginBottom: "5px",
              }}
            >
              Work email *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                required
                className="input"
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
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
                color: "var(--text-secondary)",
                marginBottom: "5px",
              }}
            >
              Organization name (Optional)
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Building size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corporation"
                className="input"
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
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
                color: "var(--text-secondary)",
                marginBottom: "5px",
              }}
            >
              Password *
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                className="input"
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              height: "40px",
              marginTop: "4px",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "6px",
            }}
          >
            {loading ? "Provisioning Workspace..." : "Create Organization & Continue"}
            <ArrowRight size={15} />
          </button>
        </form>

        <div
          style={{
            marginTop: "22px",
            paddingTop: "16px",
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#0d9488", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
