import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldCheck, Cpu, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data;
      try {
        data = await api.login(email, password);
      } catch (loginErr) {
        // If demo user doesn't exist yet, auto-register them seamlessly for instant testing
        if (email.endsWith("@flowforge.ai")) {
          try {
            await api.register(email, password, email.split("@")[0].toUpperCase(), "admin");
            data = await api.login(email, password);
          } catch {
            throw loginErr;
          }
        } else {
          throw loginErr;
        }
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Resolve user's active organization
      try {
        const orgs = await api.listOrganizations();
        if (orgs && orgs.length > 0) {
          localStorage.setItem("org_id", orgs[0].id);
          localStorage.setItem("org_name", orgs[0].name);
          localStorage.setItem("org_role", orgs[0].role || "owner");
        }
      } catch {
        // Fallback default
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
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
          maxWidth: "420px",
          background: "#161616",
          border: "1px solid #262626",
          borderRadius: "8px",
          padding: "clamp(24px, 5vw, 36px) clamp(16px, 4vw, 32px)",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            Sign in to FlowForge AI
          </h1>
          <p style={{ fontSize: "13px", color: "#A3A3A3", margin: 0 }}>
            Visual AI Workflow Orchestration & Evaluation
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              Work Email
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Mail
                size={16}
                color="#737373"
                style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#A3A3A3",
                }}
              >
                Password
              </label>
              <span style={{ fontSize: "11px", color: "#A78BFA", cursor: "pointer" }}>
                Forgot password?
              </span>
            </div>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Lock
                size={16}
                color="#737373"
                style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: "6px",
                  color: "#F5F5F5",
                  fontSize: "13px",
                  outline: "none",
                  transition: "border-color 0.15s",
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
            {loading ? "Authenticating..." : "Sign In to Workspace"}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Pre-fill Pill Bar */}
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #262626" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#737373",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sparkles size={12} color="#8B5CF6" />
            Quick Demo Personas
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleQuickDemo("engineer@flowforge.ai", "password123")}
              style={{
                padding: "8px 10px",
                background: "#111111",
                border: "1px solid #262626",
                borderRadius: "6px",
                color: "#A3A3A3",
                fontSize: "11px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span style={{ fontWeight: 600, color: "#F5F5F5" }}>Platform Engineer</span>
              <span style={{ color: "#737373" }}>engineer@flowforge.ai</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("architect@flowforge.ai", "password123")}
              style={{
                padding: "8px 10px",
                background: "#111111",
                border: "1px solid #262626",
                borderRadius: "6px",
                color: "#A3A3A3",
                fontSize: "11px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span style={{ fontWeight: 600, color: "#F5F5F5" }}>Staff Architect</span>
              <span style={{ color: "#737373" }}>architect@flowforge.ai</span>
            </button>
          </div>
        </div>

        {/* Register Footer */}
        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#737373" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#A78BFA", fontWeight: 600, textDecoration: "none" }}>
            Create Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
