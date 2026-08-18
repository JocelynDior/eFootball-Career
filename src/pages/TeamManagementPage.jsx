import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";

const TABS = [
  { id: "stadium", label: "STADIUM" },
  { id: "squad", label: "SQUAD" },
  { id: "transfers", label: "TRANSFERS" },
  { id: "income", label: "INCOME" },
];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

function formatBalance(num) {
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${num?.toLocaleString() || "0"}`;
}

function ComingSoonPanel({ tab }) {
  const icons = { stadium: "🏟️", squad: "👥", transfers: "💸", income: "📈" };
  const labels = { stadium: "Stadium", squad: "Squad", transfers: "Transfers", income: "Income" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>{icons[tab]}</div>
      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: "4px", color: "#FF1493", margin: "0 0 10px", textShadow: "0 0 30px rgba(255,20,147,0.4)" }}>
        {labels[tab]}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", margin: 0 }}>Coming Soon</p>
    </div>
  );
}

export default function TeamManagementPage() {
  const { manager, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("stadium");
  const [balance, setBalance] = useState(1_000_000_000);
  const [teamIcon, setTeamIcon] = useState(null);

  useEffect(() => {
    if (!manager?.uid) return;
    const unsub = onValue(ref(db, `${PATHS.accounts}/${manager.uid}`), snap => {
      const data = snap.val();
      if (data && typeof data.balance === "number") setBalance(data.balance);
    });
    return () => unsub();
  }, [manager?.uid]);

  useEffect(() => {
    if (!manager?.team) return;
    const icon = teamIconsCache?.[manager.team];
    if (icon) setTeamIcon(icon);
  }, [manager?.team, teamIconsCache]);

  if (!manager) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
        <BackgroundVideo />
        <Navbar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px 36px", maxWidth: "480px", width: "100%" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>🔒</div>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#FF1493", margin: "0 0 10px" }}>Manager Login Required</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: 0 }}>Sign in as a manager to access your team dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />
      <div style={{ padding: "32px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "100px", height: "100px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {teamIcon ? (
              <img src={teamIcon} alt={manager.team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))" }} />
            ) : (
              <div style={{ width: "100px", height: "100px", background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>🏟️</div>
            )}
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "5px", color: "#fff", margin: "0 0 6px", textShadow: "0 0 30px rgba(255,255,255,0.1)" }}>
            {manager.team || "No Club Assigned"}
          </h1>
          <div style={{ marginTop: "12px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>Transfer Budget</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 7vw, 4.5rem)", letterSpacing: "4px", background: "linear-gradient(135deg, #FF1493, #ff69b4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textShadow: "none", lineHeight: 1, filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))" }}>
              {formatBalance(balance)}
            </div>
          </div>
        </div>
        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "28px" }} />
        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        </div>
        <div style={{ ...GLASS, borderRadius: "20px", minHeight: "300px" }}>
          <ComingSoonPanel tab={tab} />
        </div>
      </div>
    </div>
  );
}
