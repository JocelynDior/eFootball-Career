import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, update, get, remove, set } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import Modal from "../components/Modal";
import CountdownSlideshow from "../components/CountdownSlideshow";
import PlayerPopupModal from "../modals/PlayerPopupModal";
import AddPlayerModal from "../modals/AddPlayerModal";
import BuySellModal from "../modals/BuySell";
import AuctionBidModal from "../modals/AuctionBidModal";
import { getClubColors } from "../utils/groq";

const TABS = [
  { id: "topTargets", label: "TOP TARGETS" },
  { id: "signings", label: "SIGNINGS" },
  { id: "auction", label: "AUCTION" },
  { id: "negotiations", label: "NEGOTIATIONS" },
];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const inputStyle = {
  padding: "20px 24px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "14px",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "1.2rem",
  outline: "none",
};

function formatAmt(n) {
  if (!n && n !== 0) return "€0";
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${Number(n).toLocaleString()}`;
}

function parseRaw(str) {
  if (!str && str !== 0) return 0;
  return Number(String(str).replace(/[^0-9.]/g, "")) || 0;
}

function formatTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${date} · ${time}`;
}

function ShirtSVG({ clubName, playerName, squadNumber }) {
  const colors = getClubColors(clubName);
  const num = squadNumber || "?";
  const nameParts = (playerName || "").toUpperCase().split(" ");
  const displayName = nameParts[nameParts.length - 1] || "";
  return (
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id={`sg-${num}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M 50 40 L 20 70 L 45 80 L 45 190 L 155 190 L 155 80 L 180 70 L 150 40 Q 130 30 115 38 Q 100 55 85 38 Q 70 30 50 40 Z"
        fill={`url(#sg-${num})`} />
      <text x="100" y="135" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif"
        fontSize="52" fontWeight="900" fill={colors.text} opacity="0.95">{num}</text>
      <text x="100" y="172" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif"
        fontSize="13" fontWeight="700" fill={colors.text} opacity="0.8" letterSpacing="2">
        {displayName.length > 10 ? displayName.slice(0, 10) + "…" : displayName}
      </text>
    </svg>
  );
}

function PlayerGridCard({ player, teamIcons, onClick }) {
  const clubLogo = teamIcons?.[player.club];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.18)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column" }}
      onClick={onClick}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {player.imageUrl ? (
          <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "70%", height: "70%" }}>
            <ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} />
          </div>
        )}
        {player.overall && (
          <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(255,20,147,0.9)", borderRadius: "8px", padding: "4px 10px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "1px" }}>
            OVR {player.overall}
          </div>
        )}
        {player.listedBy && (
          <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.7)", borderRadius: "8px", padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700 }}>
            {player.listedBy}
          </div>
        )}
        {clubLogo && (
          <img src={clubLogo} alt="" style={{ position: "absolute", bottom: "8px", right: "8px", width: "32px", height: "32px", objectFit: "contain", opacity: 0.85 }} />
        )}
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{player.club}</div>
        {player.position && (
          <div style={{ display: "inline-block", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "6px", padding: "2px 8px", color: "#fff", fontSize: "0.75rem", fontWeight: 700, width: "fit-content" }}>{player.position}</div>
        )}
        {(player.value || player.price) && (
          <div style={{ marginTop: "auto", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", letterSpacing: "1px" }}>{player.value || player.price}</div>
        )}
      </div>
    </div>
  );
}

function AuctionGridCard({ player, bidCount, onClick }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column" }}
      onClick={onClick}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,170,0,0.08)"; e.currentTarget.style.borderColor = "rgba(255,170,0,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,170,0,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {player.imageUrl ? (
          <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "70%", height: "70%" }}>
            <ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} />
          </div>
        )}
        {player.overall && (
          <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(255,170,0,0.9)", borderRadius: "8px", padding: "4px 10px", color: "#000", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "1px" }}>
            OVR {player.overall}
          </div>
        )}
        <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.8)", borderRadius: "8px", padding: "4px 10px", color: "#ffaa44", fontSize: "0.8rem", fontWeight: 700 }}>
          🏷 {bidCount} bid{bidCount !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>{player.name}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>{player.club}</div>
        {player.startingBid && (
          <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem" }}>Starting: {player.startingBid}</div>
        )}
      </div>
    </div>
  );
}

