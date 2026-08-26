import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, set } from "firebase/database";
import Modal from "../components/Modal";

// Map tournament name -> firebase league key
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

// Fuzzy match: find closest team name in pool to what user typed
function fuzzyMatch(input, pool) {
  if (!input || !pool.length) return input;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const inp = norm(input);

  // Exact match
  const exact = pool.find(t => norm(t) === inp);
  if (exact) return exact;

  // Contains match
  const contains = pool.filter(t => norm(t).includes(inp) || inp.includes(norm(t)));
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    // pick shortest (closest)
    return contains.sort((a, b) => a.length - b.length)[0];
  }

  // Word overlap scoring
  const inpWords = inp.split(/\s+/).filter(Boolean);
  let best = null, bestScore = 0;
  for (const t of pool) {
    const tWords = norm(t).split(/\s+/).filter(Boolean);
    const overlap = inpWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw))).length;
    const score = overlap / Math.max(inpWords.length, tWords.length);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (bestScore > 0.3 && best) return best;

  return input; // no match found, return as typed
}

// Parse fixtures text — split by full stop
function parseFixturesText(text) {
  return text
    .split(".")
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const m = p.match(/^(.+?)\s+vs\s+(.+)$/i);
      return m ? { home: m[1].trim(), away: m[2].trim() } : null;
    })
    .filter(Boolean);
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

