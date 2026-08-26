import { useState } from "react";
import { db } from "../firebase";
import { ref, get, set } from "firebase/database";
import Modal from "../components/Modal";

const TOURNAMENT_OPTIONS = [
  "Premier League","La Liga","Serie A","Bundesliga","Ligue 1",
  "Champions League","Europa League","Club World Cup","Super Cup","Tokyo Pre Season",
];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getDayLabel(ds, activeMonths) {
  const [y, mo, d] = ds.split("-").map(Number);
  const m = mo - 1;
  const entry = activeMonths.find(x => x.year === y && x.month === m);
  const label = entry ? `${MONTH_NAMES[m]} ${y}` : ds;
  return `${d} ${label}`;
}

function parseFixtures(text) {
  return text.split(",").map(p => {
    const m = p.trim().match(/^(.+?)\s+vs\s+(.+)$/i);
    return m ? { home: m[1].trim(), away: m[2].trim() } : null;
  }).filter(Boolean);
}

const inputStyle = {
  width: "100%",
  padding: "0.65rem 0.9rem",
  background: "rgba(0,0,0,0.85)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "0.7rem",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "10px",
};

function btnStyle(variant) {
  const base = {
    padding: "0.55rem 1.3rem",
    borderRadius: "2rem",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    letterSpacing: "0.06em",
    transition: "all 0.25s",
  };
  if (variant === "gold") return { ...base, background: "linear-gradient(135deg, #FF1493, #FF69B4)", color: "#fff" };
  if (variant === "red") return { ...base, background: "rgba(239,68,68,0.8)", color: "#fff" };
  return { ...base, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" };
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.6rem", fontWeight: 700, color: "#fff", letterSpacing: "0.15em", margin: "1.4rem 0 0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", }}>
      {children}
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)" }} />
    </div>
  );
}

