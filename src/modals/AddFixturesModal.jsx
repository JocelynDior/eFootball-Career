import { useState } from "react";
import { db } from "../firebase";
import { ref, get, update } from "firebase/database";
import Modal from "../components/Modal";

const TOURNAMENT_LEAGUE_MAP = {
  "Premier League": "premier",
  "La Liga": "laliga",
  "Serie A": "seriea",
  "Bundesliga": "bundesliga",
  "Ligue 1": "ligue1",
  "Champions League": "championsleague",
  "Europa League": "europa",
  "Club World Cup": "clubworldcup",
  "Super Cup": "supercup",
  "Tokyo Pre Season": "tokyo",
};

const TOURNAMENT_OPTIONS = Object.keys(TOURNAMENT_LEAGUE_MAP);

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Normalize string for comparison
function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Firebase may hand back arrays or index-keyed objects; always work with arrays
function toArr(v) {
  if (!v) return [];
  const list = Array.isArray(v) ? v : Object.values(v);
  return list.filter(x => x !== null && x !== undefined);
}

// Fuzzy match input string against a pool of real team names
function fuzzyMatch(input, pool) {
  if (!input) return input;
  if (!pool || !pool.length) return input;

  const inp = norm(input);

  // 1. Exact normalized match
  const exact = pool.find(t => norm(t) === inp);
  if (exact) return exact;

  // 2. One contains the other
  const contains = pool.filter(t => {
    const tn = norm(t);
    return tn.includes(inp) || inp.includes(tn);
  });
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    // pick the one with the shortest name (most specific match)
    return contains.sort((a, b) => Math.abs(norm(a).length - inp.length) - Math.abs(norm(b).length - inp.length))[0];
  }

  // 3. Word overlap scoring
  const inpWords = inp.split(/\s+/).filter(w => w.length > 1);
  let best = null;
  let bestScore = 0;
  for (const t of pool) {
    const tWords = norm(t).split(/\s+/).filter(w => w.length > 1);
    let overlap = 0;
    for (const w of inpWords) {
      if (tWords.some(tw => tw.includes(w) || w.includes(tw))) overlap++;
    }
    const score = overlap / Math.max(inpWords.length, tWords.length, 1);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (bestScore >= 0.4 && best) return best;

  // No match — return as typed
  return input;
}

// ── Season text parsing ─────────────────────────────────────────────────────
// Accepts: "Matchday 1", "Matchday 1:", "MD1", "Round 1" (case-insensitive).
// Matches under a header are separated by commas (or new lines): "A vs B, C vs D"
const HEADER_RE = /^\s*(?:match\s*day|md|round|rd)\s*\.?\s*(\d+)\s*[:\-–.]?\s*(.*)$/i;

function short(s, n = 60) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function parseSeasonText(text) {
  const errors = [];
  const days = [];
  let cur = null;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const h = trimmed.match(HEADER_RE);
    if (h) {
      cur = { num: parseInt(h[1], 10), chunks: [] };
      days.push(cur);
      if (h[2].trim()) cur.chunks.push(h[2].trim());
      continue;
    }
    if (!cur) {
      errors.push(`Text found before the first Matchday header: "${short(trimmed)}"`);
      continue;
    }
    cur.chunks.push(trimmed);
  }

  if (!days.length) {
    if (!errors.length) errors.push('No "Matchday 1", "Matchday 2"… headers found.');
    return { days: [], errors };
  }

  // Matchday numbering: no zero, no duplicates, no gaps
  const counts = {};
  for (const d of days) counts[d.num] = (counts[d.num] || 0) + 1;
  for (const [n, c] of Object.entries(counts)) {
    if (Number(n) < 1) errors.push(`Matchday ${n} is not valid — numbering starts at 1`);
    else if (c > 1) errors.push(`Matchday ${n} appears ${c} times`);
  }
  const maxNum = Math.max(...days.map(d => d.num));
  for (let i = 1; i <= maxNum; i++) {
    if (!counts[i]) errors.push(`Matchday ${i} is missing`);
  }

  // Matches inside each matchday
  for (const d of days) {
    d.matches = [];
    const pieces = d.chunks
      .join(",")
      .split(/[,;]/)
      .map(s => s.trim().replace(/\.+$/, "").trim())
      .filter(Boolean);

    if (!pieces.length) {
      errors.push(`Matchday ${d.num} has no matches`);
      continue;
    }
    for (const piece of pieces) {
      const vsCount = (piece.match(/\s+vs\.?\s+/gi) || []).length;
      if (vsCount > 1) {
        errors.push(`Matchday ${d.num}: "${short(piece)}" looks like two matches with a missing comma`);
        continue;
      }
      const m = piece.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
      if (!m) {
        errors.push(`Matchday ${d.num}: could not read "${short(piece)}" — use Home vs Away`);
        continue;
      }
      d.matches.push({ home: m[1].trim(), away: m[2].trim() });
    }
  }

  days.sort((a, b) => a.num - b.num);
  return { days, errors, maxNum };
}

