import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Enterprise React Error Boundary.
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep error logged to console for debugging
    console.error("FlowForge Caught Error Boundary Exception:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "var(--main-bg, #090d16)",
            color: "var(--text-main, #f1f5f9)",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "var(--surface-card, #111827)",
              border: "1px solid var(--border-light, #1f293d)",
              borderRadius: "12px",
              padding: "clamp(20px, 4vw, 32px)",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.5)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--status-danger-bg, rgba(239, 68, 68, 0.12))",
                color: "var(--status-danger-text, #ef4444)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                margin: "0 0 8px 0",
                color: "var(--text-main, #f1f5f9)",
              }}
            >
              Unable to Render Component
            </h2>

            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--text-muted, #94a3b8)",
                margin: "0 0 20px 0",
              }}
            >
              An unexpected error occurred while loading this view. You can reload the page or return to the dashboard.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: "var(--surface-subtle, #0d121f)",
                  border: "1px solid var(--border-dark, #1f2937)",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--status-danger-text, #f87171)",
                  textAlign: "left",
                  marginBottom: "20px",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "120px",
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary btn-sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn btn-secondary btn-sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Home size={14} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
