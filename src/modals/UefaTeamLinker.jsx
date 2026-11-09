import { useState, useEffect, useMemo } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { getTournamentKey } from "../utils/leagueTournamentNames";
import { normName, decodeUefaLinks, encodeUefaLinks, linksPath } from "../utils/uefaLinks";
import { recalculateTable } from "../utils/tableLogic";

// ─── UEFA Team Linking (Champions League, Europa League, Conference League) ───
// Link a TABLE team to another team. The table team then takes its stats from
// that team's results, and its manager submits results as that team.
//
//   Barcelona (table)  →  Real Madrid
//   Barcelona's row in the table / group is built from Real Madrid's results only.

const inputStyle = {
  width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)", borderRadius: "10px", color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
};

export default function UefaTeamLinker({ league, season, teams, onBack }) {
  const [groupTeams, setGroupTeams] = useState([]);       // teams that live inside groups
  const [calendarNames, setCalendarNames] = useState([]); // names used in calendar fixtures
  const [resultNames, setResultNames] = useState([]);     // names used in saved + pending results
  const [links, setLinks] = useState({});                 // { tableTeam: linkedTeam }
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

  // Team names used in this season's saved + pending results
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

  // One row per table team (flat table + groups), no duplicates
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

  // Every name a team can be linked to: fixtures + results + the table's own teams
  const options = useMemo(() => {
    const seen = new Map();
    for (const n of [...calendarNames, ...resultNames, ...tableTeams.map(t => t.name)]) {
      const k = normName(n);
      if (k && !seen.has(k)) seen.set(k, n);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [calendarNames, resultNames, tableTeams]);

  // Names that actually appear in fixtures/results (used for the "no results yet" hints)
  const usedNorms = useMemo(
    () => new Set([...calendarNames, ...resultNames].map(normName)),
    [calendarNames, resultNames]
  );

  // Which table team already uses each link target (one target per table team)
  const takenBy = useMemo(() => {
    const m = {};
    for (const [tbl, target] of Object.entries(links)) m[normName(target)] = tbl;
    return m;
  }, [links]);

  function handleLink(tableTeam, target) {
    setLinks(prev => {
      const updated = { ...prev };
      if (!target) delete updated[tableTeam];
      else updated[tableTeam] = target;
      return updated;
    });
  }

  async function saveLinks() {
    setSaving(true);
    setStatus("");
    setSkipped([]);
    try {
      await set(ref(db, linksPath(league)), encodeUefaLinks(links));
      setStatus("Links saved. Recalculating the table from results...");
      const report = await recalculateTable(league, season);
      setSkipped(report?.skipped || []);
      setStatus(
        `✅ Links saved! ${report?.applied ?? 0} result${report?.applied === 1 ? "" : "s"} counted in the table.` +
        (report?.skipped?.length ? ` ⚠️ ${report.skipped.length} could not be matched.` : "")
      );
    } catch (e) {
      setStatus("❌ Error: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 8 }}>🔗 Team Linking</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 20 }}>
        Link a table team to another team. The table team takes its stats from <b>that team's results</b>,
        and its manager submits results as that team.<br />
        e.g. "Barcelona" linked to "Real Madrid" → Barcelona's row uses Real Madrid's results only.
        Teams with no link use their own results.
      </p>

      {tableTeams.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {tableTeams.map(team => {
            const link = links[team.name] || "";
            const ownUsed = usedNorms.has(normName(team.name));
            const ok = !!link || ownUsed;
            return (
              <div key={team.name} style={{ background: "rgba(255,20,147,0.06)", border: `1px solid ${ok ? "rgba(255,20,147,0.2)" : "rgba(255,180,0,0.5)"}`, borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>
                  📋 {team.name}{team.group ? <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}> · {team.group}</span> : null}
                </div>
                <select
                  value={link}
                  onChange={e => handleLink(team.name, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— No link (use its own results) —</option>
                  {/* keep a saved link visible even if that name has left the options */}
                  {link && !options.includes(link) && <option value={link}>{link}</option>}
                  {options
                    .filter(o => normName(o) !== normName(team.name))
                    .map(o => {
                      const owner = takenBy[normName(o)];
                      const taken = owner && normName(owner) !== normName(team.name);
                      return (
                        <option key={o} value={o} disabled={taken}>
                          {o}{taken ? `  (already linked to ${owner})` : ""}
                        </option>
                      );
                    })}
                </select>
                {link ? (
                  <div style={{ color: "#22c55e", fontSize: "0.8rem", marginTop: 6 }}>
                    ✅ Uses the results of: {link}
                    {!usedNorms.has(normName(link)) && (
                      <span style={{ color: "#FFB347" }}> (no fixtures or results under that name yet)</span>
                    )}
                  </div>
                ) : ownUsed ? (
                  <div style={{ color: "#22c55e", fontSize: "0.8rem", marginTop: 6 }}>✅ Uses its own results</div>
                ) : (
                  <div style={{ color: "#FFB347", fontSize: "0.8rem", marginTop: 6 }}>
                    ⚠️ No fixtures or results under this name yet.
                  </div>
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

      {status && (
        <div style={{ color: status.startsWith("❌") ? "#ff6b6b" : status.includes("⚠️") ? "#FFB347" : "#22c55e", fontSize: "0.85rem", marginBottom: 12, textAlign: "center" }}>{status}</div>
      )}
      {skipped.length > 0 && (
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", marginBottom: 12 }}>
          Results using a team name no table team uses or is linked to:
          {skipped.slice(0, 8).map((s, i) => (
            <div key={i}>• {s.homeTeam} vs {s.awayTeam} — unknown: {s.missing.join(", ")}</div>
          ))}
          {skipped.length > 8 && <div>…and {skipped.length - 8} more</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={saveLinks}
          disabled={saving}
          style={{ flex: 1, padding: 14, background: saving ? "rgba(255,20,147,0.4)" : "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontSize: "1rem" }}
        >
          {saving ? "Saving..." : "💾 Save Links"}
        </button>
        <button onClick={onBack} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