// ── Calendar helpers ────────────────────────────────────────────────────────
// Distinct event names found on the calendar, each with its dates (earliest → latest)
function collectEvents(data) {
  const map = {};
  for (const [date, ev] of Object.entries(data || {})) {
    if (!ev || !DATE_KEY_RE.test(date)) continue;
    for (const p of toArr(ev.eventPairs)) {
      const name = (p?.name || "").trim();
      if (!name) continue;
      const key = norm(name);
      if (!map[key]) map[key] = { key, name, dates: new Set() };
      map[key].dates.add(date);
    }
  }
  return Object.values(map)
    .map(e => ({ key: e.key, name: e.name, dates: Array.from(e.dates).sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatDate(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// Fetch all teams for a league across all seasons, deduplicated
async function fetchLeagueTeams(leagueKey) {
  if (!leagueKey) return [];
  try {
    const snap = await get(ref(db, `career_${leagueKey}/seasons`));
    const seasons = snap.val();
    if (!seasons) return [];
    const teamSet = new Set();
    for (const seasonData of Object.values(seasons)) {
      const table = seasonData?.table;
      if (!table) continue;
      for (const entry of Object.values(table)) {
        const name = entry?.name || entry?.team;
        if (name) teamSet.add(name.trim());
      }
    }
    return Array.from(teamSet).sort();
  } catch (e) {
    return [];
  }
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
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.6rem", fontWeight: 700, color: "#fff", letterSpacing: "0.15em", margin: "1.4rem 0 0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {children}
      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.3), transparent)" }} />
    </div>
  );
}

function LeagueBadge({ children }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "2rem", padding: "4px 14px", marginBottom: "16px", marginRight: "8px", fontSize: "0.82rem", color: "#FF69B4", fontWeight: 700 }}>
      {children}
    </div>
  );
}

