import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

// Tokyo-matching font sizes
const thStyle = {
  padding: "18px 16px",
  color: "rgba(255,255,255,0.8)",
  fontSize: "2.2rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "1px",
  background: "rgba(255,20,147,0.2)",
  borderBottom: "2px solid #FF1493",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const tdStyle = {
  padding: "18px 16px",
  textAlign: "center",
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: "3.6rem",
  color: "#fff",
  whiteSpace: "nowrap",
};

export default function GroupStageModal({ league, season }) {
  const { isAdmin, teamIconsCache } = useAdmin();
  const [groups, setGroups] = useState([]); // [{ key, name, teams: [{key, name, p, w, d, l, gs, gc, gd, pts}] }]
  const [clubs, setClubs] = useState([]); // all clubs from career_team_management
  const [badges, setBadges] = useState({});
  const [zones, setZones] = useState([]);
  const [dashedLines, setDashedLines] = useState([]);

  // New group form
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  // Add team to group
  const [addTeamGroupKey, setAddTeamGroupKey] = useState(null);
  const [selectedClub, setSelectedClub] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}/seasons/season_${season}/groups`), snap => {
      const d = snap.val() || {};
      const list = Object.entries(d).map(([gKey, gVal]) => ({
        key: gKey,
        name: gVal.name || gKey,
        teams: gVal.teams
          ? Object.entries(gVal.teams).map(([tk, tv]) => ({ key: tk, ...tv }))
          : [],
      }));
      setGroups(list);
    });
    return () => unsub();
  }, [league, season]);

  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const d = snap.val() || {};
      const list = Object.entries(d).map(([name, val]) => ({ name, badge: val?.info?.badge || null })).sort((a, b) => a.name.localeCompare(b.name));
      setClubs(list);
      const map = {};
      list.forEach(c => { if (c.badge) map[c.name] = c.badge; });
      setBadges(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}_settings/zones`), snap => {
      const d = snap.val();
      if (d) { setZones(d.colorZones || []); setDashedLines(d.dashedLines || []); }
    });
    return () => unsub();
  }, [league]);

  const combined = { ...teamIconsCache, ...badges };

  function getZoneBarColor(pos) {
    for (const z of zones) {
      if (pos >= z.from && pos <= z.to) return z.color;
    }
    return null;
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    await push(ref(db, `career_${league}/seasons/season_${season}/groups`), { name: newGroupName.trim(), teams: {} });
    setNewGroupName("");
    setAddingGroup(false);
  }

  async function deleteGroup(gKey) {
    if (!window.confirm("Delete this group?")) return;
    await remove(ref(db, `career_${league}/seasons/season_${season}/groups/${gKey}`));
  }

  async function addTeamToGroup(gKey) {
    if (!selectedClub) return;
    await push(ref(db, `career_${league}/seasons/season_${season}/groups/${gKey}/teams`), {
      name: selectedClub, p: 0, w: 0, d: 0, l: 0, gs: 0, gc: 0, gd: 0, pts: 0,
    });
    setSelectedClub("");
    setAddTeamGroupKey(null);
  }

  async function removeTeamFromGroup(gKey, tKey) {
    if (!window.confirm("Remove this team from group?")) return;
    await remove(ref(db, `career_${league}/seasons/season_${season}/groups/${gKey}/teams/${tKey}`));
  }

  async function updateTeamStat(gKey, tKey, field, val) {
    await set(ref(db, `career_${league}/seasons/season_${season}/groups/${gKey}/teams/${tKey}/${field}`), +val);
  }

  return (
    <div>
      {/* Admin: Add Group */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name (e.g. Group A)"
            style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }}
          />
          <button onClick={addGroup} disabled={addingGroup} style={{ padding: "10px 20px", background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Add Group
          </button>
        </div>
      )}

      {!groups.length && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.35)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🗂️</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3 }}>No Groups Yet</div>
        </div>
      )}

      {groups.map(group => {
        const sorted = [...group.teams].sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.gd || 0) - (a.gd || 0));
        return (
          <div key={group.key} style={{ marginBottom: 32 }}>
            {/* Group header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "rgba(255,20,147,0.15)", borderBottom: "2px solid #FF1493", borderRadius: "16px 16px 0 0" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: 3, color: "#fff" }}>🗂️ {group.name}</span>
              {isAdmin && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setAddTeamGroupKey(addTeamGroupKey === group.key ? null : group.key)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 }}>
                    {addTeamGroupKey === group.key ? "Cancel" : "+ Add Team"}
                  </button>
                  <button onClick={() => deleteGroup(group.key)} style={{ background: "rgba(255,0,0,0.15)", border: "1px solid rgba(255,0,0,0.3)", color: "#ff6b6b", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
                </div>
              )}
            </div>

            {/* Add team dropdown */}
            {isAdmin && addTeamGroupKey === group.key && (
              <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderTop: "none" }}>
                <select value={selectedClub} onChange={e => setSelectedClub(e.target.value)} style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", fontFamily: "inherit", fontSize: "0.9rem", outline: "none" }}>
                  <option value="">— Select team —</option>
                  {clubs.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <button onClick={() => addTeamToGroup(group.key)} style={{ padding: "10px 18px", background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
            )}

            {/* Mini table */}
            <div style={{ borderRadius: sorted.length ? "0 0 16px 16px" : 0, overflow: "hidden", ...GLASS }}>
              {!sorted.length ? (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>No teams in this group yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, position: "sticky", left: 0, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 60 }}>Pos</th>
                        <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: 60, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 220, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>Club</th>
                        {["P", "W", "D", "L", "GS", "GC", "GD", "Pts"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                        {isAdmin && <th style={thStyle}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((team, idx) => {
                        const pos = idx + 1;
                        const barColor = getZoneBarColor(pos);
                        const gd = team.gd || 0;
                        return (
                          <tr key={team.key} style={{ borderBottom: "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                            onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                            onMouseOut={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "18px 16px", textAlign: "center", position: "sticky", left: 0, background: "rgba(0,0,30,0.95)", zIndex: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                                {barColor && <span style={{ width: 6, height: 28, borderRadius: 3, background: barColor, display: "inline-block" }} />}
                                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff" }}>{pos}</span>
                              </div>
                            </td>
                            <td style={{ padding: "18px 20px", position: "sticky", left: 60, background: "rgba(0,0,30,0.95)", zIndex: 10, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {combined[team.name] && <img src={combined[team.name]} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />}
                                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff", letterSpacing: "0.5px" }}>{team.name}</span>
                              </div>
                            </td>
                            {[team.p || 0, team.w || 0, team.d || 0, team.l || 0, team.gs || 0, team.gc || 0, gd > 0 ? `+${gd}` : gd].map((val, ci) => (
                              <td key={ci} style={tdStyle}>{val}</td>
                            ))}
                            <td style={{ ...tdStyle, fontSize: "3.6rem", color: "#FF1493", fontWeight: 900 }}>{team.pts || 0}</td>
                            {isAdmin && (
                              <td style={{ padding: "18px 16px" }}>
                                <button onClick={() => removeTeamFromGroup(group.key, team.key)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ff6b6b", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.9rem" }}>🗑️</button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legend */}
              {(zones.length > 0 || dashedLines.length > 0) && (
                <div style={{ padding: "10px 20px", background: "rgba(255,20,147,0.08)", display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", borderTop: "1px solid rgba(255,20,147,0.15)" }}>
                  {zones.map((z, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                      <span style={{ width: 6, height: 18, borderRadius: 3, background: z.color, display: "inline-block" }} />
                      {z.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
