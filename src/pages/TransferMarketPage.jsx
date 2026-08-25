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

const MANAGER_TABS = [
  { id: "topTargets", label: "TOP TARGETS" },
  { id: "signings", label: "SIGNINGS" },
  { id: "negotiations", label: "NEGOTIATIONS" },
];

const ADMIN_TABS = [
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

// ── Spinner ─────────────────────────────────────────────────────────────────
function TabSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "20px" }}>
      <div style={{
        width: "52px", height: "52px",
        border: "4px solid rgba(255,20,147,0.15)",
        borderTop: "4px solid #FF1493",
        borderRadius: "50%",
        animation: "tmSpin 0.8s linear infinite",
      }} />
      <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>
        LOADING...
      </div>
      <style>{`@keyframes tmSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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
            by {player.listedBy}
          </div>
        )}
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {clubLogo ? <img src={clubLogo} alt={player.club} style={{ width: "20px", height: "20px", objectFit: "contain" }} /> : <span>⚽</span>}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>{player.club}</span>
        </div>
        {/* white instead of pink */}
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "1px" }}>
          {player.value || player.price || "—"}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ marginTop: "auto", padding: "12px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#fff"; }}
        >
          More Info →
        </button>
      </div>
    </div>
  );
}

function AuctionGridCard({ player, onClick, bidCount }) {
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
          <div style={{ width: "70%", height: "70%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>⚽</div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "3px" }}>✅ SOLD</div>
        </div>
      </div>
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>{player.name}</div>
        {/* white instead of pink */}
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem" }}>{player.value || "—"}</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
          👥 Interested Managers: <span style={{ color: "#fff", fontWeight: 700 }}>{bidCount}</span>
        </div>
      </div>
    </div>
  );
}

function NewAuctionCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: "linear-gradient(135deg, #FF1493, #cc0077)", border: "2px solid rgba(255,20,147,0.6)", borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", aspectRatio: "1/1", minHeight: "260px", boxShadow: "0 4px 30px rgba(255,20,147,0.3)" }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(255,20,147,0.5)"; }}
      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 30px rgba(255,20,147,0.3)"; }}
    >
      <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>➕</div>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px", textAlign: "center" }}>ENTER NEW AUCTION</div>
    </div>
  );
}

function NewAuctionModal({ manager, onClose }) {
  const [form, setForm] = useState({ name: "", club: "", nationality: "", age: "", value: "", startingBid: "", imageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set_(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleCreate() {
    if (!form.name || !form.club || !form.startingBid) { setError("Player name, club and starting bid are required."); return; }
    setSaving(true); setError("");
    try {
      await push(ref(db, `${PATHS.transfers}/auction`), {
        name: form.name, club: form.club, nationality: form.nationality || "",
        age: form.age || "", value: form.value || "",
        startingBid: parseRaw(form.startingBid), imageUrl: form.imageUrl || "",
        createdBy: manager?.username || "Admin", createdAt: Date.now(), settled: false,
      });
      onClose();
    } catch (e) { setError("Failed: " + e.message); }
    setSaving(false);
  }

  const field = (label, key, placeholder, type = "text") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set_(key, e.target.value)} placeholder={placeholder} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "560px", margin: "0 auto" }}>
      <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", marginBottom: "6px" }}>🔨 NEW AUCTION</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginBottom: "28px" }}>
        Created by: <span style={{ color: "#FF1493", fontWeight: 700 }}>{manager?.username || "Admin"}</span>
      </div>
      {field("Player Name", "name", "e.g. Lionel Messi")}
      {field("Club", "club", "e.g. Inter Miami")}
      {field("Nationality", "nationality", "e.g. Argentina")}
      {field("Age", "age", "e.g. 36")}
      {field("Market Value", "value", "e.g. €45M")}
      {field("Starting Bid (€)", "startingBid", "e.g. 40000000", "number")}
      {field("Image URL (optional)", "imageUrl", "https://...")}
      {error && <div style={{ color: "#ff6b6b", fontSize: "1rem", marginBottom: "16px", padding: "12px", background: "rgba(255,0,0,0.1)", borderRadius: "10px" }}>❌ {error}</div>}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: "18px", background: saving ? "rgba(255,20,147,0.3)" : "#FF1493", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Creating..." : "✅ Create Auction"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function AuctionDeadlineModal({ onClose }) {
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("23:59");
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/auctionDeadline`), snap => { setCurrent(snap.val()); });
    return () => unsub();
  }, []);

  async function handleSave() {
    if (!dateStr) return;
    setSaving(true);
    const ts = new Date(`${dateStr}T${timeStr || "23:59"}`).getTime();
    await set(ref(db, `${PATHS.globalSettings}/auctionDeadline`), ts);
    setSaving(false); onClose();
  }

  async function handleReset() {
    setSaving(true);
    await set(ref(db, `${PATHS.globalSettings}/auctionDeadline`), null);
    setSaving(false); onClose();
  }

  const currentLabel = current ? new Date(current).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set";

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

