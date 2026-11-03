import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  Bot,
  User,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  AlertTriangle,
  ArrowRight,
  Code2,
  Terminal,
} from "lucide-react";
import { api } from "../api/client";

export default function WhatsAppSimulator() {
  const [messages, setMessages] = useState([
    {
      id: "m_welcome",
      sender: "bot",
      text: "👋 *Welcome to FlowForge Support on WhatsApp!*\n\nHow can we help you today? You can inquire about orders, request refunds for damaged items, or report technical issues.",
      time: "09:30 AM",
      status: "read",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("simulator"); // 'simulator' | 'webhook_setup'
  const [latestTrace, setLatestTrace] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [config, setConfig] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadConfig = async () => {
    try {
      const data = await api.getWhatsAppConfig();
      setConfig(data);
    } catch (e) {
      console.warn("Could not load WhatsApp config:", e);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "delivered",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setLoading(true);

    try {
      const res = await api.simulateWhatsAppMessage({
        message: text.trim(),
        customer_phone: "+91 98765 43210",
        customer_name: "Customer",
      });

      setLatestTrace(res);

      const botMsg = {
        id: `b_${Date.now()}`,
        sender: "bot",
        text: res.reply,
        time: res.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        requiresApproval: res.requires_approval,
        approvalId: res.approval_id,
        runId: res.run_id,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "bot",
          text: `⚠️ *System Error*: Unable to reach FlowForge AI workflow engine (${err.message || "Network Timeout"}). Please verify backend server is running.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleScenario = (scenarioText) => {
    setInputText("");
    handleSendMessage(scenarioText);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "m_welcome",
        sender: "bot",
        text: "👋 *Chat cleared.*\n\nFlowForge WhatsApp Assistant is ready. Type a message or click any demo scenario on the right.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setLatestTrace(null);
  };

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const webhookFullUrl = `${window.location.origin}/api/v1/integrations/whatsapp/webhook`;
  const verifyToken = config?.verify_token || "flowforge_whatsapp_token_2026";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: 0 }}>
              WhatsApp Business Assistant
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(37, 211, 102, 0.15)",
                color: "#25d366",
                border: "1px solid rgba(37, 211, 102, 0.3)",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              <CheckCheck size={12} /> Meta Cloud API Ready
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Automated customer support, policy-backed refund resolution, and human manager handoffs directly over WhatsApp.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: "flex", background: "#161616", border: "1px solid #262626", borderRadius: "6px", padding: "3px" }}>
          <button
            onClick={() => setActiveTab("simulator")}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "simulator" ? "#222222" : "transparent",
              color: activeTab === "simulator" ? "#ffffff" : "#888888",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MessageSquare size={13} color="#25d366" />
            <span>Interactive Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab("webhook_setup")}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              background: activeTab === "webhook_setup" ? "#222222" : "transparent",
              color: activeTab === "webhook_setup" ? "#ffffff" : "#888888",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Code2 size={13} color="#8b5cf6" />
            <span>Connect Live WhatsApp</span>
          </button>
        </div>
      </div>

      {activeTab === "simulator" ? (
        /* TAB 1: INTERACTIVE SIMULATOR + DEMO SCENARIOS */
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: "24px", alignItems: "start" }}>
          {/* LEFT: Realistic WhatsApp Phone Mockup */}
          <div
            style={{
              background: "#000000",
              borderRadius: "32px",
              border: "3px solid #2a2a2a",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "640px",
              position: "relative",
            }}
          >
            {/* Phone Top Notch */}
            <div style={{ background: "#000000", height: "18px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "80px", height: "8px", background: "#1c1c1c", borderRadius: "4px" }} />
            </div>

            {/* WhatsApp App Bar */}
            <div
              style={{
                background: "#1f2c34",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#e9edef" }}>
                      FlowForge Support
                    </span>
                    <span style={{ color: "#25d366", fontSize: "13px", display: "inline-flex" }}>●</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#8696a0" }}>online (Verified Business)</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#aebac1" }}>
                <Phone size={15} style={{ opacity: 0.6 }} />
                <Video size={16} style={{ opacity: 0.6 }} />
                <button
                  onClick={handleClearChat}
                  title="Clear chat session"
                  style={{ background: "transparent", border: "none", color: "#aebac1", cursor: "pointer", padding: "2px" }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* WhatsApp Chat Body */}
            <div
              style={{
                flex: 1,
                background: "#0b141a",
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                padding: "16px 12px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* WhatsApp Date Stamp */}
              <div style={{ textAlign: "center", margin: "4px 0" }}>
                <span
                  style={{
                    background: "#182229",
                    color: "#8696a0",
                    fontSize: "10px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: 500,
                  }}
                >
                  TODAY
                </span>
              </div>

              {messages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "84%",
                        background: isUser ? "#005c4b" : "#202c33",
                        color: "#e9edef",
                        borderRadius: "8px",
                        borderTopRightRadius: isUser ? "0px" : "8px",
                        borderTopLeftRadius: !isUser ? "0px" : "8px",
                        padding: "8px 10px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        fontSize: "12px",
                        lineHeight: 1.45,
                        wordBreak: "break-word",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-line" }}>
                        {m.text.split("\n").map((line, idx) => {
                          // Simple bold parser for WhatsApp format *bold*
                          const parts = line.split(/(\*[^*]+\*)/g);
                          return (
                            <div key={idx}>
                              {parts.map((p, pIdx) => {
                                if (p.startsWith("*") && p.endsWith("*")) {
                                  return (
                                    <strong key={pIdx} style={{ color: "#ffffff", fontWeight: 700 }}>
                                      {p.slice(1, -1)}
                                    </strong>
                                  );
                                }
                                if (p.startsWith("`") && p.endsWith("`")) {
                                  return (
                                    <code key={pIdx} style={{ background: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "3px", fontSize: "11px" }}>
                                      {p.slice(1, -1)}
                                    </code>
                                  );
                                }
                                return p;
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Approval Alert Pill inside chat bubble */}
                      {m.requiresApproval && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "6px 8px",
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "#fbbf24",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <span>Paused for Human Approval</span>
                          <Link
                            to="/approvals"
                            style={{
                              color: "#ffffff",
                              background: "#7e22ce",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontSize: "10px",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <span>Review</span>
                            <ArrowRight size={10} />
                          </Link>
                        </div>
                      )}

                      {/* Timestamp & double ticks */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                          marginTop: "4px",
                          fontSize: "10px",
                          color: "#8696a0",
                        }}
                      >
                        <span>{m.time}</span>
                        {isUser && <CheckCheck size={12} color="#53bdeb" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      background: "#202c33",
                      borderRadius: "8px",
                      borderTopLeftRadius: "0",
                      padding: "8px 12px",
                      color: "#8696a0",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>FlowForge AI is thinking</span>
                    <span className="spin" style={{ display: "inline-block" }}>●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* WhatsApp Chat Input Footer */}
            <div
              style={{
                background: "#202c33",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Smile size={18} color="#8696a0" style={{ cursor: "pointer" }} />
              <Paperclip size={16} color="#8696a0" style={{ cursor: "pointer" }} />
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                style={{
                  flex: 1,
                  background: "#2a3942",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#e9edef",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                style={{
                  background: "#00a884",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  cursor: loading || !inputText.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !inputText.trim() ? 0.6 : 1,
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* RIGHT: DEMO SCENARIOS & LIVE EXECUTION TRACE */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Quick Demo Scenarios Card */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Sparkles size={16} color="#c084fc" />
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                  1-Click Client Demo Scenarios
                </h3>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Click any scenario below to trigger realistic customer situations directly on WhatsApp:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Scenario 1: Instant Refund */}
                <div
                  onClick={() =>
                    handleScenario(
                      "Hi, I received order #8921 but two cartons of milk were leaked. Can I get a $35 refund?"
                    )
                  }
                  style={{
                    padding: "12px 14px",
                    background: "#161616",
                    border: "1px solid #262626",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#25d366";
                    e.currentTarget.style.background = "#1a1a1a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#262626";
                    e.currentTarget.style.background = "#161616";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#25d366" }}>
                      🟢 Scenario 1: Instant Auto-Refund (&lt; $100)
                    </span>
                    <span style={{ fontSize: "10px", color: "#888", background: "#222", padding: "2px 6px", borderRadius: "3px" }}>
                      0 Human Effort
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#d4d4d8", lineHeight: 1.4 }}>
                    "Hi, I received order #8921 but two cartons of milk were leaked. Can I get a $35 refund?"
                  </div>
                  <div style={{ fontSize: "10px", color: "#737373", marginTop: "4px" }}>
                    Checks Billing & Refund Policy (POL-BILL-001) ➔ Auto-approves $35 refund ➔ Resolves ticket.
                  </div>
                </div>

                {/* Scenario 2: High-Value Manager Approval */}
                <div
                  onClick={() =>
                    handleScenario(
                      "I purchased an iPad tablet worth $450 in order #9910 but package was stolen. I need a refund immediately!"
                    )
                  }
                  style={{
                    padding: "12px 14px",
                    background: "#161616",
                    border: "1px solid #262626",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#f59e0b";
                    e.currentTarget.style.background = "#1a1a1a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#262626";
                    e.currentTarget.style.background = "#161616";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#f59e0b" }}>
                      🟠 Scenario 2: High-Value Manager Escalation (&gt; $100)
                    </span>
                    <span style={{ fontSize: "10px", color: "#fbbf24", background: "rgba(245,158,11,0.15)", padding: "2px 6px", borderRadius: "3px" }}>
                      Human Approval
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#d4d4d8", lineHeight: 1.4 }}>
                    "I purchased an iPad tablet worth $450 in order #9910 but package was stolen. I need a refund immediately!"
                  </div>
                  <div style={{ fontSize: "10px", color: "#737373", marginTop: "4px" }}>
                    Amount ($450) &gt; $100 policy limit ➔ Pauses workflow ➔ Dispatches alert to Human Approvals tab.
                  </div>
                </div>

                {/* Scenario 3: Technical SLA Escalation */}
                <div
                  onClick={() =>
                    handleScenario(
                      "Our production Celery tasks are encountering persistent database connection timeouts. Need P0 emergency SLA escalation!"
                    )
                  }
                  style={{
                    padding: "12px 14px",
                    background: "#161616",
                    border: "1px solid #262626",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#8b5cf6";
                    e.currentTarget.style.background = "#1a1a1a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#262626";
                    e.currentTarget.style.background = "#161616";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#a78bfa" }}>
                      🔵 Scenario 3: Technical Incident SLA
                    </span>
                    <span style={{ fontSize: "10px", color: "#c084fc", background: "rgba(139,92,246,0.15)", padding: "2px 6px", borderRadius: "3px" }}>
                      P0 Incident
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#d4d4d8", lineHeight: 1.4 }}>
                    "Our production Celery tasks are encountering persistent database connection timeouts. Need P0 emergency SLA escalation!"
                  </div>
                  <div style={{ fontSize: "10px", color: "#737373", marginTop: "4px" }}>
                    Checks Technical SLA (POL-TECH-002) ➔ Triages as P0 ➔ Escalates to on-call engineering.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Trace / Brain Decision Inspector */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Terminal size={15} color="#8b5cf6" />
                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                    Live FlowForge Workflow Execution
                  </h4>
                </div>
                {latestTrace?.run_id && (
                  <Link
                    to="/executions"
                    style={{ fontSize: "11px", color: "#a78bfa", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>Inspect DAG Trace</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>

              {latestTrace ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
                    <div style={{ background: "#161616", padding: "8px 10px", borderRadius: "4px", border: "1px solid #222" }}>
                      <div style={{ color: "#737373", marginBottom: "2px" }}>AI Intent Category</div>
                      <div style={{ fontWeight: 600, color: "#ffffff", textTransform: "uppercase" }}>
                        {latestTrace.category}
                      </div>
                    </div>
                    <div style={{ background: "#161616", padding: "8px 10px", borderRadius: "4px", border: "1px solid #222" }}>
                      <div style={{ color: "#737373", marginBottom: "2px" }}>Confidence Score</div>
                      <div style={{ fontWeight: 600, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                        {(latestTrace.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#161616", padding: "10px 12px", borderRadius: "4px", border: "1px solid #222" }}>
                    <div style={{ fontSize: "10px", color: "#737373", textTransform: "uppercase", marginBottom: "4px", fontWeight: 600 }}>
                      Matched Knowledge Base Policy
                    </div>
                    <div style={{ fontSize: "12px", color: "#c084fc", fontWeight: 500 }}>
                      {latestTrace.policy_citation || "Billing & Refund Policy (POL-BILL-001)"}
                    </div>
                  </div>

                  {latestTrace.requires_approval ? (
                    <div
                      style={{
                        padding: "12px",
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                        <AlertTriangle size={14} />
                        <span>Workflow Paused: Human Approval Required</span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#d4d4d8", margin: "0 0 10px 0" }}>
                        The AI engine detected this request requires manager sign-off. The execution has paused state.
                      </p>
                      <Link
                        to="/approvals"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: "11px", width: "100%", justifyContent: "center" }}
                      >
                        <ShieldCheck size={13} />
                        <span>Open Human Approvals Dashboard</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#34d399",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <CheckCheck size={14} />
                      <span>Deterministic Execution Completed: 100% Policy Compliant</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "12px" }}>
                  Send a message on WhatsApp to view real-time workflow decision traces.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: CONNECT REAL WHATSAPP CLOUD API */
        <div className="card" style={{ padding: "28px", maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ padding: "8px", background: "rgba(37, 211, 102, 0.15)", borderRadius: "8px", color: "#25d366" }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", margin: 0 }}>
                Meta WhatsApp Business Cloud API Integration
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                Connect your real phone number so customers on WhatsApp talk directly to this FlowForge AI brain.
              </p>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #222", margin: "20px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Step 1: Copy Webhook URL */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                1. Webhook Callback URL
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                In your Meta Developer Portal (under <strong>WhatsApp &gt; Configuration &gt; Webhook</strong>), paste this URL:
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={webhookFullUrl}
                  className="input"
                  style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "12px", color: "#a78bfa" }}
                />
                <button
                  onClick={() => copyToClipboard(webhookFullUrl, setCopiedUrl)}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: "90px" }}
                >
                  {copiedUrl ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  <span>{copiedUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Verify Token */}
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", marginBottom: "6px" }}>
                2. Verify Token
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                Enter this verification token in Meta Developer Portal:
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="input"
                  style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "12px", color: "#34d399" }}
                />
                <button
                  onClick={() => copyToClipboard(verifyToken, setCopiedToken)}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: "90px" }}
                >
                  {copiedToken ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  <span>{copiedToken ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Step 3: Webhook Fields */}
            <div style={{ background: "#161616", padding: "16px", borderRadius: "6px", border: "1px solid #262626" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", marginBottom: "4px" }}>
                3. Webhook Subscriptions
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                Under Webhook Fields in Meta, click <strong>Manage</strong> and check the <code>messages</code> subscription.
              </p>
              <div style={{ fontSize: "11px", color: "#8696a0", lineHeight: 1.5 }}>
                That's it! Any message sent to your WhatsApp Business number will immediately trigger FlowForge AI's Customer Support workflow, execute knowledge policy retrieval, and reply to your customer in seconds.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
