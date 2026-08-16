import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import Modal from "../components/Modal";
import { useAdmin } from "../context/AdminContext";

const YEAR = 2026;
const ALL_MONTHS = [
  { month: 3, label: "April 2026" },
  { month: 4, label: "May 2026" },
  { month: 5, label: "June 2026" },
  { month: 6, label: "July 2026" },
  { month: 7, label: "August 2026" },
  { month: 8, label: "September 2026" },
  { month: 9, label: "October 2026" },
  { month: 10, label: "November 2026" },
  { month: 11, label: "December 2026" },
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function fmtYMD(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDayLabel(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  const info = ALL_MONTHS.find(x => x.month === m - 1);
  return `${d} ${info ? info.label : ds}`;
}

function FlipCell({ pairs }) {
  const [idx, setIdx] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (pairs.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setFlipping(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % pairs.length);
        setFlipping(false);
      }, 250);
    }, 2800);
    return () => clearInterval(intervalRef.current);
  }, [pairs.length]);

  const current = pairs[idx] || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", width: "100%" }}>
      <div style={{
        width: "48px", height: "48px", perspective: "300px",
        flexShrink: 0, margin: "0 auto"
      }}>
        <div style={{
          width: "100%", height: "100%", position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.5s ease",
          transform: flipping ? "rotateY(90deg)" : "rotateY(0deg)"
        }}>
          {current.iconUrl
            ? <img src={current.iconUrl} alt={current.name || ""} style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5))" }} />
            : <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>⚽</div>
          }
        </div>
      </div>
      <div style={{ fontSize: "0.48rem", fontWeight: 700, color: "#FF1493", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.25, wordBreak: "break-word", maxWidth: "100%", padding: "0 2px" }}>
        {current.name || ""}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { isAdmin } = useAdmin();
  const [calData, setCalData] = useState({});
  const [activeMonths, setActiveMonths] = useState([3, 4, 5, 6]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamIconRegistry, setTeamIconRegistry] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [dayModalOpen, setDayModalOpen] = useState(false);

  useEffect(() => {
    const unsub1 = onValue(ref(db, "settings/calendar"), snap => {
      const d = snap.val();
      if (d?.activeMonths) setActiveMonths(d.activeMonths);
    });
    const unsub2 = onValue(ref(db, "calendarEvents"), snap => {
      setCalData(snap.val() || {});
    });
    const unsub3 = onValue(ref(db, "teamIcons"), snap => {
      setTeamIconRegistry(snap.val() || {});
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  function getTeamIcon(teamName) {
    if (!teamName) return null;
    const key = teamName.trim().replace(/\./g, "_");
    return teamIconRegistry[key] || null;
  }

  function getAllTeamNames() {
    const s = new Set();
    for (const key in teamIconRegistry) s.add(key.replace(/_/g, "."));
    for (const date in calData) {
      const ev = calData[date];
      if (ev?.tournaments) {
        for (const t of ev.tournaments) {
          for (const f of (t.fixtures || [])) {
            if (f.home) s.add(f.home.trim());
            if (f.away) s.add(f.away.trim());
          }
        }
      }
    }
    return Array.from(s).sort();
  }

  function evHasTeam(ev, team) {
    return ev?.tournaments?.some(t =>
      (t.fixtures || []).some(f =>
        (f.home || "").toLowerCase().includes(team.toLowerCase()) ||
        (f.away || "").toLowerCase().includes(team.toLowerCase())
      )
    ) || false;
  }

  function getOppIcon(ev, team) {
    const tl = team.toLowerCase();
    for (const t of (ev?.tournaments || [])) {
      for (const f of (t.fixtures || [])) {
        if ((f.home || "").toLowerCase().includes(tl)) return getTeamIcon(f.away) || f.awayIcon || null;
        if ((f.away || "").toLowerCase().includes(tl)) return getTeamIcon(f.home) || f.homeIcon || null;
      }
    }
    return null;
  }

  const selectedEv = selectedDate ? calData[selectedDate] : null;

  const GLASS = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,20,147,0.2)",
  };

  const allTeams = getAllTeamNames();
  const filteredTeams = filterSearch ? allTeams.filter(t => t.toLowerCase().includes(filterSearch.toLowerCase())) : allTeams;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 32px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "6px", color: "#FF1493", margin: 0, textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>CALENDAR</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontStyle: "italic", margin: "4px 0 0" }}>Click any date to view event details</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {selectedTeam && (
              <button onClick={() => setSelectedTeam(null)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid #FF1493", color: "#FF1493", padding: "10px 18px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>
                ✕ Clear Filter
              </button>
            )}
            <button onClick={() => setFilterOpen(true)} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "10px 18px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>
              🔍 {selectedTeam ? `Filtering: ${selectedTeam}` : "Filter by Team"}
            </button>
          </div>
        </div>

        {/* Month cards */}
        {[...activeMonths].sort((a, b) => a - b).map((m, mi) => {
          const info = ALL_MONTHS.find(x => x.month === m);
          if (!info) return null;
          const first = new Date(YEAR, m, 1);
          const dim = new Date(YEAR, m + 1, 0).getDate();
          const swd = first.getDay();

          return (
            <div key={m} style={{ ...GLASS, borderRadius: "24px", overflow: "hidden", marginBottom: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(255,20,147,0.08)", animation: `cardIn 0.6s ${mi * 0.07}s both` }}>
              {/* Month header */}
              <div style={{ padding: "14px 24px", background: "rgba(0,0,0,0.5)", borderBottom: "2px solid #FF1493", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "linear-gradient(180deg, #FF1493, rgba(255,20,147,0.2))" }} />
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "4px", color: "#fff", margin: 0 }}>{info.label}</h2>
              </div>

              {/* Weekday headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(255,20,147,0.1)", borderBottom: "1px solid rgba(255,20,147,0.2)" }}>
                {WEEKDAYS.map((w, i) => (
                  <div key={i} style={{ padding: "10px 4px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", color: "#FF1493", letterSpacing: "0.08em" }}>{w}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {/* Empty cells for offset */}
                {Array.from({ length: swd }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.05)", minHeight: "110px" }} />
                ))}

                {/* Day cells */}
                {Array.from({ length: dim }, (_, di) => {
                  const d = di + 1;
                  const ds = fmtYMD(YEAR, m, d);
                  const ev = calData[ds];
                  const hasEvent = !!ev;
                  const visibleInFilter = !selectedTeam || (ev && evHasTeam(ev, selectedTeam));
                  const pairs = ev?.eventPairs || [];

                  return (
                    <div key={d}
                      onClick={() => { if (hasEvent) { setSelectedDate(ds); setDayModalOpen(true); } }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "flex-start", border: "1px solid rgba(255,20,147,0.07)",
                        background: hasEvent && visibleInFilter ? "rgba(51,51,51,0.5)" : "rgba(26,26,26,0.4)",
                        minHeight: "110px", padding: "8px 4px 6px",
                        cursor: hasEvent ? "pointer" : "default",
                        position: "relative", transition: "background 0.2s, border-color 0.2s",
                        opacity: selectedTeam && !visibleInFilter ? 0.3 : 1,
                      }}
                      onMouseOver={e => { if (hasEvent) e.currentTarget.style.background = "rgba(255,20,147,0.2)"; }}
                      onMouseOut={e => { if (hasEvent) e.currentTarget.style.background = hasEvent && visibleInFilter ? "rgba(51,51,51,0.5)" : "rgba(26,26,26,0.4)"; }}
                    >
                      {/* Day number */}
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", color: hasEvent ? "#FF1493" : "rgba(255,255,255,0.4)", alignSelf: "flex-start", marginBottom: "5px", letterSpacing: "0.03em" }}>{d}</div>

                      {/* Event content */}
                      {hasEvent && visibleInFilter && (
                        <>
                          {selectedTeam ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              {(() => {
                                const oppIcon = getOppIcon(ev, selectedTeam);
                                return oppIcon ? <img src={oppIcon} alt="" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "8px" }} /> : null;
                              })()}
                            </div>
                          ) : (
                            pairs.length > 0 && <FlipCell pairs={pairs} />
                          )}
                          {/* Pulsing dot */}
                          <div style={{
                            position: "absolute", top: "5px", right: "5px",
                            width: "7px", height: "7px", background: "#FF1493", borderRadius: "50%",
                            boxShadow: "0 0 6px #FF1493", animation: "dotPulse 2.2s ease-in-out infinite"
                          }} />
                        </>
                      )}

                      {/* Add hint for empty days */}
                      {!hasEvent && (
                        <div style={{ fontSize: "0.55rem", color: "rgba(255,20,147,0.15)", fontStyle: "italic", marginTop: "auto" }}>+ event</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Detail Modal */}
      <Modal active={dayModalOpen} onClose={() => setDayModalOpen(false)} wide>
        {selectedEv && selectedDate && (
          <div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "20px", textShadow: "0 0 20px rgba(255,20,147,0.4)" }}>
              📅 {getDayLabel(selectedDate)}
            </h3>

            {/* Event Icons */}
            {(selectedEv.eventPairs || []).length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Events</div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {(selectedEv.eventPairs || []).map((pair, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,20,147,0.08)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: "12px", padding: "10px 16px" }}>
                      {pair.iconUrl && <img src={pair.iconUrl} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />}
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{pair.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Season */}
            {selectedEv.season && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Season</div>
                <div style={{ display: "inline-block", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "6px 18px", borderRadius: "30px", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "2px" }}>
                  Season {selectedEv.season}
                </div>
              </div>
            )}

            {/* Tournaments & Fixtures */}
            {(selectedEv.tournaments || []).length > 0 && (
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Fixtures</div>
                {(selectedEv.tournaments || []).map((t, ti) => (
                  <TournamentCard key={ti} tournament={t} getTeamIcon={getTeamIcon} />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal active={filterOpen} onClose={() => setFilterOpen(false)}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "16px" }}>🔍 Filter by Team</h3>
        <input
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="Search team..."
          style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "12px" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", maxHeight: "320px", overflowY: "auto", marginBottom: "16px" }}>
          {filteredTeams.length === 0 ? (
            <div style={{ gridColumn: "1/-1", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px" }}>No teams found</div>
          ) : filteredTeams.map(team => {
            const icon = getTeamIcon(team);
            return (
              <div key={team} onClick={() => { setSelectedTeam(team); setFilterOpen(false); }}
                style={{
                  background: selectedTeam === team ? "rgba(255,20,147,0.25)" : "rgba(255,20,147,0.08)",
                  border: `1px solid ${selectedTeam === team ? "#FF1493" : "rgba(255,20,147,0.2)"}`,
                  borderRadius: "20px", padding: "10px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "8px", justifyContent: "center",
                  transition: "all 0.2s", fontWeight: 600, fontSize: "0.85rem", color: "#fff"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.2)"}
                onMouseOut={e => e.currentTarget.style.background = selectedTeam === team ? "rgba(255,20,147,0.25)" : "rgba(255,20,147,0.08)"}
              >
                {icon && <img src={icon} alt="" style={{ width: "20px", height: "20px", objectFit: "contain", borderRadius: "3px" }} />}
                <span>{team}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => { setSelectedTeam(null); setFilterSearch(""); setFilterOpen(false); }} style={{ flex: 1, padding: "12px", background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ffaaaa", borderRadius: "12px", cursor: "pointer", fontWeight: 700 }}>Clear Filter</button>
          <button onClick={() => setFilterOpen(false)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", color: "#fff", borderRadius: "12px", cursor: "pointer" }}>Close</button>
        </div>
      </Modal>

      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #FF1493; } 50% { opacity: 0.4; box-shadow: 0 0 14px #FF1493; } }
      `}</style>
    </div>
  );
}

function TournamentCard({ tournament, getTeamIcon }) {
  const [open, setOpen] = useState(false);
  const fixtures = tournament.fixtures || [];

  return (
    <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "16px", padding: "14px 16px", marginBottom: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {tournament.iconUrl && <img src={tournament.iconUrl} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px", flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{tournament.name || "Tournament"}</div>
          {tournament.description && <div style={{ color: "#FF1493", fontSize: "0.75rem", marginTop: "2px" }}>{tournament.description}</div>}
        </div>
        {fixtures.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "1px solid rgba(255,20,147,0.3)", color: "rgba(255,255,255,0.6)", padding: "5px 14px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            ⚽ FIXTURES ({fixtures.length})
          </button>
        )}
      </div>

      {/* Fixtures panel */}
      {open && fixtures.length > 0 && (
        <div style={{ marginTop: "12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.1)", borderRadius: "12px", padding: "10px" }}>
          {fixtures.map((f, i) => {
            const homeIcon = getTeamIcon(f.home) || f.homeIcon;
            const awayIcon = getTeamIcon(f.away) || f.awayIcon;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", alignItems: "center", gap: "6px", padding: "8px 4px", borderBottom: i < fixtures.length - 1 ? "1px solid rgba(255,20,147,0.08)" : "none" }}>
                {/* Home */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {homeIcon && <img src={homeIcon} alt="" style={{ width: "26px", height: "26px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />}
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", lineHeight: 1.3, wordBreak: "break-word" }}>{f.home}</span>
                </div>
                {/* VS */}
                <div style={{ textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.7rem", color: "#FF1493", fontWeight: 700 }}>vs</div>
                {/* Away */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexDirection: "row-reverse" }}>
                  {awayIcon && <img src={awayIcon} alt="" style={{ width: "26px", height: "26px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />}
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", lineHeight: 1.3, wordBreak: "break-word", textAlign: "right" }}>{f.away}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
