import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        background: "#000020", color: "#fff", fontFamily: "'Inter', sans-serif",
        padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: 2, color: "#FF1493", margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 480, fontSize: "0.95rem" }}>
          This page hit an unexpected error. Reloading usually fixes it. If it keeps happening,
          let the admin know what you were doing when it broke.
        </p>
        {this.state.error?.message && (
          <code style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.25)",
            borderRadius: 10, padding: "10px 16px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)",
            maxWidth: "90vw", overflowX: "auto", whiteSpace: "pre-wrap",
          }}>
            {this.state.error.message}
          </code>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#FF1493", border: "none", color: "#fff", fontWeight: 700,
            padding: "14px 32px", borderRadius: 30, cursor: "pointer", fontSize: "1rem",
            fontFamily: "inherit", marginTop: 8,
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }
}
