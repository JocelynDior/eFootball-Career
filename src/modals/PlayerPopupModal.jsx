import { useState, useEffect, useRef } from "react";
import { useAdmin } from "../context/AdminContext";
import { getClubColors } from "../utils/groq";
import RequestBuyModal from "./RequestBuyModal";
import RequestLoanModal from "./RequestLoanModal";
import AuctionBidModal from "./AuctionBidModal";

function ShirtSVG({ clubName, playerName, squadNumber }) {
  const colors = getClubColors(clubName);
  const num = squadNumber || "?";
  const nameParts = (playerName || "").toUpperCase().split(" ");
  const displayName = nameParts[nameParts.length - 1] || playerName?.toUpperCase() || "";

  return (
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", maxWidth: "200px" }}>
      <defs>
        <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="shirtShine" x1="0%" y1="0%" x2="30%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" stopOpacity="1" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="0" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      <path d="M 50 40 L 20 70 L 45 80 L 45 190 L 155 190 L 155 80 L 180 70 L 150 40 Q 130 30 115 38 Q 100 55 85 38 Q 70 30 50 40 Z"
        fill="url(#shirtGrad)" filter="url(#shadow)" />
      <path d="M 50 40 L 20 70 L 45 80 L 45 190 L 155 190 L 155 80 L 180 70 L 150 40 Q 130 30 115 38 Q 100 55 85 38 Q 70 30 50 40 Z"
        fill="url(#shirtShine)" />
      <path d="M 85 38 Q 100 55 115 38" fill="none" stroke={colors.secondary === "#fff" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"} strokeWidth="3" />
      <text x="100" y="135" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif"
        fontSize="52" fontWeight="900" fill={colors.text} opacity="0.95">
        {num}
      </text>
      <text x="100" y="175" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif"
        fontSize="14" fontWeight="700" fill={colors.text} opacity="0.85" letterSpacing="2">
        {displayName.length > 10 ? displayName.slice(0, 10) + "…" : displayName}
      </text>
      <line x1="55" y1="60" x2="75" y2="185" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />
    </svg>
  );
}

export default function PlayerPopupModal({ player, playerId, playerTab, teamIcons, onClose }) {
  const { manager, isAdmin } = useAdmin();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [innerModal, setInnerModal] = useState(null);
  const videoRef = useRef(null);
  const isAuction = playerTab === "auction";

  useEffect(() => {
    if (!player.videoUrl) return;
    const vid = videoRef.current;
    if (!vid) return;
    function onCanPlayThrough() {
      setVideoReady(true);
      setTimeout(() => setShowVideo(true), 400);
    }
    vid.addEventListener("canplaythrough", onCanPlayThrough);
    vid.load();
    return () => vid.removeEventListener("canplaythrough", onCanPlayThrough);
  }, [player.videoUrl]);

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [showVideo]);

  const clubLogo = teamIcons?.[player.club];

  const stats = [
    { label: "Nationality", value: player.nationality },
    { label: "Age", value: player.age },
    { label: "Position", value: player.position },
    { label: "Contract Term", value: player.contractEnd ? `Until ${player.contractEnd}` : player.contractLength ? `${player.contractLength} month(s)` : "—" },
    { label: "Weekly Wage", value: player.weeklyWage },
    { label: "Mood", value: "😶" },
  ];

  if (innerModal === "buy") return <RequestBuyModal player={player} playerTab={playerTab} playerId={playerId} onClose={() => setInnerModal(null)} />;
  if (innerModal === "loan") return <RequestLoanModal player={player} playerTab={playerTab} playerId={playerId} onClose={() => setInnerModal(null)} />;
  if (innerModal === "auction") return <AuctionBidModal player={player} playerId={playerId} onClose={() => setInnerModal(null)} />;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "16px", overflow: "hidden", marginBottom: "20px", background: "rgba(0,0,0,0.4)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: showVideo ? 0 : 1, transition: "opacity 0.8s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {player.imageUrl ? (
            <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px" }}>
              <ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} />
            </div>
          )}
        </div>
        {player.videoUrl && (
          <video ref={videoRef} muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: showVideo ? 1 : 0, transition: "opacity 0.8s ease" }}>
            <source src={player.videoUrl} type="video/mp4" />
          </video>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,20,0.85), transparent)", pointerEvents: "none" }} />
        {player.videoUrl && !videoReady && (
          <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.6)", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
            ⏳ Loading video...
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Player Value</div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", textShadow: "0 0 20px rgba(255,20,147,0.5)" }}>
          {player.value || player.price || "—"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
        {clubLogo ? (
          <img src={clubLogo} alt={player.club} style={{ width: "36px", height: "36px", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "36px", height: "36px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>⚽</div>
        )}
        <span style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>{player.club}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", marginBottom: "24px", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "16px", overflow: "hidden" }}>
        {stats.map(({ label, value }, i) => (
          <div key={label} style={{ padding: "14px 16px", background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,20,147,0.04)", borderBottom: i < stats.length - 2 ? "1px solid rgba(255,20,147,0.1)" : "none", borderRight: i % 2 === 0 ? "1px solid rgba(255,20,147,0.1)" : "none" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: label === "Mood" ? "1.5rem" : "0.95rem" }}>{value || "—"}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "24px" }}>
        {[
          { label: "Overall", value: player.overall },
          { label: "Squad #", value: player.squadNumber ? `#${player.squadNumber}` : "—" },
          { label: "Foot", value: player.preferredFoot },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem" }}>{value || "—"}</div>
          </div>
        ))}
      </div>

      {playerTab !== "signings" && (
        <div style={{ display: "flex", gap: "12px" }}>
          {isAuction ? (
            <button onClick={() => setInnerModal("auction")} style={{ flex: 1, padding: "16px", background: "linear-gradient(135deg, #FF1493, #ff69b4)", border: "none", borderRadius: "14px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px", cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>🔨 PLACE BID</button>
          ) : (
            <>
              <button onClick={() => setInnerModal("buy")} style={{ flex: 1, padding: "16px", background: "linear-gradient(135deg, #FF1493, #cc0077)", border: "none", borderRadius: "14px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "2px", cursor: "pointer", boxShadow: "0 4px 20px rgba(255,20,147,0.4)" }}>🛒 REQUEST BUY</button>
              <button onClick={() => setInnerModal("loan")} style={{ flex: 1, padding: "16px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "14px", color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", letterSpacing: "2px", cursor: "pointer" }}>🔄 REQUEST LOAN</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
