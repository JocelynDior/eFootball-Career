import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ManagerRankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.rankings), snap => {
      const d = snap.val();
      if (d) {
        const arr = Object.entries(d).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => (b.pts || 0) - (a.pts || 0));
        setRankings(arr);
      } else setRankings([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #000033 0%, #000020 100%)", fontFamily: "'Inter', sans-serif" }}>
      <Navbar title="Manager Rankings" />
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "3rem" }}>📊</span>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "12px 0 4px" }}>Manager Rankings</h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>Overall career performance</p>
        </div>
        {loading ? <LoadingSpinner /> : !rankings.length ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "60px 20px" }}>No rankings yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {rankings.map((m, i) => (
              <div key={m.id} style={{
                background: i < 3 ? "rgba(255,20,147,0.12)" : "rgba(255,255,255,0.04)",
                backdropFilter: "blur(16px)", border: `1px solid ${i < 3 ? "rgba(255,20,147,0.4)" : "rgba(255,20,147,0.15)"}`,
                borderRadius: "18px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px"
              }}>
                <div style={{ fontSize: i < 3 ? "2rem" : "1rem", fontWeight: 700, color: "#FF1493", minWidth: "40px", textAlign: "center" }}>{i < 3 ? medals[i] : i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{m.managerName || m.teamName}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>{m.teamName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", lineHeight: 1 }}>{m.pts || 0}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>PTS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