export default function AddFixturesModal({ open, onClose, calData, activeMonths, getTeamIcon, showToast }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [tournIdx, setTournIdx] = useState(null);
  const [dateTournaments, setDateTournaments] = useState([]);
  const [type, setType] = useState("");
  const [fixturesText, setFixturesText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [eventDates, setEventDates] = useState([]);

  function reset() {
    setStep(1);
    setDate("");
    setTournIdx(null);
    setDateTournaments([]);
    setType("");
    setFixturesText("");
    setParsed([]);
    setSaveStatus("");
    setEventDates([]);
  }

  async function loadTournaments() {
    if (!date) {
      showToast("Select a date", "error");
      return;
    }
    try {
      const snap = await get(ref(db, "career_calendarEvents/" + date));
      const ev = snap.val();
      if (!ev) {
        showToast("No event on this date. Create one first.", "error");
        return;
      }
      if (!ev.tournaments?.length) {
        showToast("No tournaments on this date.", "error");
        return;
      }
      setDateTournaments(JSON.parse(JSON.stringify(ev.tournaments)));
      const allDates = Object.keys(calData).filter(d => calData[d]?.tournaments?.length > 0).sort();
      setEventDates(allDates);
      setStep(2);
    } catch (e) {
      showToast("Failed to load", "error");
    }
  }

  async function saveFixtures() {
    if (tournIdx === null) {
      showToast("No tournament selected", "error");
      return;
    }
    const parsedFix = parseFixtures(fixturesText);
    if (!parsedFix.length) {
      showToast("No valid fixtures", "error");
      return;
    }
    setSaveStatus("Saving...");
    try {
      const snap = await get(ref(db, "career_calendarEvents/" + date));
      const ev = snap.val();
      const tournaments = JSON.parse(JSON.stringify(ev.tournaments || []));
      if (!tournaments[tournIdx].fixtures) tournaments[tournIdx].fixtures = [];
      const newFix = parsedFix.map(f => ({
        home: f.home,
        homeIcon: getTeamIcon(f.home) || "",
        away: f.away,
        awayIcon: getTeamIcon(f.away) || "",
        type: type || null,
      }));
      tournaments[tournIdx].fixtures.push(...newFix);
      await set(ref(db, "career_calendarEvents/" + date), { ...ev, tournaments });
      setSaveStatus(`✓ Saved ${newFix.length} fixture(s)`);
      setType("");
      setFixturesText("");
      setParsed([]);
      showToast(`${newFix.length} fixture(s) saved ✓`, "success");
    } catch (e) {
      setSaveStatus("Save failed");
      showToast("Failed to save", "error");
    }
  }

  async function navDate(dir) {
    const idx = eventDates.indexOf(date);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= eventDates.length) return;
    const d = eventDates[newIdx];
    setDate(d);
    setTournIdx(null);
    const snap = await get(ref(db, "career_calendarEvents/" + d));
    const ev = snap.val();
    setDateTournaments(ev?.tournaments ? JSON.parse(JSON.stringify(ev.tournaments)) : []);
  }

  return (
    <Modal active={open} onClose={() => { reset(); onClose(); }}>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: "1.5rem", paddingRight: "2.5rem" }}>⚽ ADD FIXTURES</h3>
      {step === 1 && (
        <div>
          <SectionLabel>Select Date</SectionLabel>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={loadTournaments} style={btnStyle("gold")}>Load Tournaments →</button>
            <button onClick={() => { reset(); onClose(); }} style={btnStyle("outline")}>Cancel</button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          {/* Date navigator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
            <button onClick={() => navDate(-1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#fff", letterSpacing: "0.05em", fontSize: "1.05rem" }}>{getDayLabel(date, activeMonths)}</span>
            <button onClick={() => navDate(1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
          </div>
          <SectionLabel>Select Tournament</SectionLabel>
          {dateTournaments.map((t, idx) => (
            <div key={idx} onClick={() => { setTournIdx(idx); setStep(3); }} style={{ display: "flex", alignItems: "center", gap: "0.7rem", background: "rgba(255,255,255,0.06)", border: `1.5px solid ${tournIdx === idx ? "#fff" : "rgba(255,255,255,0.15)"}`, borderRadius: "1.1rem", padding: "0.9rem 1rem", cursor: "pointer", marginBottom: "0.8rem", transition: "all 0.2s" }}>
              {t.iconUrl && <img src={t.iconUrl} alt="" style={{ width: "38px", height: "38px", objectFit: "contain", borderRadius: "6px" }} />}
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{t.name}</div>
                {t.description && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem" }}>{t.description}</div>}
              </div>
            </div>
          ))}
          <button onClick={() => setStep(1)} style={{ ...btnStyle("outline"), fontSize: "0.85rem", marginTop: "8px" }}>← Back</button>
        </div>
      )}
      {step === 3 && (
        <div>
          {/* Selected tournament badge */}
          {dateTournaments[tournIdx] && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "1.1rem", padding: "0.9rem 1rem", marginBottom: "16px" }}>
              {dateTournaments[tournIdx].iconUrl && <img src={dateTournaments[tournIdx].iconUrl} alt="" style={{ width: "38px", height: "38px", objectFit: "contain", borderRadius: "6px" }} />}
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{dateTournaments[tournIdx].name}</span>
            </div>
          )}
          <SectionLabel>Match Type</SectionLabel>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle }}>
            <option value="" style={{ background: "#000033" }}>— Select Tournament —</option>
            {TOURNAMENT_OPTIONS.map(opt => <option key={opt} value={opt} style={{ background: "#000033" }}>{opt}</option>)}
          </select>
          <SectionLabel>Fixtures</SectionLabel>
          <textarea value={fixturesText} onChange={e => setFixturesText(e.target.value)} rows={5} placeholder="Team A vs Team B, Team C vs Team D" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "10px" }}>
            Separate with commas · Use "vs" between team names
          </div>
          {/* Preview list */}
          {parsed.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", marginBottom: "12px" }}>
              {parsed.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: i < parsed.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: "0.85rem", color: "#fff" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.6rem", minWidth: "20px" }}>{i + 1}</span>
                  {getTeamIcon(f.home) && <img src={getTeamIcon(f.home)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                  <span>{f.home}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.63rem" }}>VS</span>
                  {getTeamIcon(f.away) && <img src={getTeamIcon(f.away)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                  <span>{f.away}</span>
                </div>
              ))}
            </div>
          )}
          {saveStatus && (
            <div style={{ color: saveStatus.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>
              {saveStatus}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button onClick={() => { const p = parseFixtures(fixturesText); setParsed(p); if (!p.length) showToast("No valid fixtures", "error"); else showToast(`${p.length} detected`, "success"); }} style={{ ...btnStyle("outline"), fontSize: "0.85rem" }}>👁 Preview</button>
            <button onClick={saveFixtures} style={btnStyle("gold")}>💾 Save Fixtures</button>
            <button onClick={() => setStep(2)} style={{ ...btnStyle("outline"), fontSize: "0.85rem" }}>← Back</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
