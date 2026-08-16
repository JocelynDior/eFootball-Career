import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { ref, onValue, set, remove, get } from "firebase/database";
import Navbar from "../components/Navbar";
import BackgroundVideo from "../components/BackgroundVideo";
import Modal from "../components/Modal";
import { uploadToImgBB } from "../utils/imgUpload";
import { useAdmin } from "../context/AdminContext";
import { useNavigate } from "react-router-dom";

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

function getAllCalendarDays(activeMonths) {
  const days = [];
  [...activeMonths].sort((a, b) => a - b).forEach(m => {
    const dim = new Date(YEAR, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) days.push(fmtYMD(YEAR, m, d));
  });
  return days;
}

export default function AdminCalendarPage() {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [calData, setCalData] = useState({});
  const [activeMonths, setActiveMonths] = useState([3, 4, 5, 6]);
  const [teamIconRegistry, setTeamIconRegistry] = useState({});
  const [currentDate, setCurrentDate] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [tempEventPairs, setTempEventPairs] = useState([{ name: "", iconUrl: "" }]);
  const [tempTournaments, setTempTournaments] = useState([]);
  const [tempSeason, setTempSeason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });
  const [addFixOpen, setAddFixOpen] = useState(false);
  const [afStep, setAfStep] = useState(1);
  const [afDate, setAfDate] = useState("");
  const [afTournIdx, setAfTournIdx] = useState(null);
  const [afDateTournaments, setAfDateTournaments] = useState([]);
  const [afType, setAfType] = useState("");
  const [afFixturesText, setAfFixturesText] = useState("");
  const [afParsed, setAfParsed] = useState([]);
  const [afSaveStatus, setAfSaveStatus] = useState("");
  const [afEventDates, setAfEventDates] = useState([]);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixTournIdx, setFixTournIdx] = useState(null);
  const [fixIdx, setFixIdx] = useState(null);
  const [fixHome, setFixHome] = useState("");
  const [fixAway, setFixAway] = useState("");
  const [fixHomeIcon, setFixHomeIcon] = useState("");
  const [fixAwayIcon, setFixAwayIcon] = useState("");

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    const unsub1 = onValue(ref(db, "settings/calendar"), snap => {
      const d = snap.val();
      if (d?.activeMonths) setActiveMonths(d.activeMonths);
    });
    const unsub2 = onValue(ref(db, "calendarEvents"), snap => setCalData(snap.val() || {}));
    const unsub3 = onValue(ref(db, "teamIcons"), snap => setTeamIconRegistry(snap.val() || {}));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [isAdmin]);

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

  async function saveTeamIcon(teamName, url) {
    if (!teamName || !url) return;
    try { await set(ref(db, "teamIcons/" + teamName.trim().replace(/\./g, "_")), url); } catch (e) {}
  }

  async function syncTeam(oldName, newName, newIcon) {
    if (!oldName) return;
    try {
      const snap = await get(ref(db, "calendarEvents"));
      const all = snap.val() || {};
      for (const [date, ev] of Object.entries(all)) {
        if (!ev?.tournaments) continue;
        let changed = false;
        const tournaments = JSON.parse(JSON.stringify(ev.tournaments));
        for (const t of tournaments) {
          for (const f of (t.fixtures || [])) {
            if (f.home?.trim().toLowerCase() === oldName.trim().toLowerCase()) {
              if (newName) f.home = newName;
              if (newIcon) f.homeIcon = newIcon;
              changed = true;
            }
            if (f.away?.trim().toLowerCase() === oldName.trim().toLowerCase()) {
              if (newName) f.away = newName;
              if (newIcon) f.awayIcon = newIcon;
              changed = true;
            }
          }
        }
        if (changed) await set(ref(db, "calendarEvents/" + date), { ...ev, tournaments });
      }
    } catch (e) {}
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

  // Day modal
  function openDayModal(ds) {
    const ev = calData[ds];
    setCurrentDate(ds);
    setTempSeason(ev?.season ? String(ev.season) : "");
    setTempEventPairs(ev?.eventPairs ? JSON.parse(JSON.stringify(ev.eventPairs)) : [{ name: "", iconUrl: "" }]);
    setTempTournaments(ev?.tournaments ? JSON.parse(JSON.stringify(ev.tournaments)) : []);
    setDayModalOpen(true);
  }

  function navigateDay(dir) {
    const days = getAllCalendarDays(activeMonths);
    const idx = days.indexOf(currentDate);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= days.length) return;
    openDayModal(days[newIdx]);
  }

  async function saveEvent() {
    const validPairs = tempEventPairs.filter(p => p.name || p.iconUrl);
    if (!validPairs.length) { showToast("Enter at least one event name", "error"); return; }
    setSaving(true);
    try {
      await set(ref(db, "calendarEvents/" + currentDate), {
        eventPairs: validPairs,
        season: tempSeason ? parseInt(tempSeason) : null,
        tournaments: tempTournaments
      });
      setDayModalOpen(false);
      showToast("Event saved ✓", "success");
    } catch (e) { showToast("Failed to save", "error"); }
    setSaving(false);
  }

  async function deleteEvent() {
    if (!confirm("Delete this event?")) return;
    try {
      await remove(ref(db, "calendarEvents/" + currentDate));
      setDayModalOpen(false);
      showToast("Event deleted", "success");
    } catch (e) { showToast("Failed to delete", "error"); }
  }

  async function addMonth() {
    const avail = ALL_MONTHS.filter(m => !activeMonths.includes(m.month));
    if (!avail.length) { showToast("All months already added", "error"); return; }
    const next = avail[0];
    await set(ref(db, "settings/calendar/activeMonths"), [...activeMonths, next.month].sort((a, b) => a - b));
    showToast(`${next.label} added ✓`, "success");
  }

  async function removeMonth(m) {
    if (!confirm("Remove this month?")) return;
    await set(ref(db, "settings/calendar/activeMonths"), activeMonths.filter(x => x !== m));
    showToast("Month removed", "success");
  }

  // Fixture modal
  function openFixModal(ti, fi) {
    setFixTournIdx(ti);
    setFixIdx(fi);
    const f = fi !== null ? (tempTournaments[ti]?.fixtures?.[fi] || {}) : {};
    setFixHome(f.home || "");
    setFixAway(f.away || "");
    setFixHomeIcon(getTeamIcon(f.home) || f.homeIcon || "");
    setFixAwayIcon(getTeamIcon(f.away) || f.awayIcon || "");
    setFixModalOpen(true);
  }

  async function saveFix() {
    if (!fixHome || !fixAway) { showToast("Enter both team names", "error"); return; }
    const oldHome = fixIdx !== null ? (tempTournaments[fixTournIdx]?.fixtures?.[fixIdx]?.home || "") : "";
    const oldAway = fixIdx !== null ? (tempTournaments[fixTournIdx]?.fixtures?.[fixIdx]?.away || "") : "";
    if (fixHomeIcon) await saveTeamIcon(fixHome, fixHomeIcon);
    if (fixAwayIcon) await saveTeamIcon(fixAway, fixAwayIcon);
    if (oldHome && (oldHome !== fixHome || fixHomeIcon)) await syncTeam(oldHome, fixHome, fixHomeIcon);
    if (oldAway && (oldAway !== fixAway || fixAwayIcon)) await syncTeam(oldAway, fixAway, fixAwayIcon);
    const fix = { home: fixHome, homeIcon: fixHomeIcon, away: fixAway, awayIcon: fixAwayIcon };
    const updated = JSON.parse(JSON.stringify(tempTournaments));
    if (!updated[fixTournIdx].fixtures) updated[fixTournIdx].fixtures = [];
    if (fixIdx !== null) updated[fixTournIdx].fixtures[fixIdx] = fix;
    else updated[fixTournIdx].fixtures.push(fix);
    setTempTournaments(updated);
    setFixModalOpen(false);
    showToast("Fixture saved ✓", "success");
  }

  // Add Fixtures quick entry
  function parseFixtures(text) {
    return text.split(",").map(p => {
      const m = p.trim().match(/^(.+?)\s+vs\s+(.+)$/i);
      return m ? { home: m[1].trim(), away: m[2].trim() } : null;
    }).filter(Boolean);
  }

  async function afLoadTournaments() {
    if (!afDate) { showToast("Select a date", "error"); return; }
    try {
      const snap = await get(ref(db, "calendarEvents/" + afDate));
      const ev = snap.val();
      if (!ev) { showToast("No event on this date. Create one first.", "error"); return; }
      if (!ev.tournaments?.length) { showToast("No tournaments on this date.", "error"); return; }
      setAfDateTournaments(JSON.parse(JSON.stringify(ev.tournaments)));
      const allDates = Object.keys(calData).filter(d => calData[d]?.tournaments?.length > 0).sort();
      setAfEventDates(allDates);
      setAfStep(2);
    } catch (e) { showToast("Failed to load", "error"); }
  }

  async function afSaveFixtures() {
    if (afTournIdx === null) { showToast("No tournament selected", "error"); return; }
    const parsed = parseFixtures(afFixturesText);
    if (!parsed.length) { showToast("No valid fixtures", "error"); return; }
    setAfSaveStatus("Saving...");
    try {
      const snap = await get(ref(db, "calendarEvents/" + afDate));
      const ev = snap.val();
      const tournaments = JSON.parse(JSON.stringify(ev.tournaments || []));
      if (!tournaments[afTournIdx].fixtures) tournaments[afTournIdx].fixtures = [];
      const newFix = parsed.map(f => ({ home: f.home, homeIcon: getTeamIcon(f.home) || "", away: f.away, awayIcon: getTeamIcon(f.away) || "", type: afType || null }));
      tournaments[afTournIdx].fixtures.push(...newFix);
      await set(ref(db, "calendarEvents/" + afDate), { ...ev, tournaments });
      setAfSaveStatus(`✓ Saved ${newFix.length} fixture(s)`);
      setAfType(""); setAfFixturesText(""); setAfParsed([]);
      showToast(`${newFix.length} fixture(s) saved ✓`, "success");
    } catch (e) { setAfSaveStatus("Save failed"); showToast("Failed to save", "error"); }
  }

  const GLASS = { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,20,147,0.2)" };
  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", marginBottom: "10px" };
  const btnStyle = (variant) => ({
    padding: "10px 20px", borderRadius: "20px", fontFamily: "inherit", fontWeight: 700,
    fontSize: "0.85rem", cursor: "pointer", border: "none",
    background: variant === "gold" ? "linear-gradient(135deg, #FF1493, #FF69B4)" : variant === "red" ? "rgba(239,68,68,0.8)" : variant === "green" ? "rgba(34,197,94,0.8)" : "rgba(255,20,147,0.2)",
    color: "#fff",
    ...(variant === "outline" ? { border: "1px solid rgba(255,20,147,0.4)", background: "rgba(255,20,147,0.1)" } : {})
  });

  if (!isAdmin) return null;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif" }}>
      <BackgroundVideo />
      <Navbar />

      {/* Toast */}
      {toast.show && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: "rgba(0,0,30,0.95)", backdropFilter: "blur(12px)", border: `1px solid ${toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : "rgba(255,20,147,0.4)"}`, borderRadius: "16px", padding: "14px 20px", color: "#fff", zIndex: 9998, maxWidth: "300px", fontSize: "0.9rem", fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 32px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", letterSpacing: "6px", color: "#FF1493", margin: 0, textShadow: "0 0 30px rgba(255,20,147,0.5)" }}>ADMIN CALENDAR</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontStyle: "italic", margin: "4px 0 0" }}>Click any date to add or edit events · Changes go live instantly</p>
          </div>
          <button onClick={() => setAddFixOpen(true)} style={{ ...btnStyle("gold"), padding: "12px 24px" }}>⚽ Add Fixtures</button>
        </div>

        {/* Month manager */}
        <div style={{ ...GLASS, borderRadius: "20px", padding: "16px 20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", color: "#FF1493", letterSpacing: "2px", whiteSpace: "nowrap" }}>MONTHS</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
            {[...activeMonths].sort((a, b) => a - b).map(m => {
              const info = ALL_MONTHS.find(x => x.month === m);
              return (
                <div key={m} style={{ background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "20px", padding: "5px 14px", fontSize: "0.8rem", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{info?.label}</span>
                  <button onClick={() => removeMonth(m)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}>×</button>
                </div>
              );
            })}
          </div>
          <button onClick={addMonth} style={{ ...btnStyle("gold"), whiteSpace: "nowrap", padding: "8px 18px", fontSize: "0.8rem" }}>+ Add Month</button>
        </div>

        {/* Calendar months */}
        {[...activeMonths].sort((a, b) => a - b).map((m, mi) => {
          const info = ALL_MONTHS.find(x => x.month === m);
          if (!info) return null;
          const first = new Date(YEAR, m, 1);
          const dim = new Date(YEAR, m + 1, 0).getDate();
          const swd = first.getDay();

          return (
            <div key={m} style={{ ...GLASS, borderRadius: "24px", overflow: "hidden", marginBottom: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(255,20,147,0.08)" }}>
              <div style={{ padding: "14px 24px", background: "rgba(0,0,0,0.5)", borderBottom: "2px solid #FF1493", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "linear-gradient(180deg, #FF1493, rgba(255,20,147,0.2))" }} />
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem", letterSpacing: "4px", color: "#fff", margin: 0 }}>{info.label}</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "rgba(255,20,147,0.1)", borderBottom: "1px solid rgba(255,20,147,0.2)" }}>
                {WEEKDAYS.map((w, i) => (
                  <div key={i} style={{ padding: "10px 4px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", color: "#FF1493", letterSpacing: "0.08em" }}>{w}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {Array.from({ length: swd }).map((_, i) => (
                  <div key={`e-${i}`} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.05)", minHeight: "110px" }} />
                ))}
                {Array.from({ length: dim }, (_, di) => {
                  const d = di + 1;
                  const ds = fmtYMD(YEAR, m, d);
                  const ev = calData[ds];
                  const hasEvent = !!ev;
                  const pairs = ev?.eventPairs || [];
                  return (
                    <div key={d} onClick={() => openDayModal(ds)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                      border: "1px solid rgba(255,20,147,0.07)",
                      background: hasEvent ? "rgba(51,51,51,0.5)" : "rgba(26,26,26,0.4)",
                      minHeight: "110px", padding: "8px 4px 6px", cursor: "pointer",
                      position: "relative", transition: "background 0.2s",
                    }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.25)"}
                      onMouseOut={e => e.currentTarget.style.background = hasEvent ? "rgba(51,51,51,0.5)" : "rgba(26,26,26,0.4)"}
                    >
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", color: hasEvent ? "#FF1493" : "rgba(255,255,255,0.4)", alignSelf: "flex-start", marginBottom: "5px" }}>{d}</div>
                      {hasEvent && pairs.length > 0 && (
                        <>
                          {pairs[0].iconUrl && <img src={pairs[0].iconUrl} alt="" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px" }} />}
                          <div style={{ fontSize: "0.48rem", fontWeight: 700, color: "#FF1493", textAlign: "center", marginTop: "3px", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.25, wordBreak: "break-word", maxWidth: "100%", padding: "0 2px" }}>{pairs[0].name}</div>
                          <div style={{ position: "absolute", top: "5px", right: "5px", width: "7px", height: "7px", background: "#FF1493", borderRadius: "50%", boxShadow: "0 0 6px #FF1493", animation: "dotPulse 2.2s ease-in-out infinite" }} />
                        </>
                      )}
                      {!hasEvent && <div style={{ fontSize: "0.55rem", color: "rgba(255,20,147,0.2)", fontStyle: "italic", marginTop: "auto" }}>+ add</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Edit Modal */}
      <Modal active={dayModalOpen} onClose={() => setDayModalOpen(false)} wide>
        {currentDate && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <button onClick={() => navigateDay(-1)} style={{ ...btnStyle("outline"), padding: "8px 14px" }}>◀</button>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", letterSpacing: "3px", margin: 0 }}>📅 {getDayLabel(currentDate)}</h3>
              <button onClick={() => navigateDay(1)} style={{ ...btnStyle("outline"), padding: "8px 14px" }}>▶</button>
            </div>

            {/* Event Pairs */}
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Event Icons & Names</div>
            {tempEventPairs.map((pair, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "12px", padding: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#FF1493" }}>EVENT {idx + 1}</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <input value={pair.name} onChange={e => { const u = [...tempEventPairs]; u[idx].name = e.target.value; setTempEventPairs(u); }} placeholder={`Event ${idx + 1} name`} style={{ ...inputStyle, marginBottom: 0 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>
                      📁 Image
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                        const f = e.target.files[0]; if (!f) return;
                        try { const url = await uploadToImgBB(f); const u = [...tempEventPairs]; u[idx].iconUrl = url; setTempEventPairs(u); } catch {}
                      }} />
                    </label>
                    {pair.iconUrl && <img src={pair.iconUrl} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px", border: "1px solid rgba(255,20,147,0.3)" }} />}
                  </div>
                </div>
                {tempEventPairs.length > 1 && (
                  <button onClick={() => setTempEventPairs(p => p.filter((_, i) => i !== idx))} style={{ background: "rgba(255,0,0,0.3)", border: "none", color: "#fff", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem" }}>🗑</button>
                )}
              </div>
            ))}
            <button onClick={() => setTempEventPairs(p => [...p, { name: "", iconUrl: "" }])} style={{ ...btnStyle("outline"), fontSize: "0.8rem", padding: "8px 16px", marginBottom: "16px" }}>+ Add Another</button>

            {/* Season */}
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Season</div>
            <input value={tempSeason} onChange={e => setTempSeason(e.target.value)} placeholder="e.g. 4" type="number" style={inputStyle} />

            {/* Tournaments */}
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px", marginTop: "8px" }}>Tournaments</div>
            {tempTournaments.map((t, ti) => (
              <div key={ti} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "14px", padding: "12px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  {t.iconUrl && <img src={t.iconUrl} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{t.name}</div>
                    {t.description && <div style={{ color: "#FF1493", fontSize: "0.75rem" }}>{t.description}</div>}
                  </div>
                  <button onClick={() => setTempTournaments(ts => ts.filter((_, i) => i !== ti))} style={{ background: "rgba(255,0,0,0.3)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "0.8rem" }}>🗑</button>
                </div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Fixtures: {(t.fixtures || []).length}</div>
                {(t.fixtures || []).map((f, fi) => (
                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(255,20,147,0.06)" }}>
                    <span style={{ color: "#fff", fontSize: "0.85rem", flex: 1 }}>{f.home} vs {f.away}</span>
                    <button onClick={() => openFixModal(ti, fi)} style={{ background: "rgba(255,20,147,0.2)", border: "none", color: "#fff", padding: "3px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }}>✏️</button>
                    <button onClick={() => { const u = JSON.parse(JSON.stringify(tempTournaments)); u[ti].fixtures.splice(fi, 1); setTempTournaments(u); }} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ffaaaa", padding: "3px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }}>🗑</button>
                  </div>
                ))}
                <button onClick={() => openFixModal(ti, null)} style={{ ...btnStyle("green"), padding: "6px 14px", fontSize: "0.75rem", marginTop: "8px" }}>+ Add Fixture</button>
              </div>
            ))}
            <button onClick={() => {
              const name = prompt("Tournament name:");
              if (!name) return;
              const desc = prompt("Description (optional):") || "";
              setTempTournaments(ts => [...ts, { name, description: desc, iconUrl: "", fixtures: [] }]);
            }} style={{ ...btnStyle("outline"), fontSize: "0.8rem", padding: "8px 16px", marginBottom: "16px" }}>+ Add Tournament</button>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
              <button onClick={saveEvent} disabled={saving} style={{ ...btnStyle("gold"), opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "💾 Save Event"}</button>
              {calData[currentDate] && <button onClick={deleteEvent} style={{ ...btnStyle("red") }}>🗑 Delete Event</button>}
              <button onClick={() => setDayModalOpen(false)} style={{ ...btnStyle("outline") }}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Fixture Edit Modal */}
      <Modal active={fixModalOpen} onClose={() => setFixModalOpen(false)}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "20px" }}>{fixIdx !== null ? "Edit Fixture" : "Add Fixture"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: "10px", alignItems: "start" }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>HOME TEAM</div>
            <input value={fixHome} onChange={e => { setFixHome(e.target.value); const icon = getTeamIcon(e.target.value); if (icon) setFixHomeIcon(icon); }} placeholder="Home team" style={inputStyle} />
            <label style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, display: "inline-block", marginBottom: "8px" }}>
              📁 Icon
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (!f) return; try { const url = await uploadToImgBB(f); setFixHomeIcon(url); await saveTeamIcon(fixHome, url); } catch {} }} />
            </label>
            {fixHomeIcon && <img src={fixHomeIcon} alt="" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px", display: "block", marginBottom: "8px" }} />}
          </div>
          <div style={{ textAlign: "center", paddingTop: "24px", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "#FF1493" }}>VS</div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>AWAY TEAM</div>
            <input value={fixAway} onChange={e => { setFixAway(e.target.value); const icon = getTeamIcon(e.target.value); if (icon) setFixAwayIcon(icon); }} placeholder="Away team" style={inputStyle} />
            <label style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#FF1493", padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, display: "inline-block", marginBottom: "8px" }}>
              📁 Icon
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const f = e.target.files[0]; if (!f) return; try { const url = await uploadToImgBB(f); setFixAwayIcon(url); await saveTeamIcon(fixAway, url); } catch {} }} />
            </label>
            {fixAwayIcon && <img src={fixAwayIcon} alt="" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px", display: "block", marginBottom: "8px" }} />}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button onClick={saveFix} style={btnStyle("gold")}>💾 Save Fixture</button>
          <button onClick={() => setFixModalOpen(false)} style={btnStyle("outline")}>Cancel</button>
        </div>
      </Modal>

      {/* Add Fixtures Quick Entry */}
      <Modal active={addFixOpen} onClose={() => setAddFixOpen(false)}>
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", color: "#FF1493", letterSpacing: "3px", marginBottom: "20px" }}>⚽ Add Fixtures</h3>

        {/* Step 1 */}
        {afStep === 1 && (
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Select Date</div>
            <input type="date" value={afDate} onChange={e => setAfDate(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={afLoadTournaments} style={btnStyle("gold")}>Load Tournaments →</button>
              <button onClick={() => setAddFixOpen(false)} style={btnStyle("outline")}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {afStep === 2 && (
          <div>
            {/* Date nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
              <button onClick={async () => { const idx = afEventDates.indexOf(afDate); if (idx > 0) { setAfDate(afEventDates[idx - 1]); setAfTournIdx(null); const snap = await get(ref(db, "calendarEvents/" + afEventDates[idx - 1])); const ev = snap.val(); setAfDateTournaments(ev?.tournaments ? JSON.parse(JSON.stringify(ev.tournaments)) : []); } }} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem" }}>◀</button>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#FF1493", letterSpacing: "2px", fontSize: "0.9rem" }}>{getDayLabel(afDate)}</span>
              <button onClick={async () => { const idx = afEventDates.indexOf(afDate); if (idx < afEventDates.length - 1) { setAfDate(afEventDates[idx + 1]); setAfTournIdx(null); const snap = await get(ref(db, "calendarEvents/" + afEventDates[idx + 1])); const ev = snap.val(); setAfDateTournaments(ev?.tournaments ? JSON.parse(JSON.stringify(ev.tournaments)) : []); } }} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.3)", color: "#FF1493", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem" }}>▶</button>
            </div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "10px" }}>Select Tournament</div>
            {afDateTournaments.map((t, idx) => (
              <div key={idx} onClick={() => { setAfTournIdx(idx); setAfStep(3); }} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,20,147,0.08)", border: `1.5px solid ${afTournIdx === idx ? "#FF1493" : "rgba(255,20,147,0.2)"}`, borderRadius: "12px", padding: "12px 16px", cursor: "pointer", marginBottom: "8px", transition: "all 0.2s" }}>
                {t.iconUrl && <img src={t.iconUrl} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />}
                <div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>{t.name}</div>
                  {t.description && <div style={{ color: "#FF1493", fontSize: "0.75rem" }}>{t.description}</div>}
                </div>
              </div>
            ))}
            <button onClick={() => setAfStep(1)} style={{ ...btnStyle("outline"), fontSize: "0.8rem", marginTop: "8px" }}>← Back</button>
          </div>
        )}

        {/* Step 3 */}
        {afStep === 3 && (
          <div>
            {afDateTournaments[afTournIdx] && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,20,147,0.1)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
                {afDateTournaments[afTournIdx].iconUrl && <img src={afDateTournaments[afTournIdx].iconUrl} alt="" style={{ width: "30px", height: "30px", objectFit: "contain", borderRadius: "5px" }} />}
                <span style={{ color: "#fff", fontWeight: 700 }}>{afDateTournaments[afTournIdx].name}</span>
              </div>
            )}
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Match Type</div>
            <input value={afType} onChange={e => setAfType(e.target.value)} placeholder="e.g. Group Stage, Matchday 3..." style={inputStyle} />
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>Fixtures</div>
            <textarea value={afFixturesText} onChange={e => setAfFixturesText(e.target.value)} rows={5} placeholder="Team A vs Team B, Team C vs Team D" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>Separate with commas · Use "vs" between team names</div>
            {afParsed.length > 0 && (
              <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: "10px", padding: "10px", marginBottom: "12px" }}>
                {afParsed.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: i < afParsed.length - 1 ? "1px solid rgba(255,20,147,0.08)" : "none", fontSize: "0.85rem", color: "#fff" }}>
                    <span style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.7rem", minWidth: "20px" }}>{i + 1}</span>
                    {getTeamIcon(f.home) && <img src={getTeamIcon(f.home)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                    <span>{f.home}</span>
                    <span style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.65rem" }}>VS</span>
                    {getTeamIcon(f.away) && <img src={getTeamIcon(f.away)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                    <span>{f.away}</span>
                  </div>
                ))}
              </div>
            )}
            {afSaveStatus && <div style={{ color: afSaveStatus.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>{afSaveStatus}</div>}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => { const p = parseFixtures(afFixturesText); setAfParsed(p); if (!p.length) showToast("No valid fixtures detected", "error"); else showToast(`${p.length} fixture(s) detected`, "success"); }} style={{ ...btnStyle("outline"), fontSize: "0.8rem" }}>👁 Preview</button>
              <button onClick={afSaveFixtures} style={btnStyle("gold")}>💾 Save Fixtures</button>
              <button onClick={() => setAfStep(2)} style={{ ...btnStyle("outline"), fontSize: "0.8rem" }}>← Back</button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes dotPulse { 0%, 100% { opacity: 1; box-shadow: 0 0 6px #FF1493; } 50% { opacity: 0.4; box-shadow: 0 0 14px #FF1493; } }
      `}</style>
    </div>
  );
}