// ── Transfer Window Toggle (admin) ───────────────────────────────────────────
function TransferWindowModal({ onClose }) {
  const [windowOpen, setWindowOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, `${PATHS.globalSettings}/transferWindowOpen`), snap => {
      const val = snap.val();
      setWindowOpen(val === null || val === undefined ? true : !!val);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleToggle(open) {
    setSaving(true);
    await set(ref(db, `${PATHS.globalSettings}/transferWindowOpen`), open);
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: "440px", margin: "0 auto", textAlign: "center" }}>
      <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", marginBottom: "12px" }}>🪟 TRANSFER WINDOW</div>
      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.4)", padding: "20px" }}>Loading...</div>
      ) : (
        <>
          <div style={{ marginBottom: "28px" }}>
            <span style={{
              display: "inline-block", padding: "10px 28px", borderRadius: "30px",
              background: windowOpen ? "rgba(0,255,136,0.12)" : "rgba(255,107,107,0.12)",
              border: `1px solid ${windowOpen ? "rgba(0,255,136,0.3)" : "rgba(255,107,107,0.3)"}`,
              color: windowOpen ? "#00ff88" : "#ff6b6b",
              fontWeight: 700, fontSize: "1.2rem",
            }}>
              {windowOpen ? "🟢 CURRENTLY OPEN" : "🔴 CURRENTLY CLOSED"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => handleToggle(true)} disabled={saving || windowOpen} style={{ flex: 1, padding: "18px", background: windowOpen ? "rgba(0,255,136,0.08)" : "#00cc66", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: windowOpen || saving ? "not-allowed" : "pointer", opacity: windowOpen ? 0.5 : 1 }}>
              🟢 Open Window
            </button>
            <button onClick={() => handleToggle(false)} disabled={saving || !windowOpen} style={{ flex: 1, padding: "18px", background: !windowOpen ? "rgba(255,107,107,0.08)" : "rgba(255,68,68,0.8)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "1.1rem", cursor: !windowOpen || saving ? "not-allowed" : "pointer", opacity: !windowOpen ? 0.5 : 1 }}>
              🔴 Close Window
            </button>
          </div>
          <button onClick={onClose} style={{ width: "100%", marginTop: "12px", padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "14px", color: "#fff", cursor: "pointer" }}>Cancel</button>
        </>
      )}
    </div>
  );
}

