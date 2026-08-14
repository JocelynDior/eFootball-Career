import { formatDate } from "../utils/formatters";

export default function FixturesList({ fixtures, teamIconsCache = {} }) {
  const grouped = {};
  for (const f of fixtures) {
    if (!grouped[f.date]) grouped[f.date] = [];
    grouped[f.date].push(f);
  }
  const sortedDates = Object.keys(grouped).sort();

  if (!sortedDates.length) {
    return <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.4)" }}>No fixtures found.</div>;
  }

  return (
    <div>
      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: "28px" }}>
          <div style={{
            display: "inline-block", padding: "6px 18px", marginBottom: "12px",
            background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)",
            borderRadius: "30px", color: "#FF1493", fontSize: "0.8rem", fontWeight: 700,
            letterSpacing: "1px", textTransform: "uppercase"
          }}>📅 {formatDate(date)}</div>
          {grouped[date].map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,20,147,0.15)", borderRadius: "16px",
              padding: "20px 24px", marginBottom: "10px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px"
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, textAlign: "center" }}>
                {teamIconsCache[f.home] && <img src={teamIconsCache[f.home]} alt="" style={{ width: "40px", height: "40px", objectFit: "contain" }} />}
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{f.home}</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "4px" }}>VS</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, textAlign: "center" }}>
                {teamIconsCache[f.away] && <img src={teamIconsCache[f.away]} alt="" style={{ width: "40px", height: "40px", objectFit: "contain" }} />}
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{f.away}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
