import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Sparkles, Building2 } from "lucide-react";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function PortalLogin() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already authenticated, redirect to portal dashboard
    if (localStorage.getItem("token")) {
      navigate("/portal");
    } else {
      // Silently pre-warm the backend to mitigate Render cold-start latency
      api.getHealth().catch(() => {});
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user?.organization_id) {
        localStorage.setItem("org_id", data.user.organization_id);
      }
      navigate("/portal");
    } catch (err) {
      setError(err.message || "Invalid client credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (demoEmail, demoPassword, label) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSelectedPersona(label);
    setError(null);
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
        {/* Brand Logo & Title */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
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
            FlowForge Portal
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Business requests & compliance sign-offs
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border-light)",
            padding: "3px",
            borderRadius: "8px",
            marginBottom: "22px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Studio
          </button>
          <button
            type="button"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "1px solid var(--border-light)",
              background: "var(--surface-card)",
              color: "var(--text-main)",
              boxShadow: "var(--card-shadow)",
              cursor: "default",
            }}
          >
            Client Portal
          </button>
        </div>

        {/* Quick Demo Personas */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}
          >
            <Sparkles size={11} color="#0d9488" />
            <span>Select Demo Persona</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <button
                type="button"
                onClick={() => handleSelectPersona("manager@flowforge.ai", "password123", "manager")}
                style={{
                  padding: "8px 10px",
                  background: selectedPersona === "manager" ? "#f0fdfa" : "#f8fafc",
                  border: selectedPersona === "manager" ? "1px solid #0d9488" : "1px solid #e2e8f0",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: selectedPersona === "manager" ? "#0f766e" : "#0f172a" }}>
                    Acme Manager
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "1px 4px", borderRadius: "3px" }}>
                    Approver
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>manager@flowforge.ai</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPersona("client@flowforge.ai", "password123", "client")}
                style={{
                  padding: "8px 10px",
                  background: selectedPersona === "client" ? "#f0fdfa" : "#f8fafc",
                  border: selectedPersona === "client" ? "1px solid #0d9488" : "1px solid #e2e8f0",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: selectedPersona === "client" ? "#0f766e" : "#0f172a" }}>
                    Acme Requester
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "1px 4px", borderRadius: "3px" }}>
                    Intake
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>client@flowforge.ai</div>
              </button>
            </div>

            {/* Globex Tenant Button */}
            <button
              type="button"
              onClick={() => handleSelectPersona("manager@globex.com", "password123", "globex")}
              style={{
                padding: "6px 10px",
                background: selectedPersona === "globex" ? "#f0fdfa" : "#fafafa",
                border: selectedPersona === "globex" ? "1px solid #0d9488" : "1px solid #e5e7eb",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Building2 size={12} color="#64748b" />
                <span style={{ fontSize: "11px", fontWeight: 600, color: selectedPersona === "globex" ? "#0f766e" : "#334155" }}>
                  Globex VP Operations
                </span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>manager@globex.com</span>
              </div>
              <span style={{ fontSize: "9px", fontWeight: 600, color: "#475569", background: "#f1f5f9", padding: "1px 5px", borderRadius: "3px" }}>
                Isolated Tenant
              </span>
            </button>
          </div>
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

        {/* Login Form */}
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
              Work email
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Mail
                size={15}
                color="#94a3b8"
                style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedPersona(null);
                }}
                placeholder="name@company.com"
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
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                Password
              </label>
              <span style={{ fontSize: "11px", color: "#0d9488", cursor: "pointer" }}>
                Forgot?
              </span>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock
                size={15}
                color="#94a3b8"
                style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedPersona(null);
                }}
                placeholder="••••••••••••"
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
            {loading ? "Authenticating..." : "Sign in to Portal"}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Minimal Footer */}
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
          Need access? Contact your workspace administrator at{" "}
          <span style={{ color: "#0d9488", fontWeight: 500 }}>support@flowforge.ai</span>
        </div>
      </div>
    </div>
  );
}
