import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import TabBar from "../components/TabBar";
import Modal from "../components/Modal";
import StadiumModal from "../modals/StadiumModal";
import SquadModal from "../modals/SquadModal";
import TeamHistoryModal from "../modals/TeamHistoryModal";

const TABS = [
  { id: "stadium", label: "STADIUM" },
  { id: "squad", label: "SQUAD" },
  { id: "transfers", label: "TRANSFERS" },
  { id: "finance", label: "FINANCE" },
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

// ─── STADIUM TAB ───────────────────────────────────────────────────────────
function StadiumTab({ team }) {
  const [data, setData] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/stadium`), snap => {
      setData(snap.val());
    });
    return () => unsub();
  }, [team]);

  useEffect(() => {
    if (!data?.images?.length) return;
    timerRef.current = setInterval(() => setSlideIdx(i => (i + 1) % data.images.length), 4000);
    return () => clearInterval(timerRef.current);
  }, [data?.images?.length]);

  if (!data) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🏟️</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>No Stadium Data Yet</div>
      <div style={{ fontSize: "1rem", marginTop: "10px" }}>Admin can set up the stadium using the + menu.</div>
    </div>
  );

  const images = data.images || [];

  return (
    <div style={{ width: "100%" }}>
      {/* Slideshow or video */}
      {data.videoUrl ? (
        <div style={{ width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}>
            <source src={data.videoUrl} />
          </video>
        </div>
      ) : images.length > 0 ? (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "16px", marginBottom: "28px" }}>
          {images.map((url, i) => (
            <img key={i} src={url} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              opacity: i === slideIdx ? 1 : 0, transition: "opacity 0.7s ease",
            }} />
          ))}
          {images.length > 1 && (
            <div style={{ position: "absolute", bottom: "14px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px" }}>
              {images.map((_, i) => (
                <div key={i} onClick={() => setSlideIdx(i)} style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === slideIdx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px dashed rgba(255,20,147,0.2)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1rem" }}>No images uploaded</span>
        </div>
      )}

      {/* Stadium name & capacity */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "5px", textTransform: "uppercase", textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>
          {data.stadiumName || "STADIUM NAME"}
        </div>
        {data.location && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", marginTop: "6px", letterSpacing: "2px" }}>📍 {data.location}</div>}
        {data.capacity && (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem", marginTop: "8px" }}>
            Capacity: <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.3rem" }}>{Number(data.capacity).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {[
          { label: "Tickets Sold This Season", value: "0", icon: "🎟️" },
          { label: "Standard Ticket Price", value: data.ticketPrice ? `€${Number(data.ticketPrice).toLocaleString()}` : "—", icon: "💶" },
          { label: "Stadium Expenses Per Game", value: data.expensesPerGame ? `€${Number(data.expensesPerGame).toLocaleString()}` : "—", icon: "💸" },
          { label: "Stadium Sponsorship Deals", value: data.sponsorshipDeals || "—", icon: "🤝" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ ...GLASS, borderRadius: "16px", padding: "22px 24px" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>{icon}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{label}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.4rem" }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SQUAD TAB ──────────────────────────────────────────────────────────────
const FORMATION_LAYOUTS = {
  "4-3-3": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
    { pos: "CM", x: 25, y: 50 }, { pos: "CM", x: 50, y: 50 }, { pos: "CM", x: 75, y: 50 },
    { pos: "LW", x: 15, y: 26 }, { pos: "ST", x: 50, y: 20 }, { pos: "RW", x: 85, y: 26 },
  ],
  "4-4-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
    { pos: "LM", x: 15, y: 50 }, { pos: "CM", x: 35, y: 50 }, { pos: "CM", x: 65, y: 50 }, { pos: "RM", x: 85, y: 50 },
    { pos: "ST", x: 35, y: 24 }, { pos: "ST", x: 65, y: 24 },
  ],
  "4-2-3-1": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 15, y: 72 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 85, y: 72 },
    { pos: "CDM", x: 35, y: 56 }, { pos: "CDM", x: 65, y: 56 },
    { pos: "LW", x: 15, y: 38 }, { pos: "CAM", x: 50, y: 38 }, { pos: "RW", x: 85, y: 38 },
    { pos: "ST", x: 50, y: 20 },
  ],
  "3-5-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "CB", x: 25, y: 72 }, { pos: "CB", x: 50, y: 72 }, { pos: "CB", x: 75, y: 72 },
    { pos: "LWB", x: 10, y: 52 }, { pos: "CDM", x: 30, y: 52 }, { pos: "CM", x: 50, y: 52 }, { pos: "CM", x: 70, y: 52 }, { pos: "RWB", x: 90, y: 52 },
    { pos: "ST", x: 35, y: 24 }, { pos: "ST", x: 65, y: 24 },
  ],
};

function SquadTab({ team }) {
  const [squad, setSquad] = useState([]);
  const [formation, setFormation] = useState("4-3-3");

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, `career_team_management/${team}/squad`), snap => {
      const data = snap.val();
      setSquad(data ? Object.values(data) : []);
    });
    const fUnsub = onValue(ref(db, `career_team_management/${team}/formation`), snap => {
      if (snap.val()) setFormation(snap.val());
    });
    return () => { unsub(); fUnsub(); };
  }, [team]);

  const startingPlayers = squad.filter(p => p.role === "starting");
  const benchPlayers = squad.filter(p => p.role === "bench");
  const slots = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-3-3"];

  if (squad.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>👥</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>No Squad Set Up</div>
      <div style={{ fontSize: "1rem", marginTop: "10px" }}>Admin can set up squad using the + menu.</div>
    </div>
  );

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <span style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px" }}>{formation}</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", marginLeft: "12px" }}>· {startingPlayers.length}/11 Starting</span>
      </div>

      {/* Pitch */}
      <div style={{ position: "relative", width: "100%", paddingBottom: "140%", background: "linear-gradient(180deg, #1a5c1a 0%, #2d8c2d 20%, #1a5c1a 40%, #2d8c2d 60%, #1a5c1a 80%, #2d8c2d 100%)", borderRadius: "16px", border: "3px solid rgba(255,255,255,0.15)", overflow: "hidden", marginBottom: "28px" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 140" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <rect x="22" y="118" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        </svg>
        {slots.map((slot, i) => {
          const player = startingPlayers[i];
          return (
            <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
              <div style={{ width: "40px", height: "40px", background: player ? "#FF1493" : "rgba(255,255,255,0.15)", borderRadius: "8px", border: player ? "2px solid #fff" : "2px dashed rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: player ? "0 2px 12px rgba(255,20,147,0.7)" : "none" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: "0.85rem" }}>{player ? (player.shirtNumber || "#") : slot.pos}</span>
              </div>
              <div style={{ color: player ? "#fff" : "rgba(255,255,255,0.3)", fontSize: "0.6rem", fontWeight: 700, marginTop: "3px", textAlign: "center", maxWidth: "52px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.9)", background: "rgba(0,0,0,0.45)", borderRadius: "4px", padding: "1px 5px" }}>
                {player ? player.name.split(" ").pop() : slot.pos}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bench */}
      {benchPlayers.length > 0 && (
        <div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700, marginBottom: "14px" }}>Bench ({benchPlayers.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
            {benchPlayers.map((p, i) => (
              <div key={i} style={{ ...GLASS, borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "34px", height: "34px", background: "rgba(255,255,255,0.1)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>{p.shirtNumber || "#"}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{p.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{p.position}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRANSFERS TAB ──────────────────────────────────────────────────────────
function TransfersTab({ team }) {
  const [allPlayers, setAllPlayers] = useState([]);

  useEffect(() => {
    if (!team) return;
    const tabs = ["topTargets", "listed", "scouts", "signings", "auction", "negotiations"];
    const unsubs = tabs.map(t =>
      onValue(ref(db, `${PATHS.transfers}/${t}`), snap => {
        const data = snap.val();
        if (!data) return;
        const players = Object.entries(data)
          .map(([id, p]) => ({ id, tab: t, ...p }))
          .filter(p => p.club === team || p.listedBy?.includes(team) || p.fromClub === team || p.toClub === team);
        setAllPlayers(prev => {
          const filtered = prev.filter(p => p.tab !== t);
          return [...filtered, ...players];
        });
      })
    );
    return () => unsubs.forEach(u => u());
  }, [team]);

  if (allPlayers.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>💸</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px" }}>No Transfer Activity</div>
    </div>
  );

  return (
    <div>
      {allPlayers.map(p => (
        <div key={p.id} style={{ ...GLASS, borderRadius: "16px", padding: "20px 24px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{p.name}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", marginTop: "4px" }}>{p.club} · {p.position}</div>
            {p.listedBy && <div style={{ color: "#FF1493", fontSize: "0.85rem", marginTop: "4px" }}>Listed by {p.listedBy}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem" }}>{p.value || p.price || "—"}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", marginTop: "4px" }}>{p.tab}</div>
            {p.listingType && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>{p.listingType === "loan" ? `Loan · ${p.loanTerm}` : "For Sale"}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FINANCE TAB ────────────────────────────────────────────────────────────
const MONTHS = ["May", "Jun", "Jul", "Aug"];
const INCOME_DATA = [32, 28, 41, 50]; // in millions
const EXPENSE_DATA = [24, 31, 35, 27];

function FinanceTab() {
  const maxVal = Math.max(...INCOME_DATA, ...EXPENSE_DATA) * 1.2;
  const barAreaH = 280;

  return (
    <div>
      {/* Chart */}
      <div style={{ ...GLASS, borderRadius: "20px", padding: "32px", marginBottom: "28px" }}>
        <div style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px", marginBottom: "28px" }}>📈 FINANCIAL OVERVIEW</div>

        <div style={{ position: "relative", height: `${barAreaH + 40}px`, width: "100%" }}>
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(pct => {
            const val = (maxVal * pct / 100).toFixed(0);
            return (
              <div key={pct} style={{ position: "absolute", left: 0, top: `${barAreaH - (barAreaH * pct / 100)}px`, color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", transform: "translateY(-50%)", width: "40px", textAlign: "right" }}>
                €{val}M
              </div>
            );
          })}

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} style={{ position: "absolute", left: "48px", right: 0, top: `${barAreaH - (barAreaH * pct / 100)}px`, borderTop: "1px dashed rgba(255,255,255,0.08)" }} />
          ))}

          {/* Bars */}
          <div style={{ position: "absolute", left: "48px", right: 0, bottom: "40px", top: 0, display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: "8px" }}>
            {MONTHS.map((month, i) => {
              const incH = (INCOME_DATA[i] / maxVal) * barAreaH;
              const expH = (EXPENSE_DATA[i] / maxVal) * barAreaH;
              return (
                <div key={month} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: "0" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: `${barAreaH}px` }}>
                    {/* Income bar */}
                    <div style={{ flex: 1, height: `${incH}px`, background: "linear-gradient(to top, #FF1493, #ff69b4)", borderRadius: "6px 6px 0 0", position: "relative", minWidth: "24px", transition: "height 0.5s" }}>
                      <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", color: "#FF1493", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>€{INCOME_DATA[i]}M</div>
                    </div>
                    {/* Expense bar */}
                    <div style={{ flex: 1, height: `${expH}px`, background: "linear-gradient(to top, #000033, #001a66)", borderRadius: "6px 6px 0 0", border: "1px solid rgba(0,100,255,0.4)", position: "relative", minWidth: "24px", transition: "height 0.5s" }}>
                      <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", color: "#4488ff", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>€{EXPENSE_DATA[i]}M</div>
                    </div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 700, marginTop: "8px" }}>{month}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "28px", justifyContent: "center", marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "20px", height: "20px", background: "#FF1493", borderRadius: "4px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", fontWeight: 600 }}>Income</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "20px", height: "20px", background: "#000033", border: "1px solid rgba(0,100,255,0.5)", borderRadius: "4px" }} />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", fontWeight: 600 }}>Expenses</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Income breakdown */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px", marginBottom: "20px" }}>💰 INCOME</div>
          {[
            ["Player Sales", "€0"],
            ["Player Loans", "€0"],
            ["Stadium Income", "€0"],
            ["Sponsorship", "€0"],
            ["Broadcasting", "€0"],
            ["Shirt Sales", "€0"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem" }}>{label}</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Expense breakdown */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "28px" }}>
          <div style={{ color: "#4488ff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "2px", marginBottom: "20px" }}>📤 EXPENSES</div>
          {[
            ["Player Wages", "€0"],
            ["Staff Wages", "€0"],
            ["Facility Expenses", "€0"],
            ["Taxes", "€0"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem" }}>{label}</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function TeamManagementPage() {
  const { isAdmin, manager, teamIconsCache } = useAdmin();
  const [tab, setTab] = useState("stadium");
  const [balance, setBalance] = useState(1_000_000_000);
  const [teamIcon, setTeamIcon] = useState(null);

  // Admin menu
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showStadiumModal, setShowStadiumModal] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const team = isAdmin ? manager?.team : manager?.team;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "40px 20px" }}>
          <div style={{ ...GLASS, borderRadius: "24px", padding: "48px 36px", maxWidth: "480px", width: "100%", textAlign: "center" }}>
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
      <Navbar
        extraActions={
          isAdmin && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAdminMenuOpen(v => !v)}
                style={{ padding: "10px 18px", background: "#FF1493", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}
              >
                ➕ Manage
              </button>
              {adminMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: "#0a0015", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "16px", padding: "8px", minWidth: "220px", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  {[
                    { label: "🏟️ Team Stadiums", action: () => { setShowStadiumModal(true); setAdminMenuOpen(false); } },
                    { label: "👥 View Team Squads", action: () => { setShowSquadModal(true); setAdminMenuOpen(false); } },
                    { label: "📜 View Team History", action: () => { setShowHistoryModal(true); setAdminMenuOpen(false); } },
                    { label: "💰 View Team Finances", action: () => { setTab("finance"); setAdminMenuOpen(false); } },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{ display: "block", width: "100%", padding: "14px 18px", background: "transparent", border: "none", color: "#fff", textAlign: "left", cursor: "pointer", fontSize: "1rem", fontWeight: 600, borderRadius: "10px", transition: "background 0.2s" }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.15)"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
          )
        }
      />

      <div style={{ padding: "32px 20px 80px" }}>
        {/* Team header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ width: "100px", height: "100px", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {teamIcon ? (
              <img src={teamIcon} alt={manager.team} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))" }} />
            ) : (
              <div style={{ width: "100px", height: "100px", background: "rgba(255,20,147,0.1)", border: "2px solid rgba(255,20,147,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>🏟️</div>
            )}
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "5px", color: "#fff", margin: "0 0 6px" }}>
            {manager.team || "No Club Assigned"}
          </h1>
          <div style={{ marginTop: "12px" }}>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "4px" }}>Transfer Budget</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 7vw, 4.5rem)", letterSpacing: "4px", background: "linear-gradient(135deg, #FF1493, #ff69b4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1, filter: "drop-shadow(0 0 20px rgba(255,20,147,0.4))" }}>
              {formatBalance(balance)}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,20,147,0.4), transparent)", marginBottom: "28px" }} />

        <div style={{ marginBottom: "24px" }}>
          <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
        </div>

        {/* Tab content - full width no max-width */}
        <div style={{ width: "100%" }}>
          {tab === "stadium" && <StadiumTab team={team} />}
          {tab === "squad" && <SquadTab team={team} />}
          {tab === "transfers" && <TransfersTab team={team} />}
          {tab === "finance" && <FinanceTab />}
        </div>
      </div>

      {/* Admin modals */}
      <Modal active={showStadiumModal} onClose={() => setShowStadiumModal(false)} wide>
        <StadiumModal team={team} onClose={() => setShowStadiumModal(false)} />
      </Modal>
      <Modal active={showSquadModal} onClose={() => setShowSquadModal(false)} wide>
        <SquadModal team={team} onClose={() => setShowSquadModal(false)} />
      </Modal>
      <Modal active={showHistoryModal} onClose={() => setShowHistoryModal(false)} wide>
        <TeamHistoryModal team={team} onClose={() => setShowHistoryModal(false)} />
      </Modal>

      <style>{`select option { background: #000033; color: #fff; } input::placeholder { color: rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