function NewAuctionCard({ onClick }) {
  return (
    <div style={{ background: "rgba(255,170,0,0.04)", border: "2px dashed rgba(255,170,0,0.3)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "280px", gap: "12px" }}
      onClick={onClick}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,170,0,0.08)"; e.currentTarget.style.borderColor = "rgba(255,170,0,0.6)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,170,0,0.04)"; e.currentTarget.style.borderColor = "rgba(255,170,0,0.3)"; }}
    >
      <div style={{ fontSize: "3rem" }}>🏷️</div>
      <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px" }}>NEW AUCTION</div>
    </div>
  );
}

function NewAuctionModal({ manager, onClose }) {
  const [name, setName] = useState("");
  const [club, setClub] = useState(manager?.team || "");
  const [position, setPosition] = useState("");
  const [overall, setOverall] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name) return;
    setSaving(true);
    try {
      await push(ref(db, `${PATHS.transfers}/auction`), {
        name, club, position, overall, startingBid, imageUrl,
        listedBy: manager?.username || "Admin",
        createdAt: Date.now(), settled: false,
      });
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", marginBottom: "20px" }}>🏷️ NEW AUCTION</div>
      {[["Player Name", name, setName, "text"], ["Club", club, setClub, "text"], ["Position", position, setPosition, "text"], ["Overall", overall, setOverall, "number"], ["Starting Bid", startingBid, setStartingBid, "text"], ["Image URL", imageUrl, setImageUrl, "text"]].map(([label, val, setter, type]) => (
        <div key={label} style={{ marginBottom: "14px" }}>
          <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</label>
          <input type={type} value={val} onChange={e => setter(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
        </div>
      ))}
      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <button onClick={handleSave} disabled={saving || !name} style={{ flex: 2, padding: "18px", background: "#ffaa44", border: "none", borderRadius: "14px", color: "#000", fontWeight: 700, fontSize: "1.1rem", cursor: saving || !name ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "✅ List for Auction"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function AuctionDeadlineModal({ onClose }) {
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentLabel, setCurrentLabel] = useState("None set");

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/auctionDeadline`), snap => {
      const val = snap.val();
      if (val) {
        const d = new Date(val);
        setCurrentLabel(d.toLocaleString());
        setDateStr(d.toISOString().split("T")[0]);
        setTimeStr(d.toTimeString().slice(0, 5));
      }
    });
    return () => unsub();
  }, []);

  async function handleSave() {
    if (!dateStr) return;
    setSaving(true);
    const ts = new Date(`${dateStr}T${timeStr || "00:00"}`).getTime();
    const label = new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    try {
      await set(ref(db, `${PATHS.globalSettings}/auctionDeadline`), ts);
      await push(ref(db, `${PATHS.globalSettings}/transferCountdowns`), { label: `Auction Deadline · ${label}`, deadline: ts });
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleReset() {
    setSaving(true);
    try { await set(ref(db, `${PATHS.globalSettings}/auctionDeadline`), null); setCurrentLabel("None set"); setDateStr(""); setTimeStr(""); }
    catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "440px", margin: "0 auto" }}>
      <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", marginBottom: "6px" }}>⏰ AUCTION DEADLINE</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginBottom: "24px" }}>Current: <span style={{ color: "#fff", fontWeight: 700 }}>{currentLabel}</span></div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Date</label>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", colorScheme: "dark" }} />
      </div>
      <div style={{ marginBottom: "24px" }}>
        <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Time</label>
        <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", colorScheme: "dark" }} />
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving || !dateStr} style={{ flex: 2, padding: "18px", background: "#ffaa44", border: "none", borderRadius: "14px", color: "#000", fontWeight: 700, fontSize: "1.1rem", cursor: saving || !dateStr ? "not-allowed" : "pointer" }}>
          {saving ? "Saving..." : "✅ Set Deadline"}
        </button>
        <button onClick={handleReset} disabled={saving} style={{ flex: 1, padding: "18px", background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.3)", borderRadius: "14px", color: "#ff6b6b", fontWeight: 700, cursor: "pointer" }}>🗑️ Reset</button>
        <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function NegotiationCard({ offer, isOwn, isAdmin, manager }) {
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b", cancelled: "#aaaaaa" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showReview, setShowReview] = useState(false);

  const isReceived = !isOwn && manager && (offer.toClub === manager.team || offer.playerClub === manager.team) && offer.fromClub !== manager.team;
  const canAct = isAdmin || isReceived;

  async function handleAccept() {
    setProcessing(true); setActionError("");
    try {
      const amt = Number((offer.offerAmount || offer.loanAmount || offer.bidAmount || "0").replace(/[^0-9.]/g, ""));
      const now = new Date();
      const monthIndex = now.getMonth();
      const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthIndex];
      const year = now.getFullYear();
      const buyingClub = offer.fromClub;
      const sellingClub = offer.toClub || offer.playerClub;

      if (buyingClub && amt > 0) {
        await push(ref(db, `career_team_management/${buyingClub}/finance/transactions`), {
          type: "expense", category: "Player Purchase", source: offer.playerName, amount: amt, month: monthName, monthIndex, year, createdAt: Date.now(),
        });
      }
      if (sellingClub && amt > 0) {
        await push(ref(db, `career_team_management/${sellingClub}/finance/transactions`), {
          type: "income", category: "Player Sales", source: offer.playerName, amount: amt, month: monthName, monthIndex, year, createdAt: Date.now(),
        });
      }

      const playerName = offer.playerName;
      const lendingClub = sellingClub;
      const borrowingClub = buyingClub;

      if (offer.type === "buy") {
        const sellingSnap = await get(ref(db, `career_team_management/${lendingClub}/squad`));
        const sellingData = sellingSnap.val();
        if (sellingData) {
          for (const [key, p] of Object.entries(sellingData)) {
            if (p.name === playerName) {
              await remove(ref(db, `career_team_management/${lendingClub}/squad/${key}`));
              const { loanStatus, loanClub, loanFrom, ...cleanPlayer } = p;
              await push(ref(db, `career_team_management/${borrowingClub}/squad`), cleanPlayer);
              break;
            }
          }
        }
      } else if (offer.type === "loan") {
        const sellingSnap = await get(ref(db, `career_team_management/${lendingClub}/squad`));
        const sellingData = sellingSnap.val();
        if (sellingData) {
          for (const [key, p] of Object.entries(sellingData)) {
            if (p.name === playerName) {
              await update(ref(db, `career_team_management/${lendingClub}/squad/${key}`), { role: "reserve", loanStatus: "out", loanClub: borrowingClub });
              const { loanStatus, loanClub, loanFrom, ...cleanPlayer } = p;
              await push(ref(db, `career_team_management/${borrowingClub}/squad`), { ...cleanPlayer, role: "reserve", loanStatus: "in", loanFrom: lendingClub });
              break;
            }
          }
        }
      }
      await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "accepted" });
    } catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  async function handleDecline() {
    setProcessing(true); setActionError("");
    try { await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "rejected" }); }
    catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  async function handleCancel() {
    setProcessing(true); setActionError("");
    try { await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "cancelled" }); }
    catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  const timestamp = formatTimestamp(offer.createdAt);

  return (
    <div style={{ padding: "24px 28px", background: isOwn ? "rgba(255,20,147,0.1)" : isReceived ? "rgba(0,200,100,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOwn ? "rgba(255,20,147,0.4)" : isReceived ? "rgba(0,200,100,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "20px", marginBottom: "14px" }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>{offer.playerName}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginTop: "4px" }}>{offer.playerClub}</div>
          {/* Timestamp */}
          {timestamp && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", marginTop: "6px", fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.5px" }}>
              🕐 {timestamp}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ background: offer.type === "buy" ? "rgba(255,20,147,0.2)" : offer.type === "loan" ? "rgba(0,150,255,0.2)" : "rgba(255,170,0,0.2)", color: offer.type === "buy" ? "#FF1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44", padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
          <span style={{ background: `${statusColor}22`, color: statusColor, padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
          {isOwn && <span style={{ background: "rgba(255,20,147,0.15)", color: "#FF1493", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>YOUR OFFER</span>}
          {isReceived && offer.status === "pending" && <span style={{ background: "rgba(0,200,100,0.15)", color: "#00cc66", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>INCOMING</span>}
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          ["From", offer.fromClub || offer.fromManagerName],
          [offer.type === "auction" ? "Bid" : offer.type === "loan" ? "Loan Fee" : "Offer", offer.offerAmount || offer.loanAmount || offer.bidAmount],
          offer.contractLength && ["Contract", offer.contractLength],
          offer.loanTerm && ["Loan Term", offer.loanTerm],
          offer.buyOptionClause && ["Buy Option", offer.buyOptionClause],
        ].filter(Boolean).map(([label, value]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 16px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{value || "—"}</div>
          </div>
        ))}
      </div>

      {/* SENT OFFER — Cancel + Review */}
      {isOwn && offer.status === "pending" && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button onClick={handleCancel} disabled={processing} style={{ flex: 1, padding: "12px", background: "rgba(170,170,170,0.12)", border: "1px solid rgba(170,170,170,0.4)", borderRadius: "12px", color: "#aaa", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            {processing ? "Cancelling..." : "🚫 Cancel Offer"}
          </button>
          <button onClick={() => setShowReview(v => !v)} style={{ flex: 1, padding: "12px", background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.35)", borderRadius: "12px", color: "#ffaa44", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
            {showReview ? "🔼 Hide Details" : "👁 Review Offer"}
          </button>
        </div>
      )}

      {/* Review panel for sent offer */}
      {isOwn && showReview && (
        <div style={{ marginTop: "14px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "14px", padding: "16px" }}>
          <div style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.85rem", letterSpacing: "2px", marginBottom: "10px" }}>OFFER DETAILS</div>
          {[
            ["Player", offer.playerName],
            ["To Club", offer.toClub || offer.playerClub],
            ["Offer Amount", offer.offerAmount || offer.loanAmount || offer.bidAmount],
            offer.contractLength && ["Contract Length", offer.contractLength],
            offer.loanTerm && ["Loan Term", offer.loanTerm],
            offer.buyOptionClause && ["Buy Option Clause", offer.buyOptionClause],
            ["Status", offer.status?.toUpperCase()],
            ["Submitted", timestamp],
          ].filter(Boolean).map(([label, value]) => value && (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>{label}</span>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* RECEIVED OFFER — Accept + Decline */}
      {canAct && offer.status === "pending" && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button onClick={handleAccept} disabled={processing} style={{ flex: 1, padding: "12px", background: processing ? "rgba(0,204,102,0.2)" : "#00cc66", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            {processing ? "Processing..." : "✅ Accept"}
          </button>
          <button onClick={handleDecline} disabled={processing} style={{ flex: 1, padding: "12px", background: processing ? "rgba(255,68,68,0.2)" : "rgba(255,68,68,0.8)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            ❌ Decline
          </button>
        </div>
      )}

      {actionError && <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginTop: "10px", padding: "10px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{actionError}</div>}
    </div>
  );
}

export default function TransferMarketPage() {
  const { isAdmin, manager, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("topTargets");
  const [players, setPlayers] = useState({});
  const [auctionBids, setAuctionBids] = useState({});
  const [negotiations, setNegotiations] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [headlineVideo, setHeadlineVideo] = useState("");
  const [teamIcons, setTeamIcons] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [buySellMode, setBuySellMode] = useState("buy");
  const [showNewAuction, setShowNewAuction] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const tabs = ["topTargets", "signings", "auction"];
    const unsubs = tabs.map(t =>
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        setPlayers(prev => ({ ...prev, [t]: data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [] }));
      })
    );
    const negUnsub = onValue(ref(db, `${PATHS.transfers}/negotiations`), snap => {
      const data = snap.val();
      setNegotiations(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    const cdUnsub = onValue(ref(db, `${PATHS.globalSettings}/transferCountdowns`), snap => {
      const data = snap.val();
      setCountdowns(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    const vidUnsub = onValue(ref(db, `${PATHS.globalSettings}/transferHeadlineVideo`), snap => {
      if (snap.val()) setHeadlineVideo(snap.val());
    });
    const iconsUnsub = onValue(ref(db, `${PATHS.teamIcons}`), snap => {
      if (snap.val()) setTeamIcons(snap.val());
    });
    return () => { unsubs.forEach(u => u()); negUnsub(); cdUnsub(); vidUnsub(); iconsUnsub(); };
  }, []);

  useEffect(() => {
    const auctionPlayers = players.auction || [];
    if (auctionPlayers.length === 0) return;
    const unsubs = auctionPlayers.map(p =>
      onValue(ref(db, `${PATHS.transfers}/auction/${p.id}/bids`), snap => {
        const data = snap.val();
        const bids = data ? Object.values(data) : [];
        const uniqueManagers = [...new Set(bids.map(b => b.fromManagerUid))].length;
        setAuctionBids(prev => ({ ...prev, [p.id]: uniqueManagers }));
      })
    );
    return () => unsubs.forEach(u => u());
  }, [players.auction]);

  const currentTabPlayers = (players[tab] || []).sort((a, b) => {
    const av = Number((a.value || a.price || "").replace(/[^0-9]/g, "") || 0);
    const bv = Number((b.value || b.price || "").replace(/[^0-9]/g, "") || 0);
    return bv - av;
  });

  const visiblePlayers = currentTabPlayers.slice(0, visibleCount);
  const hasMore = currentTabPlayers.length > visibleCount;

  // Split negotiations: received first, then sent, then others
  const sortedNegotiations = [...negotiations].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const receivedOffers = sortedNegotiations.filter(o => !isAdmin && manager && (o.toClub === manager.team || o.playerClub === manager.team) && o.fromClub !== manager.team);
  const sentOffers = sortedNegotiations.filter(o => o.fromManagerUid === manager?.uid);
  const otherOffers = isAdmin ? sortedNegotiations : sortedNegotiations.filter(o => !receivedOffers.includes(o) && !sentOffers.includes(o));

  const mergedIcons = { ...teamIconsCache, ...teamIcons };

  async function handleDeletePlayer(playerId) {
    if (!isAdmin || !tab || tab === "negotiations") return;
    try { await remove(ref(db, `${PATHS.transfers}/${tab}/${playerId}`)); }
    catch (e) { console.error("Delete failed:", e); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar
        extraActions={
          <div style={{ display: "flex", gap: "10px" }}>
            {isAdmin && (
              <>
                <button onClick={() => setShowAddModal(true)} style={{ padding: "10px 18px", background: "#FF1493", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                  ➕ Add Player
                </button>
                <button onClick={() => setShowDeadlineModal(true)} style={{ padding: "10px 18px", background: "rgba(255,170,0,0.15)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "10px", color: "#ffaa44", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                  ⏰ Auction Deadline
                </button>
              </>
            )}
          </div>
        }
      />

      {headlineVideo ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden" }}>
          <video key={headlineVideo} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
            <source src={headlineVideo} type="video/mp4" />
            <source src={headlineVideo} type="video/webm" />
          </video>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.75), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: "20px", left: "20px", color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
            💸 Transfer Window
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px solid rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
          <span style={{ fontSize: "3rem" }}>🎬</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px" }}>Transfer Window Video</span>
        </div>
      )}

      <div style={{ padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={t => { setTab(t); setVisibleCount(12); }} />
        </div>

        {manager && (
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <button onClick={() => { setBuySellMode("buy"); setShowBuySellModal(true); }} style={{ flex: 1, padding: "20px", background: "linear-gradient(135deg, #00cc66, #00994d)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.4rem", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 4px 20px rgba(0,204,102,0.3)", transition: "all 0.3s" }}
              onMouseOver={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; }}>🟢 BUY PLAYER</button>
            <button onClick={() => { setBuySellMode("loan"); setShowBuySellModal(true); }} style={{ flex: 1, padding: "20px", background: "linear-gradient(135deg, #ffaa44, #e68a00)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.4rem", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 4px 20px rgba(255,170,68,0.3)", transition: "all 0.3s" }}
              onMouseOver={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; }}>🟠 LOAN PLAYER</button>
          </div>
        )}

        {countdowns.length > 0 && <CountdownSlideshow countdowns={countdowns} />}

        {tab === "negotiations" ? (
          <div style={{ width: "100%" }}>
            {sortedNegotiations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📋</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Negotiations Yet</div>
              </div>
            ) : isAdmin ? (
              sortedNegotiations.map(offer => (
                <NegotiationCard key={offer.id} offer={offer} isOwn={offer.fromManagerUid === manager?.uid} isAdmin={isAdmin} manager={manager} />
              ))
            ) : (
              <>
                {receivedOffers.length > 0 && (
                  <>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "#00cc66", letterSpacing: "3px", marginBottom: "12px", marginTop: "8px" }}>📥 OFFERS RECEIVED</div>
                    {receivedOffers.map(offer => (
                      <NegotiationCard key={offer.id} offer={offer} isOwn={false} isAdmin={isAdmin} manager={manager} />
                    ))}
                  </>
                )}
                {sentOffers.length > 0 && (
                  <>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "12px", marginTop: receivedOffers.length > 0 ? "24px" : "8px" }}>📤 OFFERS SENT</div>
                    {sentOffers.map(offer => (
                      <NegotiationCard key={offer.id} offer={offer} isOwn={true} isAdmin={isAdmin} manager={manager} />
                    ))}
                  </>
                )}
                {otherOffers.length > 0 && (
                  <>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "rgba(255,255,255,0.4)", letterSpacing: "3px", marginBottom: "12px", marginTop: "24px" }}>📋 OTHER NEGOTIATIONS</div>
                    {otherOffers.map(offer => (
                      <NegotiationCard key={offer.id} offer={offer} isOwn={false} isAdmin={isAdmin} manager={manager} />
                    ))}
                  </>
                )}
                {receivedOffers.length === 0 && sentOffers.length === 0 && otherOffers.length === 0 && (
                  <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📋</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Negotiations Yet</div>
                  </div>
                )}
              </>
            )}
          </div>

        ) : tab === "auction" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", width: "100%" }}>
            <NewAuctionCard onClick={() => setShowNewAuction(true)} />
            {currentTabPlayers.map(player => (
              <div key={player.id} style={{ position: "relative" }}>
                <AuctionGridCard player={player} bidCount={auctionBids[player.id] || 0} onClick={() => { setSelectedAuction(player); setSelectedAuctionId(player.id); }} />
                {isAdmin && (
                  <button onClick={() => handleDeletePlayer(player.id)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(255,0,0,0.8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", zIndex: 10 }}>🗑️</button>
                )}
              </div>
            ))}
          </div>

        ) : (
          currentTabPlayers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚽</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Players Found</div>
              <div style={{ fontSize: "1rem", marginTop: "10px" }}>{isAdmin ? "Use the + button above to add players." : "Check back soon."}</div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", width: "100%" }}>
                {visiblePlayers.map(player => (
                  <div key={player.id} style={{ position: "relative" }}>
                    <PlayerGridCard player={player} teamIcons={mergedIcons} onClick={() => { setSelectedPlayer(player); setSelectedPlayerId(player.id); }} />
                    {isAdmin && (
                      <button onClick={() => handleDeletePlayer(player.id)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(255,0,0,0.8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", zIndex: 10 }}>🗑️</button>
                    )}
                  </div>
                ))}
              </div>
              {hasMore && (
                <div style={{ textAlign: "center", marginTop: "40px" }}>
                  <button onClick={() => setVisibleCount(v => v + 12)} style={{ padding: "20px 60px", background: "rgba(255,20,147,0.12)", border: "2px solid rgba(255,20,147,0.5)", borderRadius: "16px", color: "#FF1493", fontWeight: 800, fontSize: "1.2rem", cursor: "pointer", letterSpacing: "1px" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}>
                    🔍 Load More ({currentTabPlayers.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      <Modal active={!!selectedPlayer} onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }} wide>
        {selectedPlayer && <PlayerPopupModal player={selectedPlayer} playerId={selectedPlayerId} playerTab={tab} teamIcons={mergedIcons} onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }} />}
      </Modal>

      <Modal active={!!selectedAuction} onClose={() => { setSelectedAuction(null); setSelectedAuctionId(null); }} wide>
        {selectedAuction && <AuctionBidModal player={selectedAuction} playerId={selectedAuctionId} isAdmin={isAdmin} onClose={() => { setSelectedAuction(null); setSelectedAuctionId(null); }} />}
      </Modal>

      <Modal active={showNewAuction} onClose={() => setShowNewAuction(false)} wide>
        <NewAuctionModal manager={manager} onClose={() => setShowNewAuction(false)} />
      </Modal>

      <Modal active={showAddModal} onClose={() => setShowAddModal(false)} wide>
        <AddPlayerModal onClose={() => setShowAddModal(false)} isAdmin={isAdmin} />
      </Modal>

      <Modal active={showBuySellModal} onClose={() => setShowBuySellModal(false)} wide>
        <BuySellModal mode={buySellMode} manager={manager} onClose={() => setShowBuySellModal(false)} />
      </Modal>

      <Modal active={showDeadlineModal} onClose={() => setShowDeadlineModal(false)} wide>
        <AuctionDeadlineModal onClose={() => setShowDeadlineModal(false)} />
      </Modal>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
