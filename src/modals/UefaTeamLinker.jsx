import { useState, useEffect, useMemo } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { getTournamentKey } from "../utils/leagueTournamentNames";
import { normName, decodeUefaLinks, encodeUefaLinks, linksPath } from "../utils/uefaLinks";
import { recalculateTable } from "../utils/tableLogic";

// ─── UEFA Team Linking (Champions League, Europa League, Conference League) ───
// A table team can be linked to ONE OR MORE teams. Its stats are then built from
// the results of ALL of its linked teams added together (capitals never matter:
// REAL MADRID and Real Madrid are the same team).
//
//   Barcelona (table)  ←  Real Madrid, PSG
//
// Type in the field to find a team, tap it to link it, tap ✕ on a tag to remove it.
// Every change saves immediately.

const inputStyle = {
  width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
};

export default function UefaTeamLinker({ league, season, teams, onBack }) {
  const [groupTeams, setGroupTeams] = useState([]);       // teams that live inside groups
  const [calendarNames, setCalendarNames] = useState([]); // names used in calendar fixtures
  const [resultNames, setResultNames] = useState([]);     // names used in saved + pending results
  const [clubNames, setClubNames] = useState([]);         // every club in the game
  const [links, setLinks] = useState({});                 // { tableTeam: [linkedTeam, ...] }
  const [queries, setQueries] = useState({});             // { tableTeam: text typed so far }
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [skipped, setSkipped] = useState([]);

  // Saved links
  useEffect(() => {
    const unsub = onValue(ref(db, linksPath(league)), snap => setLinks(decodeUefaLinks(snap.val())));
    return () => unsub();
  }, [league]);

  // Group-stage teams (the flat `teams` list is empty when a league uses groups)
  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/groups`), snap => {
      const list = [];
      for (const g of Object.values(snap.val() || {})) {
        for (const t of Object.values(g?.teams || {})) {
          if (t?.name) list.push({ name: t.name, group: g.name || "" });
        }
      }
      setGroupTeams(list);
    });
    return () => unsub();
  }, [league, season]);

  // Every club in the game
  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const out = [];
      for (const [key, v] of Object.entries(snap.val() || {})) {
        // clubs are normally keyed by name; entries created with push() keep the name inside
        const name = typeof v?.name === "string" && /^-[\w-]{15,}$/.test(key) ? v.name : key;
        if (name) out.push(name);
      }
      setClubNames(out);
    });
    return () => unsub();
  }, []);

  // Team names used in this tournament's calendar fixtures
  useEffect(() => {
    const targetName = getTournamentKey(league);
    const unsub = onValue(ref(db, "career_calendarEvents"), snap => {
      const names = new Set();
      for (const dateData of Object.values(snap.val() || {})) {
        for (const tourn of Object.values(dateData?.tournaments || {})) {
          if ((tourn?.name || "").toLowerCase().includes(targetName)) {
            for (const fix of Object.values(tourn?.fixtures || {})) {
              if (fix?.home) names.add(fix.home);
              if (fix?.away) names.add(fix.away);
            }
          }
        }
      }
      setCalendarNames([...names]);
    });
    return () => unsub();
  }, [league]);

  // Team names used in this season's saved + pending results (every spelling kept)
  useEffect(() => {
    const names = { res: new Set(), pend: new Set() };
    const publish = () => setResultNames([...new Set([...names.res, ...names.pend])]);
    const collect = (bucket) => snap => {
      names[bucket] = new Set();
      for (const r of Object.values(snap.val() || {})) {
        if (r?.homeTeam) names[bucket].add(r.homeTeam);
        if (r?.awayTeam) names[bucket].add(r.awayTeam);
      }
      publish();
    };
    const u1 = onValue(ref(db, PATHS.results(league, season)), collect("res"));
    const u2 = onValue(ref(db, PATHS.pendingResults(league, season)), collect("pend"));
    return () => { u1(); u2(); };
  }, [league, season]);

  // One card per table team (flat table + groups), no duplicates
  const tableTeams = useMemo(() => {
    const seen = new Set(), out = [];
    for (const t of [...(teams || []).map(t => ({ name: t.name, group: "" })), ...groupTeams]) {
      const n = normName(t.name);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(t);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, groupTeams]);

  // Everything that can be linked. Every spelling is kept (REAL MADRID and Real
  // Madrid both show up); teams from this league's Results tab are listed first.
  const pool = useMemo(() => {
    const inResults = [...new Set(resultNames)].sort((a, b) => a.localeCompare(b));
    const taken = new Set(inResults);
    const others = [];
    for (const n of [...clubNames, ...calendarNames, ...tableTeams.map(t => t.name)]) {
      if (n && !taken.has(n)) { taken.add(n); others.push(n); }
    }
    others.sort((a, b) => a.localeCompare(b));
    return [
      ...inResults.map(name => ({ name, fromResults: true })),
      ...others.map(name => ({ name, fromResults: false })),
    ];
  }, [resultNames, clubNames, calendarNames, tableTeams]);

  const resultTeamCount = useMemo(() => new Set(resultNames.map(normName)).size, [resultNames]);
  const usedNorms = useMemo(
    () => new Set([...calendarNames, ...resultNames].map(normName)),
    [calendarNames, resultNames]
  );

  // Matching teams for what has been typed in one card's field
  function suggestionsFor(team) {
    const q = normName(queries[team.name] || "");
    if (!q) return [];
    const own = normName(team.name);
    return pool
      .filter(p => normName(p.name).includes(q) && normName(p.name) !== own)
      .slice(0, 40);
  }

  // Saves the whole link set, then recalculates the table so it reflects the change
  async function persist(next, message) {
    setLinks(next);
    setSaving(true);
    setSkipped([]);
    setStatus("Saving...");
    try {
      await set(ref(db, linksPath(league)), encodeUefaLinks(next));
      let counted = "";
      try {
        const report = await recalculateTable(league, season);
        setSkipped(report?.skipped || []);
        counted = ` ${report?.applied ?? 0} result${report?.applied === 1 ? "" : "s"} counted in the table.` +
          (report?.skipped?.length ? ` ⚠️ ${report.skipped.length} could not be matched.` : "");
      } catch (e) {
        counted = ` (Table recalculation failed: ${e.message})`;
      }
      setStatus(`✅ ${message}${counted}`);
    } catch (e) {
      setStatus("❌ Could not save: " + e.message);
    }
    setSaving(false);
  }

  function addLink(team, name) {
    const existing = links[team.name] || [];
    if (existing.some(n => normName(n) === normName(name))) return;
    setQueries(q => ({ ...q, [team.name]: "" }));
    persist({ ...links, [team.name]: [...existing, name] }, `${team.name} ← ${name} linked.`);
  }

  function removeLink(team, name) {
    const next = { ...links };
    const rest = (links[team.name] || []).filter(n => n !== name);
    if (rest.length) next[team.name] = rest; else delete next[team.name];
    persist(next, `${name} removed from ${team.name}.`);
  }

  async function recalcOnly() {
    setSaving(true);
    setSkipped([]);
    setStatus("Recalculating...");
    try {
      const report = await recalculateTable(league, season);
      setSkipped(report?.skipped || []);
      setStatus(`✅ Recalculated. ${report?.applied ?? 0} result${report?.applied === 1 ? "" : "s"} counted in the table.` +
        (report?.skipped?.length ? ` ⚠️ ${report.skipped.length} could not be matched.` : ""));
    } catch (e) {
      setStatus("❌ Error: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 8 }}>🔗 Team Linking</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 20 }}>
        Type a team's name to find it, then tap it to link it. A table team can have <b>several</b> links
        and takes its stats from <b>all</b> of them added together. Capitals don't matter.
        Tap ✕ on a tag to remove a link. Every change saves immediately.<br />
        <span style={{ color: "#FF69B4" }}>Teams found in this league's Results tab: {resultTeamCount}</span>
      </p>

      {status && (
        <div style={{ color: status.startsWith("❌") ? "#ff6b6b" : status.includes("⚠️") ? "#FFB347" : "#22c55e", fontSize: "0.85rem", marginBottom: 12, textAlign: "center", position: "sticky", top: 0, background: "rgb(0,0,40)", padding: "8px 0", zIndex: 1 }}>{status}</div>
      )}
      {skipped.length > 0 && (
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", marginBottom: 12 }}>
          Results using a team name that no table team uses or is linked to:
          {skipped.slice(0, 8).map((s, i) => (
            <div key={i}>• {s.homeTeam} vs {s.awayTeam} — unknown: {s.missing.join(", ")}</div>
          ))}
          {skipped.length > 8 && <div>…and {skipped.length - 8} more</div>}
        </div>
      )}

      {tableTeams.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {tableTeams.map(team => {
            const linked = links[team.name] || [];
            const linkedNorms = new Set(linked.map(normName));
            const suggestions = suggestionsFor(team);
            const query = queries[team.name] || "";
            const ownUsed = usedNorms.has(normName(team.name));
            return (
              <div key={team.name} style={{ background: "rgba(255,20,147,0.06)", border: `1px solid ${linked.length || ownUsed ? "rgba(255,20,147,0.2)" : "rgba(255,180,0,0.5)"}`, borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>
                  📋 {team.name}{team.group ? <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}> · {team.group}</span> : null}
                </div>

                {linked.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {linked.map(name => (
                      <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.5)", borderRadius: 999, padding: "4px 6px 4px 12px", color: "#fff", fontSize: "0.85rem" }}>
                        {name}
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          disabled={saving}
                          onClick={() => removeLink(team, name)}
                          style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: saving ? "not-allowed" : "pointer", lineHeight: "22px", padding: 0 }}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={query}
                  onChange={e => setQueries(q => ({ ...q, [team.name]: e.target.value }))}
                  placeholder="Type a team name to link…"
                  autoComplete="off"
                  style={inputStyle}
                />

                {query.trim() !== "" && (
                  <div style={{ marginTop: 6, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
                    {suggestions.length === 0 ? (
                      <div style={{ padding: "10px 14px", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>No team matches "{query}".</div>
                    ) : suggestions.map(s => {
                      const already = linkedNorms.has(normName(s.name));
                      return (
                        <button
                          key={s.name}
                          type="button"
                          disabled={already || saving}
                          onClick={() => addLink(team, s.name)}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", color: already ? "rgba(255,255,255,0.4)" : "#fff", fontSize: "0.9rem", cursor: already || saving ? "not-allowed" : "pointer" }}
                        >
                          <span>{s.name}</span>
                          <span style={{ fontSize: "0.7rem", color: already ? "#22c55e" : s.fromResults ? "#FF69B4" : "rgba(255,255,255,0.35)" }}>
                            {already ? "✓ linked" : s.fromResults ? "in Results" : "other"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {linked.length > 0 ? (
                  <div style={{ color: "#22c55e", fontSize: "0.8rem", marginTop: 6 }}>
                    ✅ Stats = the results of {linked.length === 1 ? linked[0] : `all ${linked.length} linked teams`} added together
                  </div>
                ) : ownUsed ? (
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginTop: 6 }}>No links — uses its own results</div>
                ) : (
                  <div style={{ color: "#FFB347", fontSize: "0.8rem", marginTop: 6 }}>⚠️ No links, and no fixtures or results under this name yet.</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "30px 0", marginBottom: 20 }}>
          No teams in this league yet. Add teams to the table or to a group first.
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={recalcOnly}
          disabled={saving}
          style={{ flex: 1, padding: 14, background: saving ? "rgba(255,20,147,0.4)" : "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "1rem" }}
        >
          {saving ? "Working..." : "🔄 Recalculate"}
        </button>
        <button onClick={onBack} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
