import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue } from "firebase/database";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import Modal from "../components/Modal";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function fmtYMD(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDayLabel(ds, activeMonths) {
  const [y, mo, d] = ds.split("-").map(Number);
  const m = mo - 1;
  const entry = activeMonths.find(x => x.year === y && x.month === m);
  const label = entry ? `${MONTH_NAMES[m]} ${y}` : ds;
  return `${d} ${label}`;
}

function getAllCalendarDays(activeMonths) {
  const days = [];
  [...activeMonths]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .forEach(({ year, month }) => {
      const dim = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= dim; d++) days.push(fmtYMD(year, month, d));
    });
  return days;
}

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

// 2x bigger section label
function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem",
      fontWeight: 700, color: "#fff", letterSpacing: "0.15em",
      margin: "1.4rem 0 0.8rem", display: "flex", alignItems: "center", gap: "0.5rem",
    }}>
      {children}
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)" }} />
    </div>
  );
}

// Tournament card — 2x text sizes in popup
function TournamentCard({ tournament, getTeamIcon }) {
  const [open, setOpen] = useState(false);
  const fixtures = tournament.fixtures || [];

  return (
    <div style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.1rem", padding: "0.9rem 1rem", marginBottom: "0.8rem", transition: "border-color 0.2s" }}
      onMouseOver={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
      onMouseOut={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
        {tournament.iconUrl && <img src={tournament.iconUrl} alt="" style={{ width: "52px", height: "52px", objectFit: "contain", borderRadius: "6px", flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "2rem" }}>{tournament.name || "Tournament"}</div>
          {tournament.description && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.44rem", marginTop: "0.2rem" }}>{tournament.description}</div>}
        </div>
        {fixtures.length > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", padding: "0.25rem 0.65rem", borderRadius: "1.5rem", fontSize: "0.67rem", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            ⚽ FIXTURES ({fixtures.length})
          </button>
        )}
      </div>

      {open && fixtures.length > 0 && (
        <div style={{ marginTop: "0.7rem", background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.8rem", padding: "0.7rem" }}>
          {fixtures.map((f, i) => {
            const homeIcon = getTeamIcon(f.home) || f.homeIcon;
            const awayIcon = getTeamIcon(f.away) || f.awayIcon;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 52px minmax(0,1fr)", alignItems: "center", gap: "6px", padding: "0.6rem 0", borderBottom: i < fixtures.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  {homeIcon && <img src={homeIcon} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />}
                  <span style={{ fontSize: "1.56rem", fontWeight: 600, color: "#fff", wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.3 }}>{f.home}</span>
                </div>
                <div style={{ textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.26rem", color: "#fff", fontWeight: 700 }}>vs</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: "row-reverse", minWidth: 0 }}>
                  {awayIcon && <img src={awayIcon} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "4px", flexShrink: 0 }} />}
                  <span style={{ fontSize: "1.56rem", fontWeight: 600, color: "#fff", wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.3, textAlign: "right" }}>{f.away}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [calData, setCalData] = useState({});
  const [activeMonths, setActiveMonths] = useState([]);
  const [teamIconRegistry, setTeamIconRegistry] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [currentNavDate, setCurrentNavDate] = useState(null);
  const [globalFlipIdx, setGlobalFlipIdx] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  useEffect(() => {
    const unsub1 = onValue(ref(db, "career_calendar/settings"), snap => {
      const d = snap.val();
      if (d?.activeMonths) setActiveMonths(d.activeMonths);
      else setActiveMonths([]);
    });
    const unsub2 = onValue(ref(db, "career_calendarEvents"), snap => setCalData(snap.val() || {}));
    const unsub3 = onValue(ref(db, PATHS.teamIcons), snap => setTeamIconRegistry(snap.val() || {}));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // Global flip interval — mirrors the HTML file exactly
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalFlipIdx(i => i + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg, type = "") {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "" }), 3200);
  }

  function getTeamIcon(teamName) {
    if (!teamName) return null;
    const key = teamName.trim().replace(/\./g, "_");
    if (teamIconRegistry[key]) return teamIconRegistry[key];
    for (const date in calData) {
      const ev = calData[date];
      if (ev?.tournaments) {
        for (const t of ev.tournaments) {
          for (const f of (t.fixtures || [])) {
            if (f.home?.trim() === teamName.trim() && f.homeIcon) return f.homeIcon;
            if (f.away?.trim() === teamName.trim() && f.awayIcon) return f.awayIcon;
          }
        }
      }
    }
    return null;
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

  function openDayModal(ds) {
    setSelectedDate(ds);
    setCurrentNavDate(ds);
    setDayModalOpen(true);
  }

  function navigateModal(dir) {
    const days = getAllCalendarDays(activeMonths);
    const idx = days.indexOf(currentNavDate);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= days.length) return;
    setCurrentNavDate(days[newIdx]);
    setSelectedDate(days[newIdx]);
  }

  const allDays = getAllCalendarDays(activeMonths);
  const navIdx = allDays.indexOf(currentNavDate);
  const selectedEv = currentNavDate ? calData[currentNavDate] : null;
  const allTeams = getAllTeamNames();
  const filteredTeams = filterSearch ? allTeams.filter(t => t.toLowerCase().includes(filterSearch.toLowerCase())) : allTeams;

  const inputStyle = {
    width: "100%", padding: "0.65rem 0.9rem",
    background: "rgba(0,0,0,0.85)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "0.7rem", color: "#fff",
    fontFamily: "inherit", fontSize: "1.8rem",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar />

      {/* Toast */}
      {toast.show && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: "rgba(0,0,30,0.97)", backdropFilter: "blur(12px)", border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`, borderRadius: "1.1rem", padding: "0.9rem 1.3rem", color: "#fff", zIndex: 9998, maxWidth: "300px", fontSize: "0.84rem", fontWeight: 600, boxShadow: "0 10px 35px rgba(0,0,0,0.55)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: "24px 20px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "6px", color: "#fff", margin: 0, textShadow: "0 0 30px rgba(255,255,255,0.2)" }}>CALENDAR</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontStyle: "italic", margin: "4px 0 0" }}>Click any date to view event details · Live updates</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {selectedTeam && (
              <button onClick={() => setSelectedTeam(null)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "10px 18px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>
                ✕ Clear Filter
              </button>
            )}
            <button onClick={() => { setFilterSearch(""); setFilterOpen(true); }} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "10px 18px", borderRadius: "30px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit" }}>
              🔍 {selectedTeam ? `Filtering: ${selectedTeam}` : "Filter by Team"}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {activeMonths.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📅</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "2px" }}>No calendar months set up yet</div>
          </div>
        )}

        {/* Month cards */}
        {[...activeMonths]
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
          .map(({ year, month }, mi) => {
            const first = new Date(year, month, 1);
            const dim = new Date(year, month + 1, 0).getDate();
            const swd = first.getDay();

            return (
              <div key={`${year}-${month}`} style={{ ...GLASS, borderRadius: "1.8rem", overflow: "hidden", marginBottom: "2.5rem", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.03)", animation: `cardIn 0.65s ${mi * 0.07}s both` }}>
                {/* Month header — centered, 2x bigger */}
                <div style={{ padding: "1rem 1.6rem", background: "rgba(0,0,0,0.98)", borderBottom: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "linear-gradient(180deg, #fff, rgba(255,255,255,0.1))" }} />
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.5rem", letterSpacing: "0.04em", color: "#fff", margin: 0, textAlign: "center" }}>{MONTH_NAMES[month].toUpperCase()} {year}</h2>
                </div>

                {/* Weekday headers — 2x bigger */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} style={{ padding: "0.65rem 0.3rem", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", color: "#fff", letterSpacing: "0.08em" }}>{w}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {Array.from({ length: swd }).map((_, i) => (
                    <div key={`e-${i}`} style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.03)", minHeight: "115px" }} />
                  ))}
                  {Array.from({ length: dim }, (_, di) => {
                    const d = di + 1;
                    const ds = fmtYMD(year, month, d);
                    const ev = calData[ds];
                    const hasEvent = !!ev;
                    const pairs = ev?.eventPairs || [];
                    const visibleInFilter = !selectedTeam || (ev && evHasTeam(ev, selectedTeam));

                    // Global flip: compute which pair to show
                    const pairIdx = pairs.length > 1 ? globalFlipIdx % pairs.length : 0;
                    const prevPairIdx = pairs.length > 1 ? (globalFlipIdx - 1) % pairs.length : 0;
                    const isFlipping = pairs.length > 1;

                    return (
                      <div
                        key={d}
                        onClick={() => { if (hasEvent) openDayModal(ds); }}
                        style={{
                          position: "relative",
                          border: "1px solid rgba(255,255,255,0.05)",
                          background: "rgba(26,26,26,0.45)",
                          minHeight: "115px",
                          cursor: hasEvent ? "pointer" : "default",
                          transition: "background 0.2s, border-color 0.25s",
                          opacity: selectedTeam && !visibleInFilter ? 0.25 : 1,
                          overflow: "hidden",
                        }}
                        onMouseOver={e => { if (hasEvent) { e.currentTarget.style.background = "rgba(184,150,12,0.3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; } }}
                        onMouseOut={e => { if (hasEvent) { e.currentTarget.style.background = "rgba(26,26,26,0.45)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; } }}
                      >
                        {hasEvent && visibleInFilter && (
                          <>
                            {selectedTeam ? (
                              (() => {
                                const oppIcon = getOppIcon(ev, selectedTeam);
                                return oppIcon ? <img src={oppIcon} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null;
                              })()
                            ) : (
                              pairs.length > 0 && (() => {
                                const current = pairs[pairIdx] || pairs[0];
                                return (
                                  // Flip container — matches HTML exactly: 48x48 perspective:300px
                                  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ width: "48px", height: "48px", perspective: "300px" }}>
                                      <FlipInner pairs={pairs} pairIdx={pairIdx} />
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                            {/* Pulse dot */}
                            <div style={{ position: "absolute", top: "5px", right: "5px", width: "7px", height: "7px", background: "#fff", borderRadius: "50%", boxShadow: "0 0 6px rgba(255,255,255,0.8)", animation: "dotPulse 2.2s ease-in-out infinite", zIndex: 2 }} />
                          </>
                        )}

                        {/* Day number — 2x bigger */}
                        <div style={{
                          position: "absolute", top: "6px", left: "6px", zIndex: 3,
                          fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.36rem", fontWeight: 700,
                          color: "#fff",
                          textShadow: hasEvent ? "0 1px 4px rgba(0,0,0,0.9)" : "none",
                          letterSpacing: "0.03em",
                        }}>{d}</div>

                        {!hasEvent && (
                          <div style={{ position: "absolute", bottom: "6px", left: 0, right: 0, textAlign: "center", fontSize: "0.58rem", color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No event</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Day Detail Modal ── */}
      <Modal active={dayModalOpen} onClose={() => setDayModalOpen(false)} wide>
        <div>
          {/* Nav arrows */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
            <button onClick={() => navigateModal(-1)} disabled={navIdx <= 0} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: "34px", height: "34px", borderRadius: "50%", cursor: navIdx <= 0 ? "default" : "pointer", fontSize: "1.1rem", opacity: navIdx <= 0 ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>◀</button>
            {/* Date title 2x bigger */}
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.1rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em", margin: 0, textAlign: "center", flex: 1, padding: "0 0.5rem" }}>
              📅 {currentNavDate ? getDayLabel(currentNavDate, activeMonths) : ""}
            </h3>
            <button onClick={() => navigateModal(1)} disabled={navIdx >= allDays.length - 1} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: "34px", height: "34px", borderRadius: "50%", cursor: navIdx >= allDays.length - 1 ? "default" : "pointer", fontSize: "1.1rem", opacity: navIdx >= allDays.length - 1 ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>▶</button>
          </div>

          {selectedEv ? (
            <>
              <SectionLabel>EVENTS ON THIS DAY</SectionLabel>
              {(selectedEv.eventPairs || []).length === 0
                ? <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.7rem", padding: "1rem" }}>No events scheduled for this day.</div>
                : (selectedEv.eventPairs || []).map((pair, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.8rem", padding: "0.7rem", marginBottom: "0.6rem" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", marginRight: "0.5rem" }}>EVENT {i + 1}</div>
                    {pair.iconUrl && <img src={pair.iconUrl} alt="" style={{ width: "52px", height: "52px", objectFit: "contain", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0, background: "rgba(0,0,0,0.5)" }} />}
                    <span style={{ flex: 1, fontSize: "1.7rem", color: "#fff", wordBreak: "break-word" }}>{pair.name}</span>
                  </div>
                ))
              }

              <SectionLabel>SEASON</SectionLabel>
              <div style={{ marginBottom: "1rem" }}>
                <input
                  readOnly
                  value={selectedEv?.season ? `Season ${selectedEv.season}` : "Not specified"}
                  style={{ ...inputStyle, opacity: 0.8, cursor: "default", background: "rgba(0,0,0,0.6)" }}
                />
              </div>

              <SectionLabel>TOURNAMENTS</SectionLabel>
              {(selectedEv.tournaments || []).length === 0
                ? <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.7rem", padding: "1rem" }}>No tournaments for this date.</div>
                : (selectedEv.tournaments || []).map((t, ti) => (
                  <TournamentCard key={ti} tournament={t} getTeamIcon={getTeamIcon} />
                ))
              }
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📭</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.4rem", letterSpacing: "2px" }}>No event on this day</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
            <button onClick={() => setDayModalOpen(false)} style={{ padding: "0.55rem 1.3rem", borderRadius: "2rem", fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", letterSpacing: "0.06em" }}>CLOSE</button>
          </div>
        </div>
      </Modal>

      {/* ── Filter Modal ── */}
      <Modal active={filterOpen} onClose={() => setFilterOpen(false)}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: "1.5rem", paddingRight: "2.5rem" }}>🔍 FILTER BY TEAM</h3>
        <input
          value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
          placeholder="🔍  Search team..."
          style={{ width: "100%", background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0.7rem", color: "#fff", padding: "0.55rem 0.9rem", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", marginBottom: "0.8rem", boxSizing: "border-box" }}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxHeight: "320px", overflowY: "auto", marginBottom: "1rem" }}>
          {filteredTeams.length === 0
            ? <div style={{ gridColumn: "1/-1", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px", fontSize: "0.85rem" }}>No teams found</div>
            : filteredTeams.map(team => {
              const icon = getTeamIcon(team);
              return (
                <div key={team} onClick={() => { setSelectedTeam(team); setFilterOpen(false); showToast(`Filtering: ${team}`, "success"); }}
                  style={{ background: selectedTeam === team ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${selectedTeam === team ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: "2rem", padding: "0.5rem 0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center", transition: "all 0.2s", fontWeight: 600, fontSize: "0.8rem", color: "#fff", fontFamily: "inherit" }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = selectedTeam === team ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"; }}
                >
                  {icon && <img src={icon} alt="" style={{ width: "20px", height: "20px", objectFit: "contain", borderRadius: "3px" }} />}
                  <span>{team}</span>
                </div>
              );
            })}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button onClick={() => { setSelectedTeam(null); setFilterSearch(""); setFilterOpen(false); showToast("Filter cleared", "success"); }} style={{ flex: 1, padding: "0.55rem 1.3rem", background: "rgba(239,68,68,0.8)", border: "none", color: "#fff", borderRadius: "2rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit", letterSpacing: "0.06em" }}>CLEAR FILTER</button>
          <button onClick={() => setFilterOpen(false)} style={{ flex: 1, padding: "0.55rem 1.3rem", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "2rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit", letterSpacing: "0.06em" }}>CLOSE</button>
        </div>
      </Modal>

      <style>{`
        @keyframes cardIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(255,255,255,0.8); } 50% { opacity: 0.4; box-shadow: 0 0 14px rgba(255,255,255,0.4); } }
        .flip-inner { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.5s ease; }
        .flip-inner.flipping { transform: rotateY(90deg); }
        .flip-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; }
        .flip-face img { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.5)); }
      `}</style>
    </div>
  );
}

// FlipInner — stateless, driven by global pairIdx, uses CSS classes like the HTML
function FlipInner({ pairs, pairIdx }) {
  const innerRef = useRef(null);
  const prevIdxRef = useRef(pairIdx);
  const imgRef = useRef(null);

  useEffect(() => {
    if (pairs.length <= 1) return;
    if (prevIdxRef.current === pairIdx) return;
    prevIdxRef.current = pairIdx;
    const inner = innerRef.current;
    if (!inner) return;
    inner.classList.add("flipping");
    setTimeout(() => {
      if (imgRef.current && pairs[pairIdx]?.iconUrl) {
        imgRef.current.src = pairs[pairIdx].iconUrl;
        imgRef.current.alt = pairs[pairIdx].name || "";
      }
      inner.classList.remove("flipping");
    }, 250);
  }, [pairIdx, pairs]);

  const initial = pairs[0] || {};
  return (
    <div className="flip-inner" ref={innerRef}>
      <div className="flip-face">
        {initial.iconUrl
          ? <img ref={imgRef} src={initial.iconUrl} alt={initial.name || ""} />
          : <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>⚽</div>
        }
      </div>
    </div>
  );
}
