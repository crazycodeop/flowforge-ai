import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { api } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already authenticated, redirect to overview
    if (localStorage.getItem("token")) {
      navigate("/");
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
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
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
        background: "#f8fafc",
        padding: "24px 16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "clamp(24px, 5vw, 36px) clamp(16px, 5vw, 32px)",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
        }}
      >
        {/* Brand Logo & Title */}
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
              color: "#0f172a",
            }}
          >
            FlowForge Studio
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              margin: 0,
            }}
          >
            Workflow engineering & developer console
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#f1f5f9",
            padding: "3px",
            borderRadius: "8px",
            marginBottom: "22px",
          }}
        >
          <button
            type="button"
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "6px",
              border: "none",
              background: "#ffffff",
              color: "#0f172a",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              cursor: "default",
            }}
          >
            Studio
          </button>
          <button
            type="button"
            onClick={() => navigate("/portal/login")}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
          >
            Client Portal
          </button>
        </div>

        {/* Quick Demo Persona Chips */}
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
            <span>Quick Sign-In Personas</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleSelectPersona("engineer@flowforge.ai", "password123", "engineer")}
              style={{
                padding: "8px 10px",
                background: selectedPersona === "engineer" ? "#f0fdfa" : "#f8fafc",
                border: selectedPersona === "engineer" ? "1px solid #0d9488" : "1px solid #e2e8f0",
                borderRadius: "6px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: selectedPersona === "engineer" ? "#0f766e" : "#0f172a" }}>
                Platform Engineer
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>engineer@flowforge.ai</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPersona("architect@flowforge.ai", "password123", "architect")}
              style={{
                padding: "8px 10px",
                background: selectedPersona === "architect" ? "#f0fdfa" : "#f8fafc",
                border: selectedPersona === "architect" ? "1px solid #0d9488" : "1px solid #e2e8f0",
                borderRadius: "6px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: selectedPersona === "architect" ? "#0f766e" : "#0f172a" }}>
                Staff Architect
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "1px" }}>architect@flowforge.ai</div>
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
                color: "#334155",
                marginBottom: "5px",
              }}
            >
              Email address
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
            {loading ? "Authenticating..." : "Sign in to Studio"}
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
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#0d9488", fontWeight: 600, textDecoration: "none" }}>
            Create Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
