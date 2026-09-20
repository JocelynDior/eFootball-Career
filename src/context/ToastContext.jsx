import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback so a stray import outside the provider doesn't crash the app
    return { showToast: (msg) => alert(msg) };
  }
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 10, zIndex: 999999,
        alignItems: "center", width: "min(92vw, 480px)",
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              width: "100%", cursor: "pointer",
              background: t.type === "error" ? "rgba(60,0,0,0.95)" : t.type === "success" ? "rgba(0,40,10,0.95)" : "rgba(20,20,30,0.95)",
              border: `1px solid ${t.type === "error" ? "rgba(255,80,80,0.5)" : t.type === "success" ? "rgba(80,255,150,0.5)" : "rgba(255,20,147,0.4)"}`,
              color: "#fff", padding: "12px 18px", borderRadius: 14,
              fontSize: "0.9rem", fontFamily: "'Inter', sans-serif",
              boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
              display: "flex", alignItems: "center", gap: 10,
              animation: "toastIn 0.25s ease-out",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>
              {t.type === "error" ? "❌" : t.type === "success" ? "✅" : "ℹ️"}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