export default function AddFixturesModal({ open, onClose, getTeamIcon, showToast }) {
  const [step, setStep] = useState(1);
  const [tournament, setTournament] = useState("");
  const [fixturesText, setFixturesText] = useState("");
  const [date, setDate] = useState("");
  const [leagueTeams, setLeagueTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [parsed, setParsed] = useState([]);
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep(1);
    setTournament("");
    setFixturesText("");
    setDate("");
    setLeagueTeams([]);
    setParsed([]);
    setSaving(false);
  }

  // When tournament is chosen, fetch its teams
  async function handleTournamentNext() {
    if (!tournament) { showToast("Select a tournament", "error"); return; }
    const leagueKey = TOURNAMENT_LEAGUE_MAP[tournament];
    setLoadingTeams(true);
    const teams = await fetchLeagueTeams(leagueKey);
    setLeagueTeams(teams);
    setLoadingTeams(false);
    setStep(2);
  }

  // When fixtures typed, move to date step
  function handleFixturesNext() {
    if (!fixturesText.trim()) { showToast("Enter at least one fixture", "error"); return; }
    const raw = parseFixturesText(fixturesText);
    if (!raw.length) { showToast("No valid fixtures found. Use: Team A vs Team B. Team C vs Team D", "error"); return; }

    // Fuzzy match teams
    const matched = raw.map(f => ({
      home: fuzzyMatch(f.home, leagueTeams),
      away: fuzzyMatch(f.away, leagueTeams),
    }));
    setParsed(matched);
    setStep(3);
  }

  async function handleSave() {
    if (!date) { showToast("Select a date", "error"); return; }
    if (!parsed.length) { showToast("No fixtures to save", "error"); return; }
    setSaving(true);
    try {
      const snap = await get(ref(db, "career_calendarEvents/" + date));
      const existing = snap.val();

      const newFixtures = parsed.map(f => ({
        home: f.home,
        homeIcon: getTeamIcon(f.home) || "",
        away: f.away,
        awayIcon: getTeamIcon(f.away) || "",
      }));

      const newTournament = {
        name: tournament,
        iconUrl: "",
        description: "",
        fixtures: newFixtures,
      };

      if (existing) {
        // Event exists — check if this tournament already in it
        const tournaments = JSON.parse(JSON.stringify(existing.tournaments || []));
        const tIdx = tournaments.findIndex(t => t.name?.trim().toLowerCase() === tournament.trim().toLowerCase());
        if (tIdx >= 0) {
          // Add fixtures to existing tournament entry
          if (!tournaments[tIdx].fixtures) tournaments[tIdx].fixtures = [];
          tournaments[tIdx].fixtures.push(...newFixtures);
        } else {
          // Add new tournament entry
          tournaments.push(newTournament);
        }
        await set(ref(db, "career_calendarEvents/" + date), { ...existing, tournaments });
      } else {
        // No event on this date — create one automatically
        await set(ref(db, "career_calendarEvents/" + date), {
          eventPairs: [{ name: tournament, iconUrl: "" }],
          season: null,
          tournaments: [newTournament],
        });
      }

      showToast(`${parsed.length} fixture(s) saved ✓`, "success");
      reset();
      onClose();
    } catch (e) {
      showToast("Failed to save fixtures", "error");
    }
    setSaving(false);
  }

  return (
    <Modal active={open} onClose={() => { reset(); onClose(); }}>
      <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em", marginBottom: "1.5rem", paddingRight: "2.5rem" }}>
        ⚽ ADD FIXTURES
      </h3>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {["Tournament", "Fixtures", "Date"].map((label, i) => (
          <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: step > i ? "linear-gradient(90deg,#FF1493,#FF69B4)" : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* STEP 1 — Pick tournament */}
      {step === 1 && (
        <div>
          <SectionLabel>Select Tournament</SectionLabel>
          <select value={tournament} onChange={e => setTournament(e.target.value)} style={inputStyle}>
            <option value="" style={{ background: "#000033" }}>— Choose a tournament —</option>
            {TOURNAMENT_OPTIONS.map(opt => (
              <option key={opt} value={opt} style={{ background: "#000033" }}>{opt}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "4px" }}>
            <button onClick={handleTournamentNext} style={btnStyle("gold")} disabled={loadingTeams}>
              {loadingTeams ? "Loading teams..." : "Next →"}
            </button>
            <button onClick={() => { reset(); onClose(); }} style={btnStyle("outline")}>Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 2 — Type fixtures */}
      {step === 2 && (
        <div>
          {/* Tournament badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "2rem", padding: "4px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#FF69B4", fontWeight: 700, letterSpacing: "0.04em" }}>
            ⚽ {tournament}
          </div>

          <SectionLabel>Type Fixtures</SectionLabel>
          <textarea
            value={fixturesText}
            onChange={e => setFixturesText(e.target.value)}
            rows={6}
            placeholder={"Arsenal vs Tottenham. Chelsea vs Man Utd. Liverpool vs Man City"}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
          />
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "14px" }}>
            Separate matches with a full stop · Use "vs" between teams
          </div>

          {leagueTeams.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{leagueTeams.length} teams loaded</span> — team names will be auto-matched
            </div>
          )}

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={handleFixturesNext} style={btnStyle("gold")}>Next →</button>
            <button onClick={() => setStep(1)} style={btnStyle("outline")}>← Back</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Pick date + preview + save */}
      {step === 3 && (
        <div>
          {/* Tournament badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "2rem", padding: "4px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#FF69B4", fontWeight: 700, letterSpacing: "0.04em" }}>
            ⚽ {tournament}
          </div>

          {/* Preview fixtures */}
          <SectionLabel>Fixtures Preview</SectionLabel>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", marginBottom: "16px", maxHeight: "200px", overflowY: "auto" }}>
            {parsed.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < parsed.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: "0.85rem", color: "#fff" }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", minWidth: "20px" }}>{i + 1}</span>
                {getTeamIcon(f.home) && <img src={getTeamIcon(f.home)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                <span style={{ flex: 1 }}>{f.home}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.6rem", fontWeight: 700 }}>VS</span>
                {getTeamIcon(f.away) && <img src={getTeamIcon(f.away)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                <span style={{ flex: 1, textAlign: "right" }}>{f.away}</span>
              </div>
            ))}
          </div>

          <SectionLabel>Select Date</SectionLabel>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "14px" }}>
            If no event exists on this date, one will be created automatically
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button onClick={handleSave} style={btnStyle("gold")} disabled={saving}>
              {saving ? "Saving..." : `💾 Save ${parsed.length} Fixture(s)`}
            </button>
            <button onClick={() => setStep(2)} style={btnStyle("outline")}>← Back</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
