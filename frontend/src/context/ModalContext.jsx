import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalState({
        type: "confirm",
        title,
        message,
        confirmText,
        cancelText,
        variant,
      });
    });
  }, []);

  const alert = useCallback(({
    title = "Notice",
    message = "",
    confirmText = "OK",
    variant = "info",
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalState({
        type: "alert",
        title,
        message,
        confirmText,
        variant,
      });
    });
  }, []);

  const prompt = useCallback(({
    title = "Input Required",
    message = "Please enter a value:",
    defaultValue = "",
    placeholder = "",
    confirmText = "Submit",
    cancelText = "Cancel",
  }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModalState({
        type: "prompt",
        title,
        message,
        inputValue: defaultValue,
        placeholder,
        confirmText,
        cancelText,
      });
    });
  }, []);

  const handleClose = useCallback((resultValue) => {
    if (resolveRef.current) {
      resolveRef.current(resultValue);
      resolveRef.current = null;
    }
    setModalState(null);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modalState) {
        handleClose(modalState.type === "confirm" ? false : null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalState, handleClose]);

  const renderIcon = () => {
    if (!modalState) return null;
    const v = modalState.variant || (modalState.type === "prompt" ? "info" : "info");
    if (v === "danger") return <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />;
    if (v === "warning") return <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />;
    if (v === "success") return <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />;
    return <Info size={18} color="#a78bfa" style={{ flexShrink: 0 }} />;
  };

  return (
    <ModalContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      {modalState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={() => handleClose(modalState.type === "confirm" ? false : null)}
        >
          <div
            style={{
              width: "min(460px, 94vw)",
              background: "#161616",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
              padding: "20px",
              position: "relative",
              color: "#f5f5f5",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {renderIcon()}
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#f5f5f5" }}>
                  {modalState.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleClose(modalState.type === "confirm" ? false : null)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#737373",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
              >
                <X size={15} />
              </button>
            </div>

            {/* Message Body */}
            {modalState.message && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#a3a3a3",
                  lineHeight: 1.5,
                  margin: "0 0 16px 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {modalState.message}
              </p>
            )}

            {/* Prompt Input Field */}
            {modalState.type === "prompt" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleClose(modalState.inputValue);
                }}
                style={{ marginBottom: "16px" }}
              >
                <input
                  type="text"
                  autoFocus
                  placeholder={modalState.placeholder}
                  value={modalState.inputValue}
                  onChange={(e) => setModalState((prev) => ({ ...prev, inputValue: e.target.value }))}
                  className="input"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#111111",
                    border: "1px solid #333333",
                    borderRadius: "6px",
                    color: "#f5f5f5",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </form>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {modalState.type !== "alert" && (
                <button
                  type="button"
                  onClick={() => handleClose(modalState.type === "confirm" ? false : null)}
                  className="btn btn-secondary btn-sm"
                  style={{ minWidth: "70px" }}
                >
                  {modalState.cancelText || "Cancel"}
                </button>
              )}
              <button
                type="button"
                autoFocus={modalState.type !== "prompt"}
                onClick={() => {
                  if (modalState.type === "prompt") {
                    handleClose(modalState.inputValue);
                  } else if (modalState.type === "confirm") {
                    handleClose(true);
                  } else {
                    handleClose(undefined);
                  }
                }}
                className={
                  modalState.variant === "danger"
                    ? "btn btn-danger btn-sm"
                    : "btn btn-primary btn-sm"
                }
                style={{
                  minWidth: "70px",
                  background: modalState.variant === "danger" ? "#dc2626" : undefined,
                  borderColor: modalState.variant === "danger" ? "#ef4444" : undefined,
                }}
              >
                {modalState.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
