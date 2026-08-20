import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, update, get } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import Modal from "../components/Modal";
import CountdownSlideshow from "../components/CountdownSlideshow";
import PlayerPopupModal from "../modals/PlayerPopupModal";
import AddPlayerModal from "../modals/AddPlayerModal";
import ListPlayerModal from "../modals/ListPlayerModal";
import { getClubColors } from "../utils/groq";

const TABS = [
  { id: "topTargets", label: "TOP TARGETS" },
  { id: "listed", label: "LISTED" },
  { id: "scouts", label: "SCOUTS" },
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

// Big grid card — 3 columns like home page
function PlayerGridCard({ player, teamIcons, onClick }) {
  const clubLogo = teamIcons?.[player.club];
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,20,147,0.18)",
      borderRadius: "20px",
      overflow: "hidden",
      cursor: "pointer",
      transition: "all 0.25s",
      display: "flex",
      flexDirection: "column",
    }}
      onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Image / Shirt area */}
      <div style={{ width: "100%", aspectRatio: "1/1", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
        {player.imageUrl ? (
          <img src={player.imageUrl} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "70%", height: "70%" }}>
            <ShirtSVG clubName={player.club} playerName={player.name} squadNumber={player.squadNumber} />
          </div>
        )}
        {/* OVR badge */}
        {player.overall && (
          <div style={{ position: "absolute", top: "10px", left: "10px", background: "rgba(255,20,147,0.9)", borderRadius: "8px", padding: "4px 10px", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "1px" }}>
            OVR {player.overall}
          </div>
        )}
        {/* Listed by badge */}
        {player.listedBy && (
          <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.7)", borderRadius: "8px", padding: "4px 10px", color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 700 }}>
            by {player.listedBy}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{player.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {clubLogo ? (
            <img src={clubLogo} alt={player.club} style={{ width: "20px", height: "20px", objectFit: "contain" }} />
          ) : <span>⚽</span>}
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem" }}>{player.club}</span>
        </div>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "1px" }}>
          {player.value || player.price || "—"}
        </div>

        {/* More Info button */}
        <button
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{
            marginTop: "auto", padding: "12px", background: "rgba(255,20,147,0.12)",
            border: "1px solid rgba(255,20,147,0.4)", borderRadius: "12px",
            color: "#FF1493", fontWeight: 700, fontSize: "0.95rem",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
        >
          More Info →
        </button>
      </div>
    </div>
  );
}

