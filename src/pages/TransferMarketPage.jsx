import Navbar from "../components/Navbar";

export default function TransferMarketPage() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Transfer Market" />
      <div style={{ maxWidth: "700px", margin: "60px auto", padding: "0 16px", textAlign: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "24px", padding: "48px 36px" }}>
          <span style={{ fontSize: "4rem" }}>💸</span>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "16px 0 8px" }}>Transfer Market</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>Player transfers and market activity coming soon.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {["🔴 Listed", "🟢 Sold", "🔵 Pending"].map(label => (
              <div key={label} style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", padding: "24px 16px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{label.split(" ")[0]}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>{label.substring(2)}</div>
                <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginTop: "8px" }}>0</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
