import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { db, PATHS } from "../firebase";
import { ref, onValue, get } from "firebase/database";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const TABS = [
  { id: "stadium", label: "STADIUM" },
  { id: "squad", label: "TEAM" },
  { id: "transfers", label: "TRANSFERS" },
  { id: "finance", label: "FINANCE" },
];

const INCOME_CATEGORIES = ["Player Sales","Player Loaned Out","Stadium Income","Sponsorship","Broadcasting","Shirt Sales"];
const EXPENSE_CATEGORIES = ["Player Wages","Staff Wages","Facility Expenses","Taxes","Stadium Upgrade","Player Purchase","Player Loan In","Fines","Recurring Expense"];
const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ALL_LEAGUES = ["premier","laliga","seriea","bundesliga","ligue1","ucl","uel"];

function formatAmount(num) {
  if (num >= 1_000_000_000) return `€${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `€${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `€${(num / 1_000).toFixed(0)}K`;
  return `€${Number(num).toLocaleString()}`;
}

function getSASTMonthIndex() {
  return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Johannesburg", month: "numeric" }).format(new Date())) - 1;
}

function formatDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── READ-ONLY STADIUM TAB ─────────────────────────────────────────────────────
function ReadOnlyStadiumTab({ team }) {
  const [data, setData] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [homeGamesCount, setHomeGamesCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/stadium`), snap => setData(snap.val()));
    return () => unsub();
  }, [team]);

  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    async function fetchHomeGames() {
      let total = 0;
      for (const league of ALL_LEAGUES) {
        try {
          const seasonsSnap = await get(ref(db, `career_${league}/seasons`));
          if (!seasonsSnap.val()) continue;
          const seasonKeys = Object.keys(seasonsSnap.val()).sort();
          const activeKey = seasonKeys[seasonKeys.length - 1];
          const resultsSnap = await get(ref(db, `career_${league}/seasons/${activeKey}/results`));
          if (!resultsSnap.val()) continue;
          total += Object.values(resultsSnap.val()).filter(r => r.homeTeam === team && r.forfeitType !== "no_contest").length;
        } catch (e) { /* skip */ }
      }
      if (!cancelled) setHomeGamesCount(total);
    }
    fetchHomeGames();
    return () => { cancelled = true; };
  }, [team]);

  useEffect(() => {
    if (!data?.images?.length) return;
    timerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % data.images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [data?.images?.length]);

  if (!data) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🏟️</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", letterSpacing: "3px" }}>No Stadium Data Yet</div>
    </div>
  );

  const images = data.images || [];
  const capacity = data?.capacity ? Number(data.capacity) : 0;
  const ticketPrice = data?.ticketPrice ? Number(data.ticketPrice) : 0;
  const stadiumIncome = homeGamesCount * capacity * ticketPrice;

  return (
    <div style={{ width: "100%" }}>
      {data.videoUrl ? (
        <div style={{ width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}>
            <source src={data.videoUrl} />
          </video>
        </div>
      ) : images.length > 0 ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          {images.map((url, i) => (
            <img key={i} src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === slideIdx ? 1 : 0, transition: "opacity 0.7s ease" }} />
          ))}
          {images.length > 1 && (
            <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px" }}>
              {images.map((_, i) => (
                <div key={i} onClick={() => setSlideIdx(i)} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === slideIdx ? "#ffffff" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px dashed rgba(255,20,147,0.2)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.4rem" }}>No images uploaded</span>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ color: "#ffffff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.4rem, 6vw, 5rem)", letterSpacing: "5px", textTransform: "uppercase", textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>
          {data.stadiumName || "STADIUM NAME"}
        </div>
        {data.location && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.6rem", marginTop: "6px", letterSpacing: "2px" }}>📍 {data.location}</div>}
        {data.capacity && (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.6rem", marginTop: "8px" }}>
            Capacity: <span style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{Number(data.capacity).toLocaleString()}</span>
          </div>
        )}
        {data.underConstruction && (
          <div style={{ marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "20px", padding: "8px 20px" }}>
            <span style={{ fontSize: "1.4rem" }}>🏗️</span>
            <span style={{ color: "#ffaa44", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "2px" }}>STADIUM UNDER CONSTRUCTION</span>
          </div>
        )}
      </div>

      <div style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", marginBottom: "28px" }}>
        {[
          { label: "🎟️ Tickets Sold This Season", value: capacity > 0 ? `${(homeGamesCount * capacity).toLocaleString()} (${homeGamesCount} home games)` : "—" },
          { label: "💶 Standard Ticket Price", value: data.ticketPrice ? `€${Number(data.ticketPrice).toLocaleString()}` : "—" },
          { label: "💰 Stadium Income", value: stadiumIncome > 0 ? `€${stadiumIncome.toLocaleString()}` : "—" },
          { label: "💸 Stadium Expenses Per Game", value: data.expensesPerGame ? `€${Number(data.expensesPerGame).toLocaleString()}` : "—" },
          { label: "🤝 Sponsorship Deals", value: data.sponsorshipDeals || "—" },
        ].map(({ label, value }, i) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 56px", borderBottom: i < 4 ? "1px solid rgba(255,20,147,0.1)" : "none", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "2.6rem" }}>{label}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "2.8rem" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── READ-ONLY SQUAD TAB ───────────────────────────────────────────────────────
function ReadOnlySquadTab({ team, teamIcon, manager }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/squad`), snap => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, [team]);

  const startingPlayers = players.filter(p => p.role === "starting").sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
  const benchPlayers = players.filter(p => p.role === "bench").sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));

  return (
    <div>
      {/* Manager info */}
      {manager && (
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2.5px solid #FF1493", overflow: "hidden", background: "rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {manager.profilePhoto
              ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "2rem" }}>👤</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.3rem" }}>@{manager.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", marginTop: "2px" }}>Manager</div>
          </div>
          {teamIcon && <img src={teamIcon} alt={team} style={{ width: "56px", height: "56px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,20,147,0.4))" }} />}
        </div>
      )}

      {players.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>👥</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: "3px" }}>No Team Set Up Yet</div>
        </div>
      ) : (
        <>
          {startingPlayers.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "14px" }}>
                Starting XI ({startingPlayers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {startingPlayers.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "14px" }}>
                    <div style={{ width: "42px", height: "42px", background: "#FF1493", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "1rem", flexShrink: 0 }}>
                      {p.shirtNumber || "#"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>{p.position}{p.age ? ` · ${p.age} yrs` : ""}{p.nationality ? ` · ${p.nationality}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {p.overall && <span style={{ background: "rgba(255,20,147,0.15)", color: "#FF1493", borderRadius: "8px", padding: "2px 10px", fontSize: "0.82rem", fontWeight: 700 }}>OVR {p.overall}</span>}
                      {p.wage && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>{p.wage}/wk</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {benchPlayers.length > 0 && (
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "14px" }}>
                Bench ({benchPlayers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {benchPlayers.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px" }}>
                    <div style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "1rem", flexShrink: 0 }}>
                      {p.shirtNumber || "#"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>{p.position}{p.age ? ` · ${p.age} yrs` : ""}{p.nationality ? ` · ${p.nationality}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {p.overall && <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "2px 10px", fontSize: "0.82rem", fontWeight: 700 }}>OVR {p.overall}</span>}
                      {p.wage && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>{p.wage}/wk</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── READ-ONLY TRANSFERS TAB ───────────────────────────────────────────────────
function ReadOnlyTransfersTab({ team, teamIcons }) {
  const [negotiations, setNegotiations] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `${PATHS.transfers}/negotiations`), snap => {
      const data = snap.val();
      setNegotiations(data ? Object.entries(data).map(([id, n]) => ({ id, ...n })) : []);
    });
    return () => unsub();
  }, [team]);

  const offersReceived = negotiations.filter(n => n.toClub === team || n.playerClub === team);
  const offersSent = negotiations.filter(n => n.fromClub === team);

  const statusColors = { pending: "#ffaa44", accepted: "#00ff88", rejected: "#ff6b6b", cancelled: "#aaaaaa" };

  const OfferCard = ({ offer }) => {
    const statusColor = statusColors[offer.status] || "#ffaa44";
    const typeColor = offer.type === "buy" ? "#ff1493" : offer.type === "loan" ? "#44aaff" : "#ffaa44";
    const clubLogo = teamIcons?.[offer.playerClub] || teamIcons?.[offer.fromClub];
    return (
      <div onClick={() => setSelectedOffer(offer)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,20,147,0.18)", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "all 0.2s" }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; }}
        onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.18)"; }}>
        <div style={{ width: "48px", height: "48px", flexShrink: 0 }}>
          {clubLogo ? <img src={clubLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "2rem" }}>⚽</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{offer.playerName}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>{offer.playerClub} · From: {offer.fromClub || offer.fromManagerName}</div>
          <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.1rem", marginTop: "2px" }}>{offer.offerAmount || offer.loanAmount || offer.bidAmount || "—"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
          <span style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}`, borderRadius: "8px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.type}</span>
          <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}`, borderRadius: "8px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{offer.status}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: "2px", marginBottom: "20px" }}>📥 OFFERS RECEIVED <span style={{ background: "rgba(0,255,136,0.15)", border: "1px solid #00ff88", borderRadius: "20px", padding: "2px 20px", fontSize: "1.8rem" }}>{offersReceived.length}</span></div>
          {offersReceived.length === 0 ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem" }}>No Offers Received</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{offersReceived.map(o => <OfferCard key={o.id} offer={o} />)}</div>}
        </div>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.6rem", letterSpacing: "2px", marginBottom: "20px" }}>📤 OFFERS SENT <span style={{ background: "rgba(255,255,255,0.1)", border: "1px solid #fff", borderRadius: "20px", padding: "2px 20px", fontSize: "1.8rem" }}>{offersSent.length}</span></div>
          {offersSent.length === 0 ? <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem" }}>No Offers Sent</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{offersSent.map(o => <OfferCard key={o.id} offer={o} />)}</div>}
        </div>
      </div>

      {selectedOffer && ReactDOM.createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setSelectedOffer(null)}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "36px", maxWidth: "520px", width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedOffer(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "2px", marginBottom: "6px" }}>{selectedOffer.playerName}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.1rem", marginBottom: "20px" }}>{selectedOffer.playerClub}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                ["From Club", selectedOffer.fromClub],
                ["Manager", selectedOffer.fromManagerName],
                ["To Club", selectedOffer.toClub || selectedOffer.playerClub],
                ["Amount", selectedOffer.offerAmount || selectedOffer.loanAmount || selectedOffer.bidAmount],
                selectedOffer.contractLength && ["Contract", selectedOffer.contractLength],
                selectedOffer.loanTerm && ["Loan Term", selectedOffer.loanTerm],
                selectedOffer.wage && ["Wage", selectedOffer.wage],
                ["Sent", formatDateTime(selectedOffer.createdAt)],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── READ-ONLY FINANCE TAB ─────────────────────────────────────────────────────
function ReadOnlyFinanceTab({ team }) {
  const [transactions, setTransactions] = useState([]);
  const scrollRef = useRef(null);
  const currentMonthIndex = getSASTMonthIndex();

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/finance/transactions`), snap => {
      const data = snap.val();
      setTransactions(data ? Object.entries(data).map(([id, t]) => ({ id, ...t })).sort((a, b) => b.createdAt - a.createdAt) : []);
    });
    return () => unsub();
  }, [team]);

  const chartData = ALL_MONTHS.map((_, mIdx) => {
    if (mIdx > currentMonthIndex || mIdx < 4) return { income: 0, expense: 0, empty: true };
    const monthTxs = transactions.filter(t => t.monthIndex === mIdx);
    return {
      income: monthTxs.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0),
      expense: monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0),
      empty: false,
    };
  });

  const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1) * 1.2;
  const barAreaH = 400;

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const netPL = totalIncome - totalExpense;
  const isProfit = netPL >= 0;

  const incomeTotals = {};
  const expenseTotals = {};
  INCOME_CATEGORIES.forEach(c => { incomeTotals[c] = transactions.filter(t => t.type === "income" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0); });
  EXPENSE_CATEGORIES.forEach(c => { expenseTotals[c] = transactions.filter(t => t.type === "expense" && t.category === c).reduce((s, t) => s + (Number(t.amount) || 0), 0); });

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, (currentMonthIndex - 4) * 128 - 100);
  }, [currentMonthIndex]);

  return (
    <div>
      <div style={{ ...GLASS, borderRadius: "20px", padding: "48px", marginBottom: "32px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px", marginBottom: "32px" }}>📈 FINANCIAL OVERVIEW</div>
        <div ref={scrollRef} style={{ width: "100%", overflowX: "auto", paddingBottom: "16px" }}>
          <div style={{ minWidth: `${12 * 100 + 11 * 8 + 60}px`, position: "relative", height: `${barAreaH + 60}px` }}>
            <div style={{ position: "absolute", left: "60px", right: 0, bottom: "50px", top: 0, display: "flex", alignItems: "flex-end", gap: "8px" }}>
              {ALL_MONTHS.map((month, i) => {
                const d = chartData[i];
                const incH = d.empty || d.income === 0 ? 0 : (d.income / maxVal) * barAreaH;
                const expH = d.empty || d.expense === 0 ? 0 : (d.expense / maxVal) * barAreaH;
                const isActive = i === currentMonthIndex && !d.empty;
                return (
                  <div key={month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 100px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: `${barAreaH}px` }}>
                      <div style={{ flex: 1, height: `${Math.max(incH, 0)}px`, minWidth: "28px", background: d.empty ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #ff1493, #ff69b4)", borderRadius: "6px 6px 0 0", border: isActive ? "2px solid #fff" : "none" }} />
                      <div style={{ flex: 1, height: `${Math.max(expH, 0)}px`, minWidth: "28px", background: d.empty ? "rgba(255,255,255,0.04)" : "linear-gradient(to top, #000033, #001a66)", borderRadius: "6px 6px 0 0", border: isActive ? "2px solid #fff" : "1px solid rgba(0,100,255,0.3)" }} />
                    </div>
                    <div style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.4)", fontSize: "1.2rem", fontWeight: isActive ? 900 : 600, marginTop: "8px" }}>{month}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...GLASS, borderRadius: "20px", padding: "28px 40px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${isProfit ? "rgba(0,255,136,0.3)" : "rgba(255,107,107,0.3)"}`, background: isProfit ? "rgba(0,255,136,0.05)" : "rgba(255,107,107,0.05)", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginBottom: "4px" }}>Net {isProfit ? "Profit" : "Loss"}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", color: isProfit ? "#00ff88" : "#ff6b6b" }}>
            {isProfit ? "+" : "−"}{formatAmount(Math.abs(netPL))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textTransform: "uppercase", marginBottom: "4px" }}>Income</div>
            <div style={{ color: "#00ff88", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>+{formatAmount(totalIncome)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textTransform: "uppercase", marginBottom: "4px" }}>Expenses</div>
            <div style={{ color: "#ff6b6b", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem" }}>−{formatAmount(totalExpense)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "36px" }}>
          <div style={{ color: "#ff1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px", marginBottom: "20px" }}>💰 INCOME</div>
          {INCOME_CATEGORIES.map(label => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.2rem" }}>{label}</span>
              <span style={{ color: incomeTotals[label] > 0 ? "#00ff88" : "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{incomeTotals[label] > 0 ? `+${formatAmount(incomeTotals[label])}` : "€0"}</span>
            </div>
          ))}
        </div>
        <div style={{ ...GLASS, borderRadius: "20px", padding: "36px" }}>
          <div style={{ color: "#4488ff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px", marginBottom: "20px" }}>📤 EXPENSES</div>
          {EXPENSE_CATEGORIES.map(label => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.2rem" }}>{label}</span>
              <span style={{ color: expenseTotals[label] > 0 ? "#ff6b6b" : "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{expenseTotals[label] > 0 ? `−${formatAmount(expenseTotals[label])}` : "€0"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── READ-ONLY TEAM MODAL ──────────────────────────────────────────────────────
function ReadOnlyTeamModal({ manager, teamIcon, onClose }) {
  const [tab, setTab] = useState("stadium");
  const [teamIcons, setTeamIcons] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => { if (snap.val()) setTeamIcons(snap.val()); });
    return () => unsub();
  }, []);

  if (!manager) return null;

  return ReactDOM.createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,20,147,0.25)", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
        {teamIcon && <img src={teamIcon} alt={manager.team} style={{ width: "52px", height: "52px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,20,147,0.4))" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.2rem", letterSpacing: "3px" }}>{manager.team}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>@{manager.username} · Read Only</div>
        </div>
        <div style={{ background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "10px", padding: "6px 14px", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
          👁️ View Only
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", cursor: "pointer", fontSize: "1.2rem", flexShrink: 0 }}>✕</button>
      </div>

      {/* Tab Bar */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,20,147,0.15)" }}>
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px 80px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {tab === "stadium" && <ReadOnlyStadiumTab team={manager.team} />}
          {tab === "squad" && <ReadOnlySquadTab team={manager.team} teamIcon={teamIcon} manager={manager} />}
          {tab === "transfers" && <ReadOnlyTransfersTab team={manager.team} teamIcons={teamIcons} />}
          {tab === "finance" && <ReadOnlyFinanceTab team={manager.team} />}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── MANAGER CARD ──────────────────────────────────────────────────────────────
function ManagerCard({ manager, teamIcon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ ...GLASS, borderRadius: "20px", overflow: "hidden", transition: "all 0.25s", cursor: "pointer" }}
      onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.5)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,20,147,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ height: "4px", background: "linear-gradient(90deg, #FF1493, #ff69b4, transparent)" }} />
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", border: "2.5px solid #FF1493", overflow: "hidden", background: "rgba(255,20,147,0.1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(255,20,147,0.3)" }}>
              {manager.profilePhoto
                ? <img src={manager.profilePhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: "2rem" }}>👤</span>
              }
            </div>
            <div style={{ position: "absolute", bottom: "-6px", right: "-6px", background: "#FF1493", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 900, color: "#fff", border: "2px solid #0a0015" }}>
              #{manager.rank ?? 0}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{manager.username}</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", marginTop: "2px" }}>Manager</div>
          </div>
          {teamIcon && <img src={teamIcon} alt={manager.team} style={{ width: "44px", height: "44px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,20,147,0.3))", flexShrink: 0 }} />}
        </div>

        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "2px", marginBottom: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {manager.team || "No Club Assigned"}
        </div>

        <div style={{ width: "100%", padding: "14px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.45)", borderRadius: "12px", color: "#FF1493", fontWeight: 700, fontSize: "1rem", textAlign: "center", letterSpacing: "0.5px" }}>
          👁️ View Team
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function RivalsSquadPage() {
  const [managers, setManagers] = useState([]);
  const [teamIcons, setTeamIcons] = useState({});
  const [search, setSearch] = useState("");
  const [viewingManager, setViewingManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const dataReady = useRef(false);
  const timerDone = useRef(false);

  useEffect(() => {
    // 5 second minimum spinner
    const timer = setTimeout(() => {
      timerDone.current = true;
      if (dataReady.current) setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      const data = snap.val() || {};
      const mgrs = Object.entries(data)
        .filter(([, a]) => a && a.team)
        .map(([uid, a]) => ({ uid, ...a, rank: a.rank ?? 0 }))
        .sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setManagers(mgrs);
      dataReady.current = true;
      if (timerDone.current) setLoading(false);
    });
    const iconUnsub = onValue(ref(db, PATHS.teamIcons), snap => { if (snap.val()) setTeamIcons(snap.val()); });
    return () => { unsub(); iconUnsub(); };
  }, []);

  const filtered = managers.filter(m =>
    m.team?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ padding: "32px 20px 80px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem,8vw,5.5rem)", letterSpacing: "6px", color: "#fff", margin: "0 0 8px", textShadow: "0 0 40px rgba(255,20,147,0.4)" }}>
            ⚔️ RIVALS SQUADS
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "1.1rem", margin: 0 }}>
            Scout your competition — view every manager's team
          </p>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by team name or manager..."
            style={{ width: "100%", maxWidth: "600px", padding: "18px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.35)", borderRadius: "16px", color: "#fff", fontFamily: "inherit", fontSize: "1.1rem", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "32px" }} />

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "24px" }}>
            <div style={{ width: "64px", height: "64px", border: "4px solid rgba(255,20,147,0.2)", borderTop: "4px solid #FF1493", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>LOADING RIVALS...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "1rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
              {filtered.length} {filtered.length === 1 ? "Manager" : "Managers"} Found
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "16px" }}>⚔️</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3rem", letterSpacing: "3px" }}>
                  {search ? "No Matches Found" : "No Managers Yet"}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {filtered.map(m => (
                  <ManagerCard
                    key={m.uid}
                    manager={m}
                    teamIcon={teamIcons[m.team]}
                    onClick={() => setViewingManager(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {viewingManager && (
        <ReadOnlyTeamModal
          manager={viewingManager}
          teamIcon={teamIcons[viewingManager.team]}
          onClose={() => setViewingManager(null)}
        />
      )}

      <style>{`input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
