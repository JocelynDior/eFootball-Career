import { useState, useEffect, useRef } from "react";
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
import { SigningsFeed } from "../modals/SigningsPostModal";
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
  padding: "14px 18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "14px",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "1rem",
  outline: "none",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatMoney(n) {
  if (!n) return "—";
  if (n >= 1_000_000_000) return `€${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  return `€${Number(n).toLocaleString()}`;
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
      <path d="M 50 40 L 20 70 L 45 80 L 45 190 L 155 190 L 155 80 L 180 70 L 150 40 Q 130 30 115 38 Q 100 55 85 38 Q 70 30 50 40 Z" fill={`url(#sg-${num})`} />
      <text x="100" y="135" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="52" fontWeight="900" fill={colors.text} opacity="0.95">{num}</text>
      <text x="100" y="172" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="13" fontWeight="700" fill={colors.text} opacity="0.8" letterSpacing="2">
        {displayName.length > 10 ? displayName.slice(0, 10) + "…" : displayName}
      </text>
    </svg>
  );
}

// ─── HEADLINE SLIDESHOW ───────────────────────────────────────────────────
function HeadlineSlideshow({ slides }) {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % slides.length);
        setFade(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px solid rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
        <span style={{ fontSize: "3rem" }}>🎬</span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px" }}>No Slides Yet — Add via ➕ Menu</span>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", background: "#000" }}>
      <img
        src={slide.imageUrl}
        alt={slide.caption || "slide"}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: fade ? 1 : 0, transition: "opacity 0.4s ease" }}
      />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.85), transparent)", pointerEvents: "none" }} />
      {slide.caption && (
        <div style={{ position: "absolute", bottom: "28px", left: "28px", right: "80px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", textShadow: "0 2px 12px rgba(0,0,0,0.8)", lineHeight: 1.2 }}>
          {slide.caption}
        </div>
      )}
      {/* Dots */}
      {slides.length > 1 && (
        <div style={{ position: "absolute", bottom: "14px", right: "20px", display: "flex", gap: "6px" }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { setFade(false); setTimeout(() => { setCurrent(i); setFade(true); }, 300); }} style={{ width: i === current ? "20px" : "8px", height: "8px", borderRadius: "4px", background: i === current ? "#FF1493" : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AUCTION COUNTDOWN HOOK ──────────────────────────────────────────────
function useAuctionCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!deadline) { setTimeLeft(null); return; }
    function calc() {
      const diff = deadline - Date.now();
      if (diff <= 0) { setTimeLeft({ expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({ expired: false, days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  return timeLeft;
}

// ─── ENTER NEW AUCTION CARD ──────────────────────────────────────────────
function EnterAuctionCard({ manager }) {
  const [open, setOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [club, setClub] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const creatorName = manager?.username || "Admin";

  async function handleSubmit() {
    if (!playerName.trim() || !club.trim() || !startingBid) { setError("Please fill in all fields."); return; }
    setSaving(true); setError("");
    try {
      const bidAmt = Number(String(startingBid).replace(/[^0-9.]/g, ""));
      await push(ref(db, `${PATHS.transfers}/auction`), {
        name: playerName.trim(), club: club.trim(),
        auctionCreator: creatorName, startingBid: bidAmt,
        value: `€${(bidAmt / 1_000_000).toFixed(1)}M`,
        interestedManagers: 0, createdAt: Date.now(),
      });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setPlayerName(""); setClub(""); setStartingBid(""); }, 1400);
    } catch (e) { setError("Failed: " + e.message); }
    setSaving(false);
  }

  return (
    <>
      <div onClick={() => setOpen(true)} style={{ background: "linear-gradient(135deg, #FF1493, #cc0077)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1/1", boxShadow: "0 8px 32px rgba(255,20,147,0.4)", transition: "all 0.25s" }}
        onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(255,20,147,0.6)"; }}
        onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(255,20,147,0.4)"; }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "14px" }}>🔨</div>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px", textAlign: "center", lineHeight: 1.2 }}>ENTER NEW<br />AUCTION</div>
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setOpen(false)}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "480px", width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px", marginBottom: "24px" }}>🔨 NEW AUCTION</div>
            {done ? (
              <div style={{ textAlign: "center", color: "#00ff88", fontWeight: 700, fontSize: "1.4rem", padding: "32px", background: "rgba(0,255,136,0.08)", borderRadius: "16px" }}>✅ Auction Created!</div>
            ) : (
              <>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Player Name</label>
                  <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="e.g. Erling Haaland" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Which team does the player currently play for?</label>
                  <input value={club} onChange={e => setClub(e.target.value)} placeholder="e.g. Manchester City" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Starting Bid (€)</label>
                  <input value={startingBid} onChange={e => setStartingBid(e.target.value)} placeholder="e.g. 50000000" type="number" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px", fontWeight: 700 }}>Auction Creator</label>
                  <div style={{ ...inputStyle, width: "100%", boxSizing: "border-box", opacity: 0.6 }}>{creatorName}</div>
                </div>
                {error && <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: "14px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "16px", background: "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Creating..." : "🔨 Create Auction"}</button>
                  <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer", fontSize: "1.1rem" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── AUCTION GRID CARD ────────────────────────────────────────────────────
function AuctionGridCard({ player, teamIcons, onClick, isAdmin, onDelete, auctionDeadline }) {
  const clubLogo = teamIcons?.[player.club];
  const bids = player.bids ? Object.values(player.bids) : [];
  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => Number(b.amount) || 0)) : 0;
  const isSold = player.sold;
  const timeLeft = useAuctionCountdown(auctionDeadline);
  const isExpired = timeLeft?.expired;

  return (
    <div
      onClick={onClick}
      style={{ background: isSold ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.04)", border: isSold ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,20,147,0.18)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column", position: "relative" }}
      onMouseOver={e => { if (!isSold) { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; } }}
      onMouseOut={e => { e.currentTarget.style.background = isSold ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = isSold ? "rgba(0,255,136,0.4)" : "rgba(255,20,147,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {isSold && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "20px" }}>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "4px", textShadow: "0 0 30px rgba(0,255,136,0.8)" }}>SOLD</div>
          {player.soldTo && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.4rem", marginTop: "8px", textAlign: "center", padding: "0 12px" }}>{player.soldTo}</div>}
        </div>
      )}
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {player.imageUrl ? <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "70%", height: "70%" }}><ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} /></div>}
        {isExpired && !isSold && <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(255,68,68,0.9)", borderRadius: "8px", padding: "6px 14px", color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>EXPIRED</div>}
      </div>
      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "2rem", lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {clubLogo ? <img src={clubLogo} alt={player.club} style={{ width: "32px", height: "32px", objectFit: "contain" }} /> : <span style={{ fontSize: "1.4rem" }}>⚽</span>}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.6rem" }}>{player.club}</span>
        </div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "1px" }}>{player.value || "—"}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.4rem" }}>👥 Interested: <span style={{ color: "#fff", fontWeight: 700 }}>{bids.length}</span></div>
        {highestBid > 0 && <div style={{ color: "#00ff88", fontSize: "1.4rem", fontWeight: 700 }}>Leading: {formatMoney(highestBid)}</div>}
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ marginTop: "auto", padding: "16px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "1.4rem", cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
        >
          {isSold ? "View Result →" : "Place Bid →"}
        </button>
      </div>
      {isAdmin && <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(255,0,0,0.8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, fontSize: "1rem", padding: "6px 10px", cursor: "pointer", zIndex: 10 }}>🗑️</button>}
    </div>
  );
}

// ─── AUCTION POPUP ────────────────────────────────────────────────────────
function AuctionPopup({ player, manager, auctionDeadline, teamIcons, onClose }) {
  const [bidAmount, setBidAmount] = useState("");
  const [bidDisplay, setBidDisplay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleBidInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setBidAmount(raw);
    setBidDisplay(raw ? Number(raw).toLocaleString() : "");
  }
  const timeLeft = useAuctionCountdown(auctionDeadline);
  const isExpired = timeLeft?.expired;

  const bids = player.bids ? Object.values(player.bids) : [];
  const sortedBids = [...bids].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const leadingBid = sortedBids[0] || null;
  const leadingAmount = leadingBid ? Number(leadingBid.amount) || 0 : 0;
  const minBid = leadingAmount > 0 ? leadingAmount + 5_000_000 : (player.startingBid || 0);
  const lostBids = sortedBids.slice(1);

  async function handleBid() {
    if (isExpired) { setError("Auction has expired."); return; }
    const amt = Number(String(bidAmount).replace(/[^0-9.]/g, ""));
    if (!amt || amt < minBid) { setError(`Minimum bid is ${formatMoney(minBid)}`); return; }
    if (!manager?.team) { setError("You must be logged in as a manager."); return; }
    setSubmitting(true); setError("");
    try {
      await push(ref(db, `${PATHS.transfers}/auction/${player.id}/bids`), {
        amount: amt, club: manager.team,
        managerName: manager.username,
        managerUid: manager.uid, createdAt: Date.now(),
      });
      await update(ref(db, `${PATHS.transfers}/auction/${player.id}`), { interestedManagers: bids.length + 1 });
      setDone(true); setBidAmount(""); setBidDisplay("");
      setTimeout(() => { onClose?.(); }, 1500);
    } catch (e) { setError("Failed: " + e.message); }
    setSubmitting(false);
  }

  // Manager's own bids with Firebase keys
  const allBidEntries = player.bids ? Object.entries(player.bids) : [];
  const myBids = allBidEntries
    .filter(([, b]) => b.managerUid === manager?.uid)
    .sort((a, b) => (Number(b[1].amount) || 0) - (Number(a[1].amount) || 0));

  async function handleCancelBid(bidKey) {
    if (!window.confirm("Cancel this bid?")) return;
    try {
      await remove(ref(db, `${PATHS.transfers}/auction/${player.id}/bids/${bidKey}`));
      const remaining = allBidEntries.length - 1;
      await update(ref(db, `${PATHS.transfers}/auction/${player.id}`), { interestedManagers: Math.max(0, remaining) });
    } catch (e) { setError("Failed to cancel: " + e.message); }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Player image — full, not circle */}
      <div style={{ width: "100%", borderRadius: "16px", overflow: "hidden", background: "rgba(0,0,0,0.3)", marginBottom: "28px", maxHeight: "360px" }}>
        {player.imageUrl
          ? <img src={player.imageUrl} alt={player.name} style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: "360px" }} />
          : <div style={{ width: "100%", height: "280px", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "180px", height: "180px" }}><ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} /></div></div>
        }
      </div>

      {/* Name & value */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "4px", lineHeight: 1 }}>{player.name}</div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "3px", marginTop: "8px" }}>{player.value || "—"}</div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ ...GLASS, borderRadius: "16px", padding: "20px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>Nationality · Club</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.6rem" }}>{player.nationality || "—"} · {player.club || "—"}</div>
        </div>
        <div style={{ ...GLASS, borderRadius: "16px", padding: "20px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>Interested · Age</div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.6rem" }}>{bids.length} Managers · {player.age || "—"}</div>
        </div>
      </div>

      {/* Countdown */}
      {auctionDeadline && timeLeft && (
        <div style={{ ...GLASS, borderRadius: "16px", padding: "24px", marginBottom: "24px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "16px" }}>{isExpired ? "⏰ AUCTION ENDED" : "⏳ TIME REMAINING"}</div>
          {isExpired ? (
            <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "4px" }}>BIDDING CLOSED</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {[["Days", timeLeft.days], ["Hours", timeLeft.hours], ["Minutes", timeLeft.minutes], ["Seconds", timeLeft.seconds]].map(([label, val]) => (
                <div key={label} style={{ background: "rgba(255,20,147,0.1)", borderRadius: "14px", padding: "16px 8px" }}>
                  <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "2px" }}>{String(val).padStart(2, "0")}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leading bid */}
      {leadingBid ? (
        <div style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", borderRadius: "16px", padding: "24px", marginBottom: "20px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>🏆 Leading Bid</div>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.4rem", letterSpacing: "3px" }}>{formatMoney(leadingAmount)}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.4rem", marginTop: "8px" }}>{leadingBid.club} · {leadingBid.managerName}</div>
        </div>
      ) : (
        <div style={{ ...GLASS, borderRadius: "16px", padding: "24px", marginBottom: "20px", textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.4rem" }}>No bids yet — starting bid: {formatMoney(player.startingBid || 0)}</div>
        </div>
      )}

      {/* Bid input */}
      {!isExpired && manager && !player.sold && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px", fontWeight: 700 }}>Place Your Bid — Min: {formatMoney(minBid)}</div>
          <div style={{ ...GLASS, borderRadius: "14px", padding: "20px", marginBottom: "14px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginBottom: "6px" }}>Manager</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.4rem" }}>{manager.username} · {manager.team}</div>
          </div>
          <input value={bidDisplay} onChange={handleBidInput} placeholder={`Min ${formatMoney(minBid)}`} type="text" inputMode="numeric" style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: "14px", fontSize: "1.2rem" }} />
          {done && <div style={{ color: "#00ff88", fontWeight: 700, textAlign: "center", marginBottom: "10px", fontSize: "1.2rem" }}>✅ Bid placed!</div>}
          {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "10px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{error}</div>}
          <button onClick={handleBid} disabled={submitting} style={{ width: "100%", padding: "20px", background: "linear-gradient(135deg, #FF1493, #cc0077)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.4rem", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting..." : "🔨 Place Bid"}
          </button>
        </div>
      )}

      {/* My bids — manager can cancel */}
      {myBids.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px", fontWeight: 700 }}>Your Bids</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {myBids.map(([bidKey, bid]) => (
              <div key={bidKey} style={{ background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.25)", borderRadius: "14px", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.6rem" }}>{formatMoney(bid.amount)}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginTop: "4px" }}>{bid.club}</div>
                </div>
                {!isExpired && !player.sold && (
                  <button onClick={() => handleCancelBid(bidKey)} style={{ padding: "12px 20px", background: "rgba(255,68,68,0.15)", border: "1px solid rgba(255,68,68,0.4)", borderRadius: "12px", color: "#ff6b6b", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
                    Cancel Bid
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lost bids */}
      {lostBids.length > 0 && (
        <div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px", fontWeight: 700 }}>Other Bids</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {lostBids.map((bid, i) => (
              <div key={i} style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "14px", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.3rem" }}>{bid.club} · {bid.managerName}</div>
                <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>{formatMoney(bid.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLAYER GRID CARD ─────────────────────────────────────────────────────
function PlayerGridCard({ player, teamIcons, onClick }) {
  const clubLogo = teamIcons?.[player.club];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.18)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column" }}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {player.imageUrl ? <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "70%", height: "70%" }}><ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} /></div>}
        {player.overall && <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(255,20,147,0.9)", borderRadius: "8px", padding: "4px 10px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "1px" }}>OVR {player.overall}</div>}
        {player.listedBy && <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.7)", borderRadius: "8px", padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700 }}>by {player.listedBy}</div>}
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {clubLogo ? <img src={clubLogo} alt={player.club} style={{ width: "20px", height: "20px", objectFit: "contain" }} /> : <span>⚽</span>}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>{player.club}</span>
        </div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "1px" }}>{player.value || player.price || "—"}</div>
        <button onClick={e => { e.stopPropagation(); onClick(); }} style={{ marginTop: "auto", padding: "12px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}>
          More Info →
        </button>
      </div>
    </div>
  );
}

// ─── NEGOTIATION CARD ─────────────────────────────────────────────────────
function NegotiationCard({ offer, isOwn, isAdmin, manager }) {
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b", cancelled: "#aaaaaa", reversed: "#aa44ff" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);

  async function handleAccept() {
    setProcessing(true); setActionError("");
    try {
      const amt = Number((offer.offerAmount || offer.loanAmount || offer.bidAmount || "0").replace(/[^0-9.]/g, ""));
      const now = new Date(); const monthIndex = now.getMonth(); const year = now.getFullYear();
      const buyingClub = offer.fromClub; const sellingClub = offer.toClub || offer.playerClub;
      if (buyingClub && amt > 0) await push(ref(db, `career_team_management/${buyingClub}/finance/transactions`), { type: "expense", category: "Player Purchase", source: offer.playerName, amount: amt, month: MONTHS[monthIndex], monthIndex, year, createdAt: Date.now(), negotiationId: offer.id });
      if (sellingClub && amt > 0) await push(ref(db, `career_team_management/${sellingClub}/finance/transactions`), { type: "income", category: "Player Sales", source: offer.playerName, amount: amt, month: MONTHS[monthIndex], monthIndex, year, createdAt: Date.now(), negotiationId: offer.id });
      if (offer.type === "buy") {
        const snap = await get(ref(db, `career_team_management/${sellingClub}/squad`)); const data = snap.val();
        if (data) { for (const [key, p] of Object.entries(data)) { if (p.name === offer.playerName) { await remove(ref(db, `career_team_management/${sellingClub}/squad/${key}`)); const { loanStatus, loanClub, loanFrom, ...clean } = p; await push(ref(db, `career_team_management/${buyingClub}/squad`), clean); break; } } }
      } else if (offer.type === "loan") {
        const snap = await get(ref(db, `career_team_management/${sellingClub}/squad`)); const data = snap.val();
        if (data) { for (const [key, p] of Object.entries(data)) { if (p.name === offer.playerName) { await update(ref(db, `career_team_management/${sellingClub}/squad/${key}`), { role: "reserve", loanStatus: "out", loanClub: buyingClub }); const { loanStatus, loanClub, loanFrom, ...clean } = p; await push(ref(db, `career_team_management/${buyingClub}/squad`), { ...clean, role: "reserve", loanStatus: "in", loanFrom: sellingClub }); break; } } }
      }
      await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "accepted" });
    } catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  async function handleReject() {
    setProcessing(true); setActionError("");
    try { await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "rejected" }); } catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  async function handleCancel() {
    setProcessing(true); setActionError("");
    try { await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "cancelled" }); } catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  async function handleReverse() {
    setProcessing(true); setActionError(""); setShowReverseConfirm(false);
    try {
      const amt = Number((offer.offerAmount || offer.loanAmount || offer.bidAmount || "0").replace(/[^0-9.]/g, ""));
      const now = new Date(); const monthIndex = now.getMonth(); const year = now.getFullYear();
      const buyingClub = offer.fromClub; const sellingClub = offer.toClub || offer.playerClub;
      if (buyingClub && amt > 0) await push(ref(db, `career_team_management/${buyingClub}/finance/transactions`), { type: "income", category: "Player Sales", source: `[REVERSED] ${offer.playerName}`, amount: amt, month: MONTHS[monthIndex], monthIndex, year, createdAt: Date.now(), reversedNegotiationId: offer.id });
      if (sellingClub && amt > 0) await push(ref(db, `career_team_management/${sellingClub}/finance/transactions`), { type: "expense", category: "Player Purchase", source: `[REVERSED] ${offer.playerName}`, amount: amt, month: MONTHS[monthIndex], monthIndex, year, createdAt: Date.now(), reversedNegotiationId: offer.id });
      if (offer.type === "buy") {
        const snap = await get(ref(db, `career_team_management/${buyingClub}/squad`)); const data = snap.val();
        if (data) { for (const [key, p] of Object.entries(data)) { if (p.name === offer.playerName) { await remove(ref(db, `career_team_management/${buyingClub}/squad/${key}`)); const { loanStatus, loanClub, loanFrom, ...clean } = p; await push(ref(db, `career_team_management/${sellingClub}/squad`), clean); break; } } }
      } else if (offer.type === "loan") {
        const buySnap = await get(ref(db, `career_team_management/${buyingClub}/squad`)); const buyData = buySnap.val();
        if (buyData) { for (const [key, p] of Object.entries(buyData)) { if (p.name === offer.playerName && p.loanStatus === "in") { await remove(ref(db, `career_team_management/${buyingClub}/squad/${key}`)); break; } } }
        const sellSnap = await get(ref(db, `career_team_management/${sellingClub}/squad`)); const sellData = sellSnap.val();
        if (sellData) { for (const [key, p] of Object.entries(sellData)) { if (p.name === offer.playerName && p.loanStatus === "out") { await update(ref(db, `career_team_management/${sellingClub}/squad/${key}`), { loanStatus: null, loanClub: null, role: p.originalRole || "first-team" }); break; } } }
      }
      await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "reversed" });
    } catch (e) { setActionError("Failed: " + e.message); }
    setProcessing(false);
  }

  const isPending = offer.status === "pending";
  const isAccepted = offer.status === "accepted";
  const canAcceptReject = (isAdmin || (manager && (offer.toClub === manager.team || offer.playerClub === manager.team) && offer.fromClub !== manager.team)) && isPending;

  return (
    <div style={{ padding: "36px 40px", background: isOwn ? "rgba(255,20,147,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOwn ? "rgba(255,20,147,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "20px", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "2.6rem", lineHeight: 1.1, marginBottom: "6px" }}>{offer.playerName}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "2rem" }}>{offer.playerClub}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <span style={{ background: offer.type === "buy" ? "rgba(255,20,147,0.2)" : offer.type === "loan" ? "rgba(0,150,255,0.2)" : "rgba(255,170,0,0.2)", color: offer.type === "buy" ? "#FF1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44", padding: "7px 18px", borderRadius: "20px", fontSize: "1.4rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
          <span style={{ background: `${statusColor}22`, color: statusColor, padding: "7px 18px", borderRadius: "20px", fontSize: "1.4rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {[["From", offer.fromClub || offer.fromManagerName], [offer.type === "auction" ? "Bid" : offer.type === "loan" ? "Loan Fee" : "Offer", offer.offerAmount || offer.loanAmount || offer.bidAmount], offer.contractLength && ["Contract", offer.contractLength], offer.loanTerm && ["Loan Term", offer.loanTerm], offer.buyOptionClause && ["Buy Option", offer.buyOptionClause]].filter(Boolean).map(([label, value]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px 20px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.6rem" }}>{value || "—"}</div>
          </div>
        ))}
      </div>
      {isOwn && <div style={{ marginTop: "12px", color: "#FF1493", fontSize: "1.2rem", fontWeight: 700 }}>YOUR OFFER</div>}
      {canAcceptReject && (
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={handleAccept} disabled={processing} style={{ flex: 1, padding: "16px", background: processing ? "rgba(0,204,102,0.2)" : "#00cc66", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: processing ? "not-allowed" : "pointer" }}>{processing ? "Processing..." : "✅ Accept"}</button>
          <button onClick={handleReject} disabled={processing} style={{ flex: 1, padding: "16px", background: processing ? "rgba(255,68,68,0.2)" : "rgba(255,68,68,0.8)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1.2rem", cursor: processing ? "not-allowed" : "pointer" }}>❌ Reject</button>
        </div>
      )}
      {isAdmin && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          {!["cancelled", "reversed"].includes(offer.status) && <button onClick={handleCancel} disabled={processing} style={{ flex: 1, padding: "14px", background: "rgba(170,170,170,0.15)", border: "1px solid rgba(170,170,170,0.4)", borderRadius: "12px", color: "#aaa", fontWeight: 700, fontSize: "1.1rem", cursor: processing ? "not-allowed" : "pointer" }}>🚫 Cancel</button>}
          {isAccepted && <button onClick={() => setShowReverseConfirm(true)} disabled={processing} style={{ flex: 1, padding: "14px", background: "rgba(170,68,255,0.15)", border: "1px solid rgba(170,68,255,0.5)", borderRadius: "12px", color: "#aa44ff", fontWeight: 700, fontSize: "1.1rem", cursor: processing ? "not-allowed" : "pointer" }}>↩️ Reverse</button>}
        </div>
      )}
      {showReverseConfirm && (
        <div style={{ marginTop: "16px", background: "rgba(170,68,255,0.08)", border: "1px solid rgba(170,68,255,0.3)", borderRadius: "14px", padding: "20px" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "8px" }}>⚠️ Reverse this transaction?</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", marginBottom: "16px" }}>This will refund <strong style={{ color: "#fff" }}>{offer.fromClub}</strong> and deduct from <strong style={{ color: "#fff" }}>{offer.toClub || offer.playerClub}</strong>, and move {offer.playerName} back.</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={handleReverse} disabled={processing} style={{ flex: 1, padding: "14px", background: "#aa44ff", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, cursor: processing ? "not-allowed" : "pointer" }}>{processing ? "Reversing..." : "✅ Confirm Reverse"}</button>
            <button onClick={() => setShowReverseConfirm(false)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      {actionError && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginTop: "12px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>{actionError}</div>}
    </div>
  );
}

// ─── AUCTION DEADLINE BANNER ─────────────────────────────────────────────
function AuctionDeadlineBanner({ deadline }) {
  const timeLeft = useAuctionCountdown(deadline);
  if (!timeLeft) return null;
  const isExpired = timeLeft.expired;
  return (
    <div style={{ ...GLASS, borderRadius: "16px", padding: "20px 28px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", border: isExpired ? "1px solid rgba(255,68,68,0.4)" : "1px solid rgba(255,20,147,0.3)", background: isExpired ? "rgba(255,68,68,0.06)" : "rgba(255,20,147,0.04)" }}>
      <div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>⏳ Auction Deadline</div>
        <div style={{ color: isExpired ? "#ff6b6b" : "#fff", fontWeight: 700, fontSize: "1rem" }}>{isExpired ? "BIDDING CLOSED" : new Date(deadline).toLocaleString()}</div>
      </div>
      {!isExpired && (
        <div style={{ display: "flex", gap: "8px" }}>
          {[["D", timeLeft.days], ["H", timeLeft.hours], ["M", timeLeft.minutes], ["S", timeLeft.seconds]].map(([label, val]) => (
            <div key={label} style={{ background: "rgba(255,20,147,0.1)", borderRadius: "10px", padding: "8px 12px", textAlign: "center", minWidth: "44px" }}>
              <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem" }}>{String(val).padStart(2, "0")}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.6rem", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function TransferMarketPage() {
  const { isAdmin, manager, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("topTargets");
  const [players, setPlayers] = useState({});
  const [negotiations, setNegotiations] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [slides, setSlides] = useState([]);
  const [teamIcons, setTeamIcons] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [buySellMode, setBuySellMode] = useState("buy");
  const [visibleCount, setVisibleCount] = useState(12);
  const [auctionDeadline, setAuctionDeadline] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);

  useEffect(() => {
    const tabs = ["topTargets", "auction"];
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
    const slidesUnsub = onValue(ref(db, `career_global_settings/transferSlides`), snap => {
      const data = snap.val();
      setSlides(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    const iconsUnsub = onValue(ref(db, `${PATHS.teamIcons}`), snap => {
      if (snap.val()) setTeamIcons(snap.val());
    });
    const deadlineUnsub = onValue(ref(db, `career_global_settings/auctionDeadline`), snap => {
      setAuctionDeadline(snap.val() ? Number(snap.val()) : null);
    });
    return () => { unsubs.forEach(u => u()); negUnsub(); cdUnsub(); slidesUnsub(); iconsUnsub(); deadlineUnsub(); };
  }, []);

  // Auto-process auction wins
  useEffect(() => {
    if (!isAdmin || !auctionDeadline) return;
    const checkExpiry = async () => {
      if (Date.now() < auctionDeadline) return;
      const auctionPlayers = players.auction || [];
      for (const player of auctionPlayers) {
        if (player.sold) continue;
        const bids = player.bids ? Object.values(player.bids) : [];
        if (bids.length === 0) continue;
        const winner = [...bids].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];
        if (!winner) continue;
        try {
          const amt = Number(winner.amount) || 0;
          const now = new Date(); const monthIndex = now.getMonth(); const year = now.getFullYear();
          const buyingClub = winner.club; const sellingClub = player.club;
          if (buyingClub && amt > 0) await push(ref(db, `career_team_management/${buyingClub}/finance/transactions`), { type: "expense", category: "Player Purchase", source: player.name, amount: amt, month: MONTHS[monthIndex], monthIndex, year, createdAt: Date.now() });
          const snap = await get(ref(db, `career_team_management/${sellingClub}/squad`)); const data = snap.val();
          if (data) { for (const [key, p] of Object.entries(data)) { if (p.name === player.name) { await remove(ref(db, `career_team_management/${sellingClub}/squad/${key}`)); const { loanStatus, loanClub, loanFrom, ...clean } = p; await push(ref(db, `career_team_management/${buyingClub}/squad`), clean); break; } } }
          await update(ref(db, `${PATHS.transfers}/auction/${player.id}`), { sold: true, soldTo: `${winner.managerName} (${winner.club})`, soldAmount: amt });
        } catch (e) { console.error("Auto-win error:", e); }
      }
    };
    const interval = setInterval(checkExpiry, 10000);
    checkExpiry();
    return () => clearInterval(interval);
  }, [isAdmin, auctionDeadline, players.auction]);

  const currentTabPlayers = (players[tab] || []).sort((a, b) => {
    const av = Number((a.value || a.price || "").replace(/[^0-9]/g, "") || 0);
    const bv = Number((b.value || b.price || "").replace(/[^0-9]/g, "") || 0);
    return bv - av;
  });

  const visiblePlayers = currentTabPlayers.slice(0, visibleCount);
  const hasMore = currentTabPlayers.length > visibleCount;

  const sortedNegotiations = [...negotiations].sort((a, b) => {
    const order = n => {
      if (n.fromManagerUid === manager?.uid) return 0;
      if (n.status === "accepted") return 1;
      if (n.status === "pending") return 2;
      if (n.status === "rejected") return 3;
      if (n.status === "cancelled") return 4;
      if (n.status === "reversed") return 5;
      return 6;
    };
    const diff = order(a) - order(b);
    if (diff !== 0) return diff;
    if (a.status === "pending" && b.status === "pending") return (b.createdAt || 0) - (a.createdAt || 0);
    return 0;
  });

  const mergedIcons = { ...teamIconsCache, ...teamIcons };

  async function handleDeletePlayer(playerId) {
    if (!isAdmin || !tab || tab === "negotiations") return;
    try { await remove(ref(db, `${PATHS.transfers}/${tab}/${playerId}`)); } catch(e) {}
  }

  async function handleDeleteAuction(playerId) {
    if (!isAdmin) return;
    try { await remove(ref(db, `${PATHS.transfers}/auction/${playerId}`)); } catch(e) {}
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      {/* Headline Slideshow */}
      <HeadlineSlideshow slides={slides} />

      <div style={{ padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={t => { setTab(t); setVisibleCount(12); }} />
        </div>

        {manager && (
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <button onClick={() => { setBuySellMode("buy"); setShowBuySellModal(true); }} style={{ flex: 1, padding: "20px", background: "linear-gradient(135deg, #00cc66, #00994d)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.4rem", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 4px 20px rgba(0,204,102,0.3)", transition: "all 0.3s" }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>🟢 BUY PLAYER</button>
            <button onClick={() => { setBuySellMode("loan"); setShowBuySellModal(true); }} style={{ flex: 1, padding: "20px", background: "linear-gradient(135deg, #ffaa44, #e68a00)", border: "none", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.4rem", cursor: "pointer", letterSpacing: "1px", boxShadow: "0 4px 20px rgba(255,170,68,0.3)", transition: "all 0.3s" }}
              onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>🟠 LOAN PLAYER</button>
          </div>
        )}

        {countdowns.length > 0 && <CountdownSlideshow countdowns={countdowns} />}

        {/* SIGNINGS TAB */}
        {tab === "signings" ? (
          <SigningsFeed isAdmin={isAdmin} />

        ) : tab === "negotiations" ? (
          <div style={{ width: "100%" }}>
            {sortedNegotiations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📋</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Negotiations Yet</div>
              </div>
            ) : sortedNegotiations.map(offer => (
              <NegotiationCard key={offer.id} offer={offer} isOwn={offer.fromManagerUid === manager?.uid} isAdmin={isAdmin} manager={manager} />
            ))}
          </div>

        ) : tab === "auction" ? (
          <div>
            {auctionDeadline && <AuctionDeadlineBanner deadline={auctionDeadline} />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%" }}>
              {(isAdmin || manager) && <EnterAuctionCard manager={manager || { username: "Admin", team: "" }} />}
              {(players.auction || []).map(player => (
                <AuctionGridCard key={player.id} player={player} teamIcons={mergedIcons} onClick={() => setSelectedAuction(player)} isAdmin={isAdmin} onDelete={() => handleDeleteAuction(player.id)} auctionDeadline={auctionDeadline} />
              ))}
            </div>
            {(players.auction || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🔨</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "2px" }}>No Auctions Yet</div>
              </div>
            )}
          </div>

        ) : (
          <>
            {currentTabPlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚽</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Players Found</div>
                <div style={{ fontSize: "1rem", marginTop: "10px" }}>{isAdmin ? "Use the + button above to add players." : "Check back soon."}</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%" }}>
                  {visiblePlayers.map(player => (
                    <div key={player.id} style={{ position: "relative" }}>
                      <PlayerGridCard player={player} teamIcons={mergedIcons} onClick={() => { setSelectedPlayer(player); setSelectedPlayerId(player.id); }} />
                      {isAdmin && <button onClick={() => handleDeletePlayer(player.id)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(255,0,0,0.8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", zIndex: 10 }}>🗑️</button>}
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: "40px" }}>
                    <button onClick={() => setVisibleCount(v => v + 12)} style={{ padding: "20px 60px", background: "rgba(255,20,147,0.12)", border: "2px solid rgba(255,20,147,0.5)", borderRadius: "16px", color: "#FF1493", fontWeight: 800, fontSize: "1.2rem", cursor: "pointer", letterSpacing: "1px", fontFamily: "inherit" }}
                      onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
                      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}>
                      🔍 Load More ({currentTabPlayers.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Modal active={!!selectedPlayer} onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }} wide>
        {selectedPlayer && <PlayerPopupModal player={selectedPlayer} playerId={selectedPlayerId} playerTab={tab} teamIcons={mergedIcons} onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }} />}
      </Modal>

      <Modal active={!!selectedAuction} onClose={() => setSelectedAuction(null)} wide>
        {selectedAuction && <AuctionPopup player={selectedAuction} manager={manager} auctionDeadline={auctionDeadline} teamIcons={mergedIcons} onClose={() => setSelectedAuction(null)} />}
      </Modal>

      <Modal active={showAddModal} onClose={() => setShowAddModal(false)} wide>
        <AddPlayerModal onClose={() => setShowAddModal(false)} isAdmin={isAdmin} />
      </Modal>

      <Modal active={showBuySellModal} onClose={() => setShowBuySellModal(false)} wide>
        <BuySellModal mode={buySellMode} manager={manager} onClose={() => setShowBuySellModal(false)} />
      </Modal>

      <style>{`
        select option { background: #000033; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        textarea::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
