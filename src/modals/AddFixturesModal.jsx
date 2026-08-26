import { useState } from "react";
import { db } from "../firebase";
import { ref, get, set } from "firebase/database";
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

// Normalize string for comparison
function norm(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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

// Parse fixtures text split by full stop
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

export default function AddFixturesModal({ open, onClose, getTeamIcon, teamIconRegistry, clubs, showToast }) {
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

  // Resolve icon for a team name using all available sources
  function resolveIcon(teamName) {
    if (!teamName) return "";
    // 1. getTeamIcon from parent (checks registry + clubs + calData)
    const fromParent = getTeamIcon(teamName);
    if (fromParent) return fromParent;
    // 2. teamIconRegistry directly
    const key = teamName.trim().replace(/\./g, "_");
    if (teamIconRegistry?.[key]) return teamIconRegistry[key];
    // 3. clubs list
    const club = clubs?.find(c => norm(c.name) === norm(teamName));
    if (club?.badge) return club.badge;
    return "";
  }

  async function handleTournamentNext() {
    if (!tournament) { showToast("Select a tournament", "error"); return; }
    const leagueKey = TOURNAMENT_LEAGUE_MAP[tournament];
    setLoadingTeams(true);
    const teams = await fetchLeagueTeams(leagueKey);
    setLeagueTeams(teams);
    setLoadingTeams(false);
    if (teams.length === 0) {
      showToast(`No teams found for ${tournament} — you can still type fixtures`, "");
    }
    setStep(2);
  }

  function handleFixturesNext() {
    if (!fixturesText.trim()) { showToast("Enter at least one fixture", "error"); return; }
    const raw = parseFixturesText(fixturesText);
    if (!raw.length) { showToast("No valid fixtures. Use: Arsenal vs Tottenham. Chelsea vs Man Utd", "error"); return; }

    // Fuzzy match each team name against the league teams pool
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
        homeIcon: resolveIcon(f.home),
        away: f.away,
        awayIcon: resolveIcon(f.away),
      }));

      const newTournamentEntry = {
        name: tournament,
        iconUrl: "",
        description: "",
        fixtures: newFixtures,
      };

      if (existing) {
        const tournaments = JSON.parse(JSON.stringify(existing.tournaments || []));
        const tIdx = tournaments.findIndex(t => norm(t.name) === norm(tournament));
        if (tIdx >= 0) {
          if (!tournaments[tIdx].fixtures) tournaments[tIdx].fixtures = [];
          tournaments[tIdx].fixtures.push(...newFixtures);
        } else {
          tournaments.push(newTournamentEntry);
        }
        await set(ref(db, "career_calendarEvents/" + date), { ...existing, tournaments });
      } else {
        // Auto-create event
        await set(ref(db, "career_calendarEvents/" + date), {
          eventPairs: [{ name: tournament, iconUrl: "" }],
          season: null,
          tournaments: [newTournamentEntry],
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

      {/* Step progress bar */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
        {["Tournament", "Fixtures", "Date & Save"].map((label, i) => (
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "2rem", padding: "4px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#FF69B4", fontWeight: 700 }}>
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
            Separate each match with a full stop · Use "vs" between teams
          </div>
          {leagueTeams.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>{leagueTeams.length} teams loaded</span> — team names will be auto-matched to the closest real name
            </div>
          )}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={handleFixturesNext} style={btnStyle("gold")}>Next →</button>
            <button onClick={() => setStep(1)} style={btnStyle("outline")}>← Back</button>
          </div>
        </div>
      )}

      {/* STEP 3 — Preview + date + save */}
      {step === 3 && (
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,20,147,0.12)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: "2rem", padding: "4px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#FF69B4", fontWeight: 700 }}>
            ⚽ {tournament}
          </div>

          <SectionLabel>Matched Fixtures</SectionLabel>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "10px", marginBottom: "16px", maxHeight: "200px", overflowY: "auto" }}>
            {parsed.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < parsed.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: "0.85rem", color: "#fff" }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", minWidth: "18px" }}>{i + 1}</span>
                {resolveIcon(f.home) && <img src={resolveIcon(f.home)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                <span style={{ flex: 1 }}>{f.home}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.6rem", fontWeight: 700 }}>VS</span>
                {resolveIcon(f.away) && <img src={resolveIcon(f.away)} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />}
                <span style={{ flex: 1, textAlign: "right" }}>{f.away}</span>
              </div>
            ))}
          </div>

          <SectionLabel>Select Date</SectionLabel>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "14px" }}>
            No event on this date? One will be created automatically.
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
