import Navbar from "../components/Navbar";

export default function CreateAccountPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Create Account" />
      <div style={{ maxWidth: "500px", margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "24px", padding: "48px 36px" }}>
          <span style={{ fontSize: "4rem" }}>👤</span>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "16px 0 8px" }}>Create Account</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>Account creation coming soon.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {["Username", "Email", "Password"].map(f => (
              <input key={f} disabled placeholder={f} style={{ width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px", color: "rgba(255,255,255,0.3)", fontFamily: "inherit", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
            ))}
            <button disabled style={{ padding: "14px", background: "rgba(255,20,147,0.3)", border: "none", borderRadius: "14px", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "0.95rem", cursor: "not-allowed" }}>Coming Soon</button>
          </div>
        </div>
      </div>
    </div>
  );
}