function NegotiationCard({ offer, isOwn, isAdmin }) {
  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b" };
  const statusColor = statusColors[offer.status] || "#ffaa44";
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleAccept() {
    setProcessing(true);
    setActionError("");
    try {
      const amt = Number((offer.offerAmount || offer.loanAmount || offer.bidAmount || "0").replace(/[^0-9.]/g, ""));
      const now = new Date();
      const monthIndex = now.getMonth();
      const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthIndex];
      const year = now.getFullYear();
      const accountsSnap = await get(ref(db, PATHS.accounts));
      const accounts = accountsSnap.val() || {};

      // Buying club — expense
      if (offer.fromClub && amt > 0) {
        const buyerEntry = Object.entries(accounts).find(([, a]) => a.team === offer.fromClub && a.role === "manager");
        if (buyerEntry) {
          const [buyerUid, buyerData] = buyerEntry;
          const buyerBalance = buyerData.balance ?? 1_000_000_000;
          await update(ref(db, `${PATHS.accounts}/${buyerUid}`), { balance: Math.max(0, buyerBalance - amt) });
          await push(ref(db, `career_team_management/${offer.fromClub}/finance/transactions`), {
            type: "expense", category: "Player Wages",
            source: offer.playerName, amount: amt,
            month: monthName, monthIndex, year, createdAt: Date.now(),
          });
        }
      }

      // Selling club — income
      const sellingClub = offer.toClub || offer.playerClub;
      if (sellingClub && amt > 0) {
        const sellerEntry = Object.entries(accounts).find(([, a]) => a.team === sellingClub && a.role === "manager");
        if (sellerEntry) {
          const [sellerUid, sellerData] = sellerEntry;
          const sellerBalance = sellerData.balance ?? 1_000_000_000;
          await update(ref(db, `${PATHS.accounts}/${sellerUid}`), { balance: sellerBalance + amt });
          await push(ref(db, `career_team_management/${sellingClub}/finance/transactions`), {
            type: "income", category: "Player Sales",
            source: offer.playerName, amount: amt,
            month: monthName, monthIndex, year, createdAt: Date.now(),
          });
        }
      }

      await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "accepted" });
    } catch (e) {
      setActionError("Failed: " + e.message);
    }
    setProcessing(false);
  }

  async function handleReject() {
    setProcessing(true);
    setActionError("");
    try {
      await update(ref(db, `${PATHS.transfers}/negotiations/${offer.id}`), { status: "rejected" });
    } catch (e) {
      setActionError("Failed: " + e.message);
    }
    setProcessing(false);
  }

  return (
    <div style={{
      padding: "24px 28px",
      background: isOwn ? "rgba(255,20,147,0.1)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isOwn ? "rgba(255,20,147,0.4)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "20px", marginBottom: "14px",
    }}>
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
        ].filter(Boolean).map(([label, value]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 16px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{value || "—"}</div>
          </div>
        ))}
      </div>
      {isOwn && <div style={{ marginTop: "10px", color: "#FF1493", fontSize: "0.9rem", fontWeight: 700 }}>YOUR OFFER</div>}

      {/* Admin Accept / Reject buttons */}
      {isAdmin && offer.status === "pending" && (
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={handleAccept}
            disabled={processing}
            style={{ flex: 1, padding: "12px", background: processing ? "rgba(0,204,102,0.2)" : "#00cc66", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}
          >
            {processing ? "Processing..." : "✅ Accept"}
          </button>
          <button
            onClick={handleReject}
            disabled={processing}
            style={{ flex: 1, padding: "12px", background: processing ? "rgba(255,68,68,0.2)" : "rgba(255,68,68,0.8)", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: processing ? "not-allowed" : "pointer" }}
          >
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
  const [players, setPlayers] = useState({});
  const [negotiations, setNegotiations] = useState([]);
  const [countdowns, setCountdowns] = useState([]);
  const [headlineVideo, setHeadlineVideo] = useState("");
  const [teamIcons, setTeamIcons] = useState({});
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ club: "", nationality: "", position: "", priceSort: "" });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const tabs = ["topTargets", "listed", "scouts", "signings", "auction"];
    const unsubs = tabs.map(t =>
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        setPlayers(prev => ({
          ...prev,
          [t]: data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : [],
        }));
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

  const currentTabPlayers = (players[tab] || []).sort((a, b) => {
    const av = Number((a.value || a.price || "").replace(/[^0-9]/g, "") || 0);
    const bv = Number((b.value || b.price || "").replace(/[^0-9]/g, "") || 0);
    return bv - av;
  });

  const filteredPlayers = currentTabPlayers.filter(p => {
    const s = search.toLowerCase();
    if (s && !p.name?.toLowerCase().includes(s)) return false;
    if (filters.club && p.club?.toLowerCase() !== filters.club.toLowerCase()) return false;
    if (filters.nationality && p.nationality?.toLowerCase() !== filters.nationality.toLowerCase()) return false;
    if (filters.position && p.position?.toLowerCase() !== filters.position.toLowerCase()) return false;
    return true;
  }).sort((a, b) => {
    if (!filters.priceSort) return 0;
    const av = Number((a.value || a.price || "").replace(/[^0-9]/g, "") || 0);
    const bv = Number((b.value || b.price || "").replace(/[^0-9]/g, "") || 0);
    return filters.priceSort === "asc" ? av - bv : bv - av;
  });

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const hasMore = filteredPlayers.length > visibleCount;

  const myNegotiations = negotiations.filter(n => n.fromManagerUid === manager?.uid);
  const otherNegotiations = negotiations.filter(n => n.fromManagerUid !== manager?.uid);
  const sortedNegotiations = [...myNegotiations, ...otherNegotiations];
  const allClubs = [...new Set(currentTabPlayers.map(p => p.club).filter(Boolean))];
  const allNationalities = [...new Set(currentTabPlayers.map(p => p.nationality).filter(Boolean))];
  const allPositions = [...new Set(currentTabPlayers.map(p => p.position).filter(Boolean))];
  const mergedIcons = { ...teamIconsCache, ...teamIcons };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar
        extraActions={
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Manager can list their own players */}
            {manager && (
              <button onClick={() => setShowListModal(true)} style={{ padding: "10px 18px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.5)", borderRadius: "10px", color: "#FF1493", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                📋 List Player
              </button>
            )}
            {/* Admin add player */}
            {isAdmin && (
              <button onClick={() => setShowAddModal(true)} style={{ padding: "10px 18px", background: "#FF1493", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
                ➕ Add Player
              </button>
            )}
          </div>
        }
      />

      {/* Headline Video */}
      {headlineVideo ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden" }}>
          <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}>
            <source src={headlineVideo} type="video/mp4" />
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

      {countdowns.length > 0 && <CountdownSlideshow countdowns={countdowns} />}

      {/* Full-width content */}
      <div style={{ padding: "24px 20px 80px" }}>
        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={t => { setTab(t); setSearch(""); setFilters({ club: "", nationality: "", position: "", priceSort: "" }); setVisibleCount(12); }} />
        </div>

        {/* Negotiations tab */}
        {tab === "negotiations" ? (
          <div style={{ width: "100%" }}>
            {sortedNegotiations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📋</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Negotiations Yet</div>
              </div>
            ) : sortedNegotiations.map(offer => (
              <NegotiationCard key={offer.id} offer={offer} isOwn={offer.fromManagerUid === manager?.uid} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          <>
            {/* Search bar — 2x bigger */}
            <div style={{ display: "flex", gap: "14px", marginBottom: "22px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "280px" }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 Search players by name..."
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <button
                onClick={() => setShowFilterPanel(v => !v)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  background: showFilterPanel ? "rgba(255,20,147,0.2)" : "rgba(255,255,255,0.06)",
                  borderColor: showFilterPanel ? "#FF1493" : "rgba(255,20,147,0.35)",
                  color: "#fff", fontWeight: 700, whiteSpace: "nowrap",
                  padding: "20px 28px", fontSize: "1.1rem",
                }}
              >
                ⚙️ Filters {Object.values(filters).some(Boolean) ? "●" : ""}
              </button>
            </div>

            {/* Filter panel */}
            {showFilterPanel && (
              <div style={{ ...GLASS, borderRadius: "18px", padding: "24px", marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                {[
                  { key: "club", label: "Club", options: allClubs },
                  { key: "nationality", label: "Nationality", options: allNationalities },
                  { key: "position", label: "Position", options: allPositions },
                ].map(({ key, label, options }) => (
                  <div key={key}>
                    <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px" }}>{label}</label>
                    <select
                      value={filters[key]}
                      onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", cursor: "pointer", padding: "14px 18px" }}
                    >
                      <option value="">All {label}s</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px" }}>Price</label>
                  <select value={filters.priceSort} onChange={e => setFilters(prev => ({ ...prev, priceSort: e.target.value }))} style={{ ...inputStyle, width: "100%", cursor: "pointer", padding: "14px 18px" }}>
                    <option value="">Default</option>
                    <option value="desc">Highest First</option>
                    <option value="asc">Lowest First</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button onClick={() => setFilters({ club: "", nationality: "", position: "", priceSort: "" })} style={{ ...inputStyle, cursor: "pointer", color: "#FF1493", fontWeight: 700, padding: "14px 20px", whiteSpace: "nowrap" }}>Clear Filters</button>
                </div>
              </div>
            )}

            {/* Players grid — 3 columns full width */}
            {filteredPlayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚽</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "2px" }}>No Players Found</div>
                <div style={{ fontSize: "1rem", marginTop: "10px" }}>
                  {isAdmin ? "Use the + button above to add players." : "Check back soon."}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%" }}>
                  {visiblePlayers.map(player => (
                    <PlayerGridCard
                      key={player.id}
                      player={player}
                      teamIcons={mergedIcons}
                      onClick={() => { setSelectedPlayer(player); setSelectedPlayerId(player.id); }}
                    />
                  ))}
                </div>

                {/* Search More button */}
                {hasMore && (
                  <div style={{ textAlign: "center", marginTop: "40px" }}>
                    <button
                      onClick={() => setVisibleCount(v => v + 12)}
                      style={{
                        padding: "20px 60px",
                        background: "rgba(255,20,147,0.12)",
                        border: "2px solid rgba(255,20,147,0.5)",
                        borderRadius: "16px",
                        color: "#FF1493",
                        fontWeight: 800,
                        fontSize: "1.2rem",
                        cursor: "pointer",
                        letterSpacing: "1px",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = "#FF1493"; e.currentTarget.style.color = "#fff"; }}
                      onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.12)"; e.currentTarget.style.color = "#FF1493"; }}
                    >
                      🔍 Search More ({filteredPlayers.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Player popup modal */}
      <Modal active={!!selectedPlayer} onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }} wide>
        {selectedPlayer && (
          <PlayerPopupModal
            player={selectedPlayer}
            playerId={selectedPlayerId}
            playerTab={tab}
            teamIcons={mergedIcons}
            onClose={() => { setSelectedPlayer(null); setSelectedPlayerId(null); }}
          />
        )}
      </Modal>

      {/* Add Player modal (admin) */}
      <Modal active={showAddModal} onClose={() => setShowAddModal(false)} wide>
        <AddPlayerModal onClose={() => setShowAddModal(false)} isAdmin={isAdmin} />
      </Modal>

      {/* List Player modal (managers) */}
      <Modal active={showListModal} onClose={() => setShowListModal(false)} wide>
        <ListPlayerModal onClose={() => setShowListModal(false)} />
      </Modal>

      <style>{`
        select option { background: #000033; color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
