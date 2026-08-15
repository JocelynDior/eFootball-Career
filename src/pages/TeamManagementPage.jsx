import Navbar from "../components/Navbar";

export default function TeamManagementPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Team Management" />
      <div style={{ maxWidth: "700px", margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "24px", padding: "48px 36px" }}>
          <span style={{ fontSize: "4rem" }}>🛠️</span>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "16px 0 8px" }}>Team Management</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>Manage your squad, tactics and lineups. Coming soon.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[["📋", "Squad", "View & edit players"], ["⚽", "Tactics", "Set formations"], ["📊", "Stats", "Team performance"], ["🏟️", "Stadium", "Home ground info"]].map(([icon, label, desc]) => (
              <div key={label} style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "24px 16px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{icon}</div>
                <div style={{ color: "#fff", fontWeight: 700, marginBottom: "4px" }}>{label}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
