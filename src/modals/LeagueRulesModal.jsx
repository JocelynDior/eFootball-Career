export default function LeagueRulesModal({ league, onClose }) {
  const rules = [
    { icon: "⚽", title: "Match Play", desc: "All matches must be played within the scheduled matchday window. Results must be submitted within 24 hours." },
    { icon: "🚫", title: "Forfeits", desc: "A team that fails to show up will receive an F-0 loss. Repeated forfeits may result in removal from the league." },
    { icon: "📊", title: "Points System", desc: "Win = 3 pts, Draw = 1 pt, Loss = 0 pts. Goal difference is the first tiebreaker." },
    { icon: "🔑", title: "Manager Keys", desc: "Each manager is assigned a unique key. Keep it private. Sharing keys may result in a ban." },
    { icon: "⏱️", title: "Daily Limit", desc: "Managers may submit up to 3 results per day. This resets at midnight SAST." },
    { icon: "🏆", title: "Fair Play", desc: "Any form of cheating, result manipulation, or unsportsmanlike conduct will result in immediate disqualification." },
  ];

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: "6px" }}>📜 League Rules</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>{league}</p>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: "flex", gap: "16px", padding: "16px 0", borderBottom: "1px solid rgba(255,20,147,0.1)" }}>
          <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{rule.icon}</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, marginBottom: "4px" }}>{rule.title}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem", lineHeight: 1.5 }}>{rule.desc}</div>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ width: "100%", marginTop: "20px", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