// Team name with highlight: red = not a known team, amber = auto-matched from different text
function TeamName({ name, status, typed, align }) {
  const style = { flex: 1, textAlign: align };
  const chip = { padding: "1px 7px", borderRadius: "6px" };
  if (status === "unmatched") {
    return <span style={style}><span title="Not found in this league's teams" style={{ ...chip, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.6)", color: "#ff8a8a" }}>{name}</span></span>;
  }
  if (status === "fuzzy") {
    return <span style={style}><span title={`Typed as "${typed}"`} style={{ ...chip, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)", color: "#fcd34d" }}>{name}</span></span>;
  }
  return <span style={style}>{name}</span>;
}

export default function AddFixturesModal({ open, onClose, getTeamIcon, teamIconRegistry, clubs, showToast }) {
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState("");      // league name, e.g. "Premier League"
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [calData, setCalData] = useState({});
  const [events, setEvents] = useState([]);
  const [eventKey, setEventKey] = useState("");
  const [fixturesText, setFixturesText] = useState("");
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);           // null = pasting, array = previewing
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedEvent = events.find(e => e.key === eventKey) || null;

  function reset() {
    setStep(1);
    setTournament("");
    setLeagueTeams([]);
    setCalData({});
    setEvents([]);
    setEventKey("");
    setFixturesText("");
    setErrors([]);
    setPreview(null);
    setLoading(false);
    setSaving(false);
  }

  function closeAndReset() {
    reset();
    onClose();
  }

  // Resolve icon for a team name using all available sources
  function resolveIcon(teamName) {
    if (!teamName) return "";
    const fromParent = getTeamIcon(teamName);
    if (fromParent) return fromParent;
    const key = teamName.trim().replace(/\./g, "_");
    if (teamIconRegistry?.[key]) return teamIconRegistry[key];
    const club = clubs?.find(c => norm(c.name) === norm(teamName));
    if (club?.badge) return club.badge;
    return "";
  }

  // ── Step 1 → 2: load teams + calendar events ──
  async function handleLeagueNext() {
    if (!tournament) { showToast("Select a league", "error"); return; }
    setLoading(true);
    try {
      const [teams, snap] = await Promise.all([
        fetchLeagueTeams(TOURNAMENT_LEAGUE_MAP[tournament]),
        get(ref(db, "career_calendarEvents")),
      ]);
      const data = snap.val() || {};
      const evList = collectEvents(data);
      setLeagueTeams(teams);
      setCalData(data);
      setEvents(evList);
      // Pre-select the event named after the league, if there is one
      const match = evList.find(e => e.key === norm(tournament));
      setEventKey(match ? match.key : "");
      setStep(2);
    } catch (e) {
      showToast("Could not load the calendar", "error");
    }
    setLoading(false);
  }

  // ── Step 2 → 3 ──
  function handleEventNext() {
    if (!selectedEvent) { showToast("Select an event", "error"); return; }
    setErrors([]);
    setPreview(null);
    setStep(3);
  }

  // ── Step 3: parse, validate, build preview ──
  function handlePreview() {
    if (!fixturesText.trim()) { showToast("Paste the season fixtures first", "error"); return; }
    if (!selectedEvent) return;

    const { days, errors: errs, maxNum } = parseSeasonText(fixturesText);
    const eventCount = selectedEvent.dates.length;

    if (days.length && days.length !== eventCount) {
      errs.push(`You pasted ${days.length} matchday${days.length === 1 ? "" : "s"} but there ${eventCount === 1 ? "is" : "are"} ${eventCount} "${selectedEvent.name}" event${eventCount === 1 ? "" : "s"} on the calendar`);
    }
    if (days.length && maxNum > eventCount) {
      errs.push(`Matchday ${maxNum} has no event to land on — only ${eventCount} event${eventCount === 1 ? "" : "s"} exist`);
    }
    if (errs.length) {
      setErrors(errs);
      setPreview(null);
      return;
    }

    const poolNorm = new Set(leagueTeams.map(norm));
    const iconCache = {};
    const iconOf = n => (n in iconCache ? iconCache[n] : (iconCache[n] = resolveIcon(n)));
    const info = typed => {
      const resolved = fuzzyMatch(typed, leagueTeams);
      if (!leagueTeams.length) return { name: typed, status: "unchecked", typed };
      const inPool = poolNorm.has(norm(resolved));
      const status = !inPool ? "unmatched" : norm(resolved) === norm(typed) ? "ok" : "fuzzy";
      return { name: resolved, status, typed };
    };

    const built = days.map(d => {
      const date = selectedEvent.dates[d.num - 1];
      const existingTourn = toArr(calData[date]?.tournaments).find(t => norm(t?.name) === norm(tournament));
      return {
        num: d.num,
        date,
        replacing: existingTourn ? toArr(existingTourn.fixtures).length : 0,
        matches: d.matches.map(m => {
          const h = info(m.home);
          const a = info(m.away);
          return {
            home: h.name, homeStatus: h.status, homeTyped: h.typed, homeIcon: iconOf(h.name),
            away: a.name, awayStatus: a.status, awayTyped: a.typed, awayIcon: iconOf(a.name),
          };
        }),
      };
    });

    setErrors([]);
    setPreview(built);
  }

  // ── Save: replace this league's fixtures on every matched date, in one atomic write ──
  async function handleSave() {
    if (!preview?.length || !selectedEvent) return;
    setSaving(true);
    try {
      // Re-read the calendar so we never overwrite stale data
      const snap = await get(ref(db, "career_calendarEvents"));
      const data = snap.val() || {};
      const fresh = collectEvents(data).find(e => e.key === eventKey);
      if (!fresh || fresh.dates.length !== preview.length) {
        showToast("The calendar changed while you were working — go back and preview again", "error");
        setSaving(false);
        return;
      }

      const updates = {};
      let total = 0;
      for (const day of preview) {
        const date = fresh.dates[day.num - 1];
        const tournaments = JSON.parse(JSON.stringify(toArr(data[date]?.tournaments)));
        const newFixtures = day.matches.map(m => ({
          home: m.home,
          homeIcon: m.homeIcon || "",
          away: m.away,
          awayIcon: m.awayIcon || "",
        }));
        total += newFixtures.length;

        const tIdx = tournaments.findIndex(t => norm(t?.name) === norm(tournament));
        if (tIdx >= 0) {
          // Replace only this league's fixtures; keep the rest of the entry and other tournaments
          tournaments[tIdx] = { ...tournaments[tIdx], fixtures: newFixtures };
        } else {
          tournaments.push({ name: tournament, iconUrl: "", description: "", fixtures: newFixtures });
        }
        updates[`career_calendarEvents/${date}/tournaments`] = tournaments;
      }

      await update(ref(db), updates);

      showToast(`${total} fixtures saved across ${preview.length} matchdays ✓`, "success");
      reset();
      onClose();
      return;
    } catch (e) {
      showToast("Failed to save fixtures", "error");
    }
    setSaving(false);
  }

  const unmatchedCount = preview
    ? preview.reduce((n, d) => n + d.matches.reduce((k, m) => k + (m.homeStatus === "unmatched" ? 1 : 0) + (m.awayStatus === "unmatched" ? 1 : 0), 0), 0)
    : 0;
  const totalMatches = preview ? preview.reduce((n, d) => n + d.matches.length, 0) : 0;
  const totalReplacing = preview ? preview.reduce((n, d) => n + d.replacing, 0) : 0;

  return (
    <Modal active={open} onClose={closeAndReset}>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: "1.5rem", paddingRight: "2.5rem" }}>
        ⚽ ADD FIXTURES
      </h3>

      {/* Step progress bar */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {["League", "Event", "Fixtures"].map((label, i) => (
          <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: step > i ? "linear-gradient(90deg,#FF1493,#FF69B4)" : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* STEP 1 — Pick league */}
      {step === 1 && (
        <div>
          <SectionLabel>Select League</SectionLabel>
          <select value={tournament} onChange={e => setTournament(e.target.value)} style={inputStyle}>
            <option value="" style={{ background: "#000033" }}>— Choose a league —</option>
            {TOURNAMENT_OPTIONS.map(opt => (
              <option key={opt} value={opt} style={{ background: "#000033" }}>{opt}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "4px" }}>
            <button onClick={handleLeagueNext} style={btnStyle("gold")} disabled={loading}>
              {loading ? "Loading..." : "Next →"}
            </button>
            <button onClick={closeAndReset} style={btnStyle("outline")}>Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 2 — Pick event */}
      {step === 2 && (
        <div>
          <LeagueBadge>⚽ {tournament}</LeagueBadge>
          <SectionLabel>Select Event</SectionLabel>
          {events.length === 0 ? (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "10px", padding: "12px", marginBottom: "14px", fontSize: "0.82rem", color: "#ff8a8a" }}>
              No events found on the calendar. Add the matchday events first, then come back.
            </div>
          ) : (
            <>
              <select value={eventKey} onChange={e => setEventKey(e.target.value)} style={inputStyle}>
                <option value="" style={{ background: "#000033" }}>— Choose an event —</option>
                {events.map(ev => (
                  <option key={ev.key} value={ev.key} style={{ background: "#000033" }}>
                    {ev.name} — {ev.dates.length} date{ev.dates.length === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "14px", lineHeight: 1.6 }}>
                {selectedEvent
                  ? `Matchday 1 will land on ${formatDate(selectedEvent.dates[0])} and Matchday ${selectedEvent.dates.length} on ${formatDate(selectedEvent.dates[selectedEvent.dates.length - 1])}.`
                  : "Pick the event that marks this league's matchdays. Dates are counted from the earliest."}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={handleEventNext} style={btnStyle("gold")} disabled={!events.length}>Next →</button>
            <button onClick={() => setStep(1)} style={btnStyle("outline")}>← Back</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Paste fixtures */}
      {step === 3 && !preview && (
        <div>
          <LeagueBadge>⚽ {tournament}</LeagueBadge>
          <LeagueBadge>📅 {selectedEvent?.name} · {selectedEvent?.dates.length} dates</LeagueBadge>
          <SectionLabel>Paste Season Fixtures</SectionLabel>
          <textarea
            value={fixturesText}
            onChange={e => setFixturesText(e.target.value)}
            rows={12}
            placeholder={"Matchday 1\nEVERTON vs MANCHESTER UNITED, CHELSEA vs ASTON VILLA, ARSENAL vs TOTTENHAM HOTSPURS\n\nMatchday 2\nLIVERPOOL vs EVERTON, CHELSEA vs MANCHESTER UNITED, ASTON VILLA vs ARSENAL"}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "14px", lineHeight: 1.6 }}>
            Start each matchday with "Matchday 1", "Matchday 2"… · Separate matches with commas · Use "vs" between teams
          </div>

          {errors.length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: "10px", padding: "10px 12px", marginBottom: "14px", maxHeight: "160px", overflowY: "auto" }}>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#ff8a8a", marginBottom: "6px" }}>
                Nothing saved — fix {errors.length === 1 ? "this" : `these ${errors.length} problems`}:
              </div>
              {errors.map((er, i) => (
                <div key={i} style={{ fontSize: "0.76rem", color: "#ffb3b3", padding: "2px 0", lineHeight: 1.5 }}>• {er}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={handlePreview} style={btnStyle("gold")}>Preview →</button>
            <button onClick={() => setStep(2)} style={btnStyle("outline")}>← Back</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Preview + save */}
      {step === 3 && preview && (
        <div>
          <LeagueBadge>⚽ {tournament}</LeagueBadge>
          <LeagueBadge>📅 {selectedEvent?.name}</LeagueBadge>

          <SectionLabel>Preview</SectionLabel>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", marginBottom: "10px", lineHeight: 1.6 }}>
            {totalMatches} matches across {preview.length} matchdays.
            {totalReplacing > 0 && <span style={{ color: "#fcd34d" }}> {totalReplacing} existing fixtures will be replaced.</span>}
          </div>
          {unmatchedCount > 0 && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)", borderRadius: "10px", padding: "8px 12px", marginBottom: "10px", fontSize: "0.76rem", color: "#ffb3b3", lineHeight: 1.5 }}>
              {unmatchedCount} team name{unmatchedCount === 1 ? "" : "s"} not found in this league's teams (shown in red). Go back to fix them, or save as typed.
            </div>
          )}
          {leagueTeams.length === 0 && (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginBottom: "10px" }}>
              No team list found for this league, so names could not be checked.
            </div>
          )}

          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", marginBottom: "16px", maxHeight: "340px", overflowY: "auto" }}>
            {preview.map(day => (
              <div key={day.num} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", fontSize: "0.78rem", fontWeight: 700, color: "#FF69B4", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.15)", marginBottom: "4px" }}>
                  <span>Matchday {day.num}</span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
                    {formatDate(day.date)}
                    {day.replacing > 0 && <span style={{ color: "#fcd34d" }}> · replaces {day.replacing}</span>}
                  </span>
                </div>
                {day.matches.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: i < day.matches.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: "0.82rem", color: "#fff" }}>
                    {f.homeIcon && <img src={f.homeIcon} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                    <TeamName name={f.home} status={f.homeStatus} typed={f.homeTyped} align="left" />
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.6rem", fontWeight: 700 }}>VS</span>
                    {f.awayIcon && <img src={f.awayIcon} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                    <TeamName name={f.away} status={f.awayStatus} typed={f.awayTyped} align="right" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button onClick={handleSave} style={btnStyle("gold")} disabled={saving}>
              {saving ? "Saving..." : `💾 Save ${totalMatches} Fixtures`}
            </button>
            <button onClick={() => setPreview(null)} style={btnStyle("outline")} disabled={saving}>← Edit</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