function NegotiationCard({ offer, isOwn, isAdmin, manager }) {
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b", cancelled: "#aaaaaa" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

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

  async function handleReject() {
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

  return (
    <div style={{ padding: "24px 28px", background: isOwn ? "rgba(255,20,147,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isOwn ? "rgba(255,20,147,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "20px", marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>{offer.playerName}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginTop: "4px" }}>{offer.playerClub}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
          <span style={{ background: offer.type === "buy" ? "rgba(255,20,147,0.2)" : offer.type === "loan" ? "rgba(0,150,255,0.2)" : "rgba(255,170,0,0.2)", color: offer.type === "buy" ? "#FF1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44", padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
          <span style={{ background: `${statusColor}22`, color: statusColor, padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
        </div>
      </div>
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
      {isOwn && <div style={{ marginTop: "10px", color: "#fff", fontSize: "0.9rem", fontWeight: 700 }}>YOUR OFFER</div>}
      {isOwn && offer.status === "pending" && (
        <div style={{ marginTop: "14px" }}>
          <button onClick={handleCancel} disabled={processing} style={{ width: "100%", padding: "12px", background: "rgba(170,170,170,0.12)", border: "1px solid rgba(170,170,170,0.4)", borderRadius: "12px", color: "#aaa", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            {processing ? "Cancelling..." : "🚫 Cancel Bid"}
          </button>
        </div>
      )}
      {(isAdmin || (manager && (offer.toClub === manager.team || offer.playerClub === manager.team) && offer.fromClub !== manager.team)) && offer.status === "pending" && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button onClick={handleAccept} disabled={processing} style={{ flex: 1, padding: "12px", background: processing ? "rgba(0,204,102,0.2)" : "#00cc66", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            {processing ? "Processing..." : "✅ Accept"}
          </button>
          <button onClick={handleReject} disabled={processing} style={{ flex: 1, padding: "12px", background: processing ? "rgba(255,68,68,0.2)" : "rgba(255,68,68,0.8)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}>
            ❌ Reject
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

  // Per-tab loading states — separate so each tab shows its own spinner
  const [playersLoaded, setPlayersLoaded] = useState({ topTargets: false, signings: false, auction: false });
  const [negsLoaded, setNegsLoaded] = useState(false);

  const [players, setPlayers] = useState({});
  const [auctionBids, setAuctionBids] = useState({});
  const [negotiations, setNegotiations] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [headlineVideo, setHeadlineVideo] = useState("");
  const [teamIcons, setTeamIcons] = useState({});
  const [windowOpen, setWindowOpen] = useState(true);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [buySellMode, setBuySellMode] = useState("buy");
  const [showNewAuction, setShowNewAuction] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showWindowModal, setShowWindowModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const tabs = ["topTargets", "signings", "auction"];
    const unsubs = tabs.map(t =>
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        setPlayers(prev => ({ ...prev, [t]: data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [] }));
        setPlayersLoaded(prev => ({ ...prev, [t]: true }));
      })
    );
    const negUnsub = onValue(ref(db, `${PATHS.transfers}/negotiations`), snap => {
      const data = snap.val();
      setNegotiations(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
      setNegsLoaded(true);
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
    const winUnsub = onValue(ref(db, `${PATHS.globalSettings}/transferWindowOpen`), snap => {
      const val = snap.val();
      setWindowOpen(val === null || val === undefined ? true : !!val);
    });
    return () => { unsubs.forEach(u => u()); negUnsub(); cdUnsub(); vidUnsub(); iconsUnsub(); winUnsub(); };
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

  const TABS = isAdmin ? ADMIN_TABS : MANAGER_TABS;

  const acceptedSignings = negotiations
    .filter(n => n.status === "accepted")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const currentTabPlayers = (players[tab] || []).sort((a, b) => {
    const av = Number((a.value || a.price || "").replace(/[^0-9]/g, "") || 0);
    const bv = Number((b.value || b.price || "").replace(/[^0-9]/g, "") || 0);
    return bv - av;
  });

  const visiblePlayers = currentTabPlayers.slice(0, visibleCount);
  const hasMore = currentTabPlayers.length > visibleCount;
  const sortedNegotiations = [...negotiations].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const mergedIcons = { ...teamIconsCache, ...teamIcons };

  async function handleDeletePlayer(playerId) {
    if (!isAdmin || !tab || tab === "negotiations") return;
    try { await remove(ref(db, `${PATHS.transfers}/${tab}/${playerId}`)); }
    catch (e) { console.error("Delete failed:", e); }
  }

  // Is current tab still loading?
  const tabLoading = (tab === "negotiations" || tab === "signings") ? !negsLoaded : !playersLoaded[tab];

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
                <button onClick={() => setShowWindowModal(true)} style={{ padding: "10px 18px", background: windowOpen ? "rgba(0,255,136,0.12)" : "rgba(255,107,107,0.12)", border: `1px solid ${windowOpen ? "rgba(0,255,136,0.3)" : "rgba(255,107,107,0.3)"}`, borderRadius: "10px", color: windowOpen ? "#00ff88" : "#ff6b6b", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                  {windowOpen ? "🟢 Window Open" : "🔴 Window Closed"}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Transfer window closed banner */}
      {!windowOpen && (
        <div style={{ background: "rgba(255,68,68,0.12)", borderBottom: "1px solid rgba(255,68,68,0.3)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.4rem" }}>🔒</span>
          <span style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>TRANSFER WINDOW CLOSED — No new bids or offers can be submitted</span>
        </div>
      )}

      {headlineVideo ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden" }}>
          <video key={headlineVideo} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
            <source src={headlineVideo} type="video/mp4" />
            <source src={headlineVideo} type="video/webm" />
          </video>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, rgba(0,0,20,0.75), transparent)", pointerEvents: "none" }} />
          {/* white instead of pink */}
          <div style={{ position: "absolute", bottom: "20px", left: "20px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
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

        {/* Buy/Loan buttons hidden for current window — feature preserved, buttons removed until next window */}

        {countdowns.length > 0 && <CountdownSlideshow countdowns={countdowns} />}

        {/* ── Tab content with proper loading states ── */}
        {tabLoading ? (
          <TabSpinner />
        ) : tab === "signings" ? (
          <div style={{ width: "100%" }}>
            {acceptedSignings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>✍️</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Signings Yet</div>
              </div>
            ) : acceptedSignings.map(offer => (
              <div key={offer.id} style={{ padding: "24px 28px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "20px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>{offer.playerName}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", marginTop: "4px" }}>{offer.playerClub}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <span style={{ background: offer.type === "buy" ? "rgba(255,20,147,0.2)" : offer.type === "loan" ? "rgba(0,150,255,0.2)" : "rgba(255,170,0,0.2)", color: offer.type === "buy" ? "#FF1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44", padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
                    <span style={{ background: "rgba(0,255,136,0.15)", color: "#00ff88", padding: "5px 14px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700 }}>✅ SIGNED</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    ["From", offer.fromClub || offer.fromManagerName],
                    [offer.type === "loan" ? "Loan Fee" : "Transfer Fee", offer.offerAmount || offer.loanAmount || offer.bidAmount],
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
              </div>
            ))}
          </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", width: "100%" }}>
            {isAdmin && <NewAuctionCard onClick={() => setShowNewAuction(true)} />}
            {currentTabPlayers.map(player => (
              <div key={player.id} style={{ position: "relative" }}>
                <AuctionGridCard player={player} bidCount={auctionBids[player.id] || 0} onClick={() => { setSelectedAuction(player); setSelectedAuctionId(player.id); }} />
                {isAdmin && (
                  <button onClick={() => handleDeletePlayer(player.id)} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(255,0,0,0.8)", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", zIndex: 10 }}>🗑️</button>
                )}
              </div>
            ))}
            {currentTabPlayers.length === 0 && !isAdmin && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🔨</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Auctions Yet</div>
              </div>
            )}
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
                  <button onClick={() => setVisibleCount(v => v + 12)} style={{ padding: "20px 60px", background: "rgba(255,20,147,0.12)", border: "2px solid rgba(255,20,147,0.5)", borderRadius: "16px", color: "#fff", fontWeight: 800, fontSize: "1.2rem", cursor: "pointer", letterSpacing: "1px" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#fff"; }}>
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
        {selectedAuction && <AuctionBidModal player={selectedAuction} playerId={selectedAuctionId} isAdmin={isAdmin} windowOpen={windowOpen} onClose={() => { setSelectedAuction(null); setSelectedAuctionId(null); }} />}
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

      <Modal active={showWindowModal} onClose={() => setShowWindowModal(false)} wide>
        <TransferWindowModal onClose={() => setShowWindowModal(false)} />
      </Modal>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
