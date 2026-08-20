import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import TabBar from "../components/TabBar";
import BackgroundVideo from "../components/BackgroundVideo";
import { uploadToImgBB } from "../utils/imgUpload";

// ─── Constants ───────────────────────────────────────────────────────────────
const LEAGUE = "tokyo";
const LEAGUE_NAME = "TOKYO LEAGUE";
const SEASON = "1";

const TABLE_PATH    = `career_${LEAGUE}/seasons/season_${SEASON}/table`;
const RESULTS_PATH  = `career_${LEAGUE}/seasons/season_${SEASON}/results`;
const SETTINGS_PATH = `career_${LEAGUE}/seasons/season_${SEASON}/settings`;
const SLIDESHOW_PATH = `career_${LEAGUE}/slideshow`;
const FIXTURES_ROOT = "calendarEvents";
const FIXTURES_TOURNAMENT = "tokyo pre season";

const MAIN_TABS = [
  { id: "leaguePhase", label: "LEAGUE PHASE" },
  { id: "fixtures",    label: "FIXTURES" },
  { id: "results",     label: "RESULTS" },
];

const RESULT_SUB_TABS = [
  { id: "leaguePhase", label: "League Phase" },
  { id: "knockouts",   label: "Knockouts" },
  { id: "playoffs",    label: "Play-offs" },
];

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,20,147,0.2)",
};

const inputStyle = {
  width: "100%", padding: "14px 18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.35)",
  borderRadius: "12px", color: "#fff",
  fontFamily: "inherit", fontSize: "1rem",
  outline: "none", boxSizing: "border-box",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function posBarColor(pos) {
  if (pos <= 8)  return "#4169E1";
  if (pos <= 24) return "#FFB800";
  return "#ef4444";
}

function getTeamIcon(cache, teamName, size = 36) {
  const url = cache?.[teamName];
  if (!url) return null;
  return <img src={url} alt={teamName} style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }} />;
}

// ─── Slideshow ────────────────────────────────────────────────────────────────
function Slideshow({ images }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) return (
    <div style={{ width: "100%", aspectRatio: "16/7", background: "rgba(255,20,147,0.04)", border: "1px dashed rgba(255,20,147,0.2)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "1rem" }}>No slideshow images</span>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", overflow: "hidden", borderRadius: "20px", marginBottom: 28 }}>
      {images.map((url, i) => (
        <img key={i} src={url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === idx ? 1 : 0, transition: "opacity 0.7s ease" }} />
      ))}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {images.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: 10, height: 10, borderRadius: "50%", background: i === idx ? "#FF1493" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add / Edit Team Modal ────────────────────────────────────────────────────
function TokyoAddTeamModal({ team = null, onClose }) {
  const isEdit = !!team;
  const [form, setForm] = useState({
    name: team?.name || "", p: team?.p || 0, w: team?.w || 0, d: team?.d || 0,
    l: team?.l || 0, gf: team?.gf || 0, ga: team?.ga || 0, gd: team?.gd || 0, pts: team?.pts || 0,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  function handleChange(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setStatus("Team name required."); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        p: +form.p || 0, w: +form.w || 0, d: +form.d || 0, l: +form.l || 0,
        gf: +form.gf || 0, ga: +form.ga || 0, gd: +form.gd || 0, pts: +form.pts || 0,
      };
      if (isEdit) await update(ref(db, `${TABLE_PATH}/${team.id}`), data);
      else await push(ref(db, TABLE_PATH), data);
      onClose();
    } catch (e) { setStatus("Error: " + e.message); }
    setSaving(false);
  }

  const labelStyle = { color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" };
  const fields = [["name", "Team Name", "text"], ["p", "Played", "number"], ["w", "Wins", "number"], ["d", "Draws", "number"], ["l", "Losses", "number"], ["gf", "Goals For", "number"], ["ga", "Goals Against", "number"], ["gd", "Goal Difference", "number"], ["pts", "Points", "number"]];

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20, letterSpacing: "2px" }}>{isEdit ? "✏️ Edit Team" : "➕ Add Team"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {fields.map(([field, label, type]) => (
          <div key={field} style={{ gridColumn: field === "name" ? "1 / -1" : "auto" }}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={form[field]} onChange={e => handleChange(field, e.target.value)} style={{ ...inputStyle, padding: "10px 14px" }} />
          </div>
        ))}
      </div>
      {status && <div style={{ color: "#ff6b6b", fontSize: "0.85rem", marginBottom: 12 }}>{status}</div>}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Team Logo Modal ──────────────────────────────────────────────────────────
function TeamLogoModal({ onClose }) {
  const { updateTeamIcon } = useAdmin();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [existingLogos, setExistingLogos] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(db, TABLE_PATH), snap => {
      const d = snap.val();
      setTeams(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => a.name.localeCompare(b.name)) : []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      setExistingLogos(snap.val() || {});
    });
    return () => unsub();
  }, []);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
    setStatus("");
  }

  async function handleUpload() {
    if (!selectedTeam) { setStatus("Please select a team first."); return; }
    if (!file) { setStatus("Please choose an image first."); return; }
    setUploading(true);
    setStatus("");
    try {
      const url = await uploadToImgBB(file);
      // Save to Firebase team_icons collection
      await set(ref(db, `${PATHS.teamIcons}/${selectedTeam}`), url);
      // Update in-memory + localStorage cache
      updateTeamIcon(selectedTeam, url);
      setStatus("✅ Logo saved for " + selectedTeam);
      setFile(null);
      setPreview("");
      setSelectedTeam(null);
    } catch (e) {
      setStatus("❌ Upload failed: " + e.message);
    }
    setUploading(false);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 6, letterSpacing: "2px" }}>🖼️ Team Logos</h3>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", marginBottom: 20 }}>Select a team, upload a transparent PNG logo, then save.</p>

      {/* Team list */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>Pick a Team</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "28vh", overflowY: "auto", paddingRight: 4 }}>
          {teams.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem", padding: "16px 0" }}>No teams in the table yet.</div>
          )}
          {teams.map(team => {
            const isSelected = selectedTeam === team.name;
            const hasLogo = !!existingLogos[team.name];
            return (
              <div
                key={team.id}
                onClick={() => { setSelectedTeam(team.name); setFile(null); setPreview(""); setStatus(""); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                  background: isSelected ? "rgba(255,20,147,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isSelected ? "#FF1493" : "rgba(255,20,147,0.2)"}`,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {hasLogo
                    ? <img src={existingLogos[team.name]} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: 4, background: "rgba(255,20,147,0.1)", border: "1px dashed rgba(255,20,147,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>?</div>
                  }
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>{team.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {hasLogo && <span style={{ color: "#4ade80", fontSize: "0.75rem", fontWeight: 700 }}>✓ Has logo</span>}
                  {isSelected && <span style={{ color: "#FF1493", fontSize: "0.75rem", fontWeight: 700 }}>Selected</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload area */}
      {selectedTeam && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontWeight: 700 }}>
            Upload Logo for <span style={{ color: "#FF1493" }}>{selectedTeam}</span>
          </div>
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px", border: "2px dashed rgba(255,20,147,0.35)", borderRadius: 14, cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", textAlign: "center", transition: "border-color 0.2s" }}>
            {preview
              ? <img src={preview} alt="preview" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }} />
              : <span style={{ fontSize: "2.5rem" }}>🖼️</span>
            }
            {preview ? <span style={{ color: "rgba(255,255,255,0.6)" }}>Click to change image</span> : <span>Click to upload transparent PNG</span>}
            <input type="file" accept="image/png,image/webp,image/svg+xml,image/*" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
        </div>
      )}

      {status && (
        <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 14, fontSize: "0.88rem", background: status.startsWith("✅") ? "rgba(74,222,128,0.1)" : "rgba(255,0,0,0.1)", color: status.startsWith("✅") ? "#4ade80" : "#ff6b6b", border: `1px solid ${status.startsWith("✅") ? "rgba(74,222,128,0.3)" : "rgba(255,0,0,0.3)"}` }}>
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedTeam || !file}
          style={{ flex: 1, padding: "14px", background: uploading || !selectedTeam || !file ? "rgba(255,20,147,0.3)" : "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: uploading || !selectedTeam || !file ? "not-allowed" : "pointer", transition: "all 0.2s" }}
        >
          {uploading ? "Uploading..." : "Save Logo"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ─── League Phase Tab ─────────────────────────────────────────────────────────
function LeaguePhaseTab({ teamIconsCache }) {
  const { isAdmin } = useAdmin();
  const [table, setTable] = useState([]);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, TABLE_PATH), snap => {
      const d = snap.val();
      setTable(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, []);

  const sorted = [...table].sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.gd || 0) - (a.gd || 0) || (b.gf || 0) - (a.gf || 0));

  async function handleDelete(team) {
    if (!window.confirm(`Delete ${team.name} from the table?`)) return;
    await remove(ref(db, `${TABLE_PATH}/${team.id}`));
  }

  const thStyle = {
    padding: "18px 16px", color: "rgba(255,255,255,0.8)", fontSize: "2.2rem", fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "1px", background: "rgba(255,20,147,0.2)",
    borderBottom: "2px solid #FF1493", whiteSpace: "nowrap", textAlign: "center",
  };
  const tdStyle = {
    padding: "18px 16px", textAlign: "center", fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "3.6rem", color: "#fff", whiteSpace: "nowrap",
  };

  return (
    <div style={{ borderRadius: 20, overflow: "hidden", ...GLASS }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 24px", background: "rgba(255,20,147,0.15)", borderBottom: "2px solid #FF1493" }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "3px", color: "#fff", textAlign: "center" }}>
          🏆 Tokyo Pre Season
        </span>
      </div>

      {!sorted.length ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px" }}>No Table Data Yet</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: "sticky", left: 0, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 70 }}>Pos</th>
                <th style={{ ...thStyle, textAlign: "left", position: "sticky", left: 70, zIndex: 20, background: "rgba(255,20,147,0.2)", minWidth: 240, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>Club</th>
                {["P","W","D","L","GF","GA","GD","Pts"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                {isAdmin && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((team, idx) => {
                const pos = idx + 1;
                const barColor = posBarColor(pos);
                const gd = team.gd || 0;
                return (
                  <tr key={team.id} style={{ borderBottom: "1px solid rgba(255,20,147,0.1)", transition: "background 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,20,147,0.08)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Pos */}
                    <td style={{ padding: "18px 16px", textAlign: "center", position: "sticky", left: 0, background: "rgba(0,0,30,0.95)", zIndex: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                        <span style={{ width: 6, height: 32, borderRadius: 3, background: barColor, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff" }}>{pos}</span>
                      </div>
                    </td>
                    {/* Club */}
                    <td style={{ padding: "18px 20px", position: "sticky", left: 70, background: "rgba(0,0,30,0.95)", zIndex: 10, boxShadow: "4px 0 12px rgba(0,0,0,0.5)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {getTeamIcon(teamIconsCache, team.name, 44)}
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "3.6rem", color: "#fff", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{team.name}</span>
                      </div>
                    </td>
                    {[team.p||0, team.w||0, team.d||0, team.l||0, team.gf||0, team.ga||0, (gd > 0 ? `+${gd}` : gd)].map((v, ci) => (
                      <td key={ci} style={tdStyle}>{v}</td>
                    ))}
                    <td style={{ ...tdStyle, fontSize: "3.6rem", color: "#FF1493", fontWeight: 900 }}>{team.pts || 0}</td>
                    {isAdmin && (
                      <td style={{ padding: "18px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditTeam(team)} style={{ background: "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>✏️</button>
                          <button onClick={() => handleDelete(team)} style={{ background: "rgba(255,0,0,0.2)", border: "1px solid rgba(255,0,0,0.4)", color: "#ff6b6b", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}>🗑️</button>
                        </div>
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
      <div style={{ padding: "14px 24px", background: "rgba(255,20,147,0.08)", display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", borderTop: "1px solid rgba(255,20,147,0.2)" }}>
        {[
          { color: "#4169E1", label: "Round of 16 (Top 8)" },
          { color: "#FFB800", label: "Play-offs (9th–24th)" },
          { color: "#ef4444", label: "Eliminated (25th+)" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
            <span style={{ width: 6, height: 22, borderRadius: 3, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Add / Edit Team Modals */}
      <Modal active={addTeamOpen} onClose={() => setAddTeamOpen(false)}>
        <TokyoAddTeamModal onClose={() => setAddTeamOpen(false)} />
      </Modal>
      <Modal active={!!editTeam} onClose={() => setEditTeam(null)}>
        <TokyoAddTeamModal team={editTeam} onClose={() => setEditTeam(null)} />
      </Modal>
    </div>
  );
}

// ─── Fixtures Tab ─────────────────────────────────────────────────────────────
function FixturesTab({ teamIconsCache }) {
  const [allFixtures, setAllFixtures] = useState([]);
  const [teamFilter, setTeamFilter] = useState("all");

  useEffect(() => {
    const unsub = onValue(ref(db, FIXTURES_ROOT), snap => {
      const data = snap.val() || {};
      const fixtures = [];
      for (const [dateStr, dateData] of Object.entries(data)) {
        if (!dateData?.tournaments) continue;
        for (const tourn of Object.values(dateData.tournaments)) {
          if (!tourn?.name) continue;
          const normalized = tourn.name.trim().toLowerCase().replace(/\s+/g, " ");
          if (normalized !== FIXTURES_TOURNAMENT) continue;
          for (const fix of Object.values(tourn.fixtures || {})) {
            if (fix?.home && fix?.away) {
              fixtures.push({ date: dateStr, home: fix.home, away: fix.away, tournament: tourn.name });
            }
          }
        }
      }
      fixtures.sort((a, b) => a.date.localeCompare(b.date));
      setAllFixtures(fixtures);
    });
    return () => unsub();
  }, []);

  const allTeams = [...new Set(allFixtures.flatMap(f => [f.home, f.away]))].sort();
  const filtered = teamFilter === "all" ? allFixtures : allFixtures.filter(f => f.home === teamFilter || f.away === teamFilter);

  const grouped = {};
  for (const fix of filtered) {
    if (!grouped[fix.date]) grouped[fix.date] = [];
    grouped[fix.date].push(fix);
  }

  if (!allFixtures.length) return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>📅</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px" }}>No Fixtures Found</div>
      <div style={{ fontSize: "0.9rem", marginTop: 8 }}>Add "TOKYO PRE SEASON" fixtures in the Calendar page.</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 320, cursor: "pointer" }}>
          <option value="all">All Teams</option>
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>No fixtures for selected team.</div>
      ) : Object.entries(grouped).map(([dateStr, fixes]) => {
        const d = new Date(dateStr);
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const label = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

        return (
          <div key={dateStr} style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-block", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 30, padding: "6px 20px", marginBottom: 14, color: "#FF1493", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px" }}>
              📅 {label}
            </div>
            {fixes.map((fix, fi) => (
              <div key={fi} style={{ ...GLASS, borderRadius: 16, padding: "20px 28px", marginBottom: 12 }}>
                <div style={{ textAlign: "center", marginBottom: 14, color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                  🏆 {fix.tournament}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    {getTeamIcon(teamIconsCache, fix.home)}
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textAlign: "center" }}>{fix.home}</span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "4px" }}>VS</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    {getTeamIcon(teamIconsCache, fix.away)}
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textAlign: "center" }}>{fix.away}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Results Tab ──────────────────────────────────────────────────────────────
function ResultsTab({ teamIconsCache, manager, isAdmin, activeSubTab }) {
  const [subTab, setSubTab] = useState(activeSubTab || "leaguePhase");
  const [results, setResults] = useState({});
  const [bracketImage, setBracketImage] = useState({ knockouts: "", playoffs: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [table, setTable] = useState([]);
  const [teamFilter, setTeamFilter] = useState("all");

  useEffect(() => { setSubTab(activeSubTab || "leaguePhase"); }, [activeSubTab]);

  useEffect(() => {
    const paths = ["leaguePhase", "knockouts", "playoffs"];
    const unsubs = paths.map(p => onValue(ref(db, `${RESULTS_PATH}/${p}`), snap => {
      const d = snap.val();
      setResults(prev => ({ ...prev, [p]: d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : [] }));
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, TABLE_PATH), snap => {
      const d = snap.val();
      setTable(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    onValue(ref(db, `${SETTINGS_PATH}/bracketImage`), snap => {
      const d = snap.val() || {};
      setBracketImage({ knockouts: d.knockouts || "", playoffs: d.playoffs || "" });
    });
  }, []);

  const currentResults = results[subTab] || [];
  const allTeams = [...new Set([...table.map(t => t.name), ...currentResults.flatMap(r => [r.homeTeam, r.awayTeam])].filter(Boolean))].sort();
  const filtered = teamFilter === "all" ? currentResults : currentResults.filter(r => r.homeTeam === teamFilter || r.awayTeam === teamFilter);
  const sorted = [...filtered].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {RESULT_SUB_TABS.map(st => (
          <button key={st.id} onClick={() => { setSubTab(st.id); setTeamFilter("all"); }} style={{
            padding: "10px 22px", borderRadius: 30, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 700, fontSize: "0.85rem",
            background: subTab === st.id ? "#FF1493" : "rgba(255,20,147,0.08)",
            border: `1px solid ${subTab === st.id ? "#FF1493" : "rgba(255,20,147,0.3)"}`,
            color: "#fff", transition: "all 0.2s",
          }}>{st.label}</button>
        ))}
      </div>

      {(subTab === "knockouts" || subTab === "playoffs") && bracketImage[subTab] && (
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          <img src={bracketImage[subTab]} alt="Bracket" style={{ width: "100%", display: "block" }} />
        </div>
      )}

      {(manager || isAdmin) && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setAddOpen(true)} style={{ padding: "12px 28px", background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>
            ⚽ Add Result
          </button>
        </div>
      )}

      {allTeams.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 280, cursor: "pointer" }}>
            <option value="all">All Teams</option>
            {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📋</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", letterSpacing: "3px" }}>No Results Yet</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sorted.map(r => <ResultCard key={r.id} result={r} teamIconsCache={teamIconsCache} />)}
        </div>
      )}

      <Modal active={addOpen} onClose={() => setAddOpen(false)} wide>
        <AddResultForm
          teams={table.map(t => t.name).sort()}
          managerTeam={manager?.team || null}
          activeSubTab={subTab}
          onClose={() => setAddOpen(false)}
          tableData={table}
          isAdmin={isAdmin}
        />
      </Modal>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result: r, teamIconsCache }) {
  const [imgOpen, setImgOpen] = useState(false);
  return (
    <div style={{ ...GLASS, borderRadius: 18, padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
          {getTeamIcon(teamIconsCache, r.homeTeam)}
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textAlign: "center" }}>{r.homeTeam}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2.8rem", color: "#fff", letterSpacing: "6px", background: "rgba(0,0,0,0.3)", padding: "10px 28px", borderRadius: 60, border: "2px solid rgba(255,20,147,0.3)" }}>
            {r.homeScore} — {r.awayScore}
          </div>
          {r.date && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{r.date}</span>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 100 }}>
          {getTeamIcon(teamIconsCache, r.awayTeam)}
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", textAlign: "center" }}>{r.awayTeam}</span>
        </div>
      </div>
      {r.images?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {r.images.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setImgOpen(true)} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,20,147,0.3)", cursor: "pointer" }} />
          ))}
        </div>
      )}
      {r.submittedByName && (
        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>Submitted by {r.submittedByName}</div>
      )}
    </div>
  );
}

// ─── Add Result Form ──────────────────────────────────────────────────────────
function AddResultForm({ teams, managerTeam, activeSubTab, onClose, tableData, isAdmin }) {
  const [homeTeam, setHomeTeam] = useState(managerTeam || "");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { manager } = useAdmin();

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  }

  function removeImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setError("");
    if (!homeTeam || !awayTeam) { setError("Select both teams."); return; }
    if (homeTeam === awayTeam) { setError("Teams cannot be the same."); return; }
    if (homeScore === "" || awayScore === "") { setError("Enter the score."); return; }
    if (images.length === 0) { setError("You must upload at least 1 image as proof."); return; }
    if (!confirmed) { setError("Please confirm the disclaimer."); return; }
    setSaving(true);
    try {
      const imageUrls = await Promise.all(images.map(f => uploadToImgBB(f)));
      const hs = parseInt(homeScore) || 0;
      const as2 = parseInt(awayScore) || 0;
      const resultData = {
        homeTeam, awayTeam, homeScore: hs, awayScore: as2, date, images: imageUrls,
        submittedAt: Date.now(), submittedByUid: manager?.uid || "admin",
        submittedByName: manager?.username || "Admin", subTab: activeSubTab,
      };
      await push(ref(db, `${RESULTS_PATH}/${activeSubTab}`), resultData);
      if (activeSubTab === "leaguePhase") {
        await applyResultToTable(homeTeam, awayTeam, hs, as2, tableData);
      }
      onClose();
    } catch (e) { setError("Failed: " + e.message); }
    setSaving(false);
  }

  const labelStyle = { color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: 8, letterSpacing: "3px" }}>⚽ ADD RESULT</h3>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 24 }}>Active tab: <span style={{ color: "#FF1493", fontWeight: 700 }}>{activeSubTab}</span></div>

      <div style={{ background: "rgba(255,170,0,0.08)", border: "2px solid rgba(255,170,0,0.4)", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ color: "#ffaa00", fontWeight: 800, fontSize: "0.85rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>⚠️ Disclaimer</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Be sure your result is correct. <strong style={{ color: "#FF1493" }}>False results will result in a 6 point deduction</strong> and immediate removal from the league. You must upload a screenshot as proof.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#FF1493" }} />
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>I confirm this result is correct</span>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Home Team</label>
          {managerTeam && !isAdmin ? (
            <div style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed", display: "flex", alignItems: "center" }}>{managerTeam}</div>
          ) : (
            <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        <div>
          <label style={labelStyle}>Away Team</label>
          <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Select team</option>
            {teams.filter(t => t !== homeTeam).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Home Score</label>
          <input type="number" min="0" value={homeScore} onChange={e => setHomeScore(e.target.value)} placeholder="0" style={{ ...inputStyle, textAlign: "center", fontSize: "1.6rem", fontFamily: "'Bebas Neue', sans-serif" }} />
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", marginTop: 22 }}>—</div>
        <div>
          <label style={labelStyle}>Away Score</label>
          <input type="number" min="0" value={awayScore} onChange={e => setAwayScore(e.target.value)} placeholder="0" style={{ ...inputStyle, textAlign: "center", fontSize: "1.6rem", fontFamily: "'Bebas Neue', sans-serif" }} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Match Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Match Screenshots <span style={{ color: "#FF1493" }}>* Required</span></label>
        <label style={{ display: "block", padding: "20px", border: "2px dashed rgba(255,20,147,0.35)", borderRadius: 12, textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
          📸 Click to upload images
          <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
        </label>
        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ width: 100, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,20,147,0.3)" }} />
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, background: "#ff4444", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ color: "#ff6b6b", fontSize: "0.9rem", marginBottom: 14, padding: "12px 16px", background: "rgba(255,0,0,0.1)", borderRadius: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "16px", background: saving ? "rgba(255,20,147,0.4)" : "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Submitting..." : "Submit Result"}
        </button>
        <button onClick={onClose} style={{ flex: 1, padding: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Apply result to league table ─────────────────────────────────────────────
async function applyResultToTable(homeTeam, awayTeam, hs, as2, tableData) {
  function find(name) { return tableData.find(t => t.name === name); }

  async function upsert(entry, teamName, gf, ga, won, drew, lost) {
    const base = entry || { name: teamName, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    const updated = {
      ...base,
      p:   (base.p  || 0) + 1,
      w:   (base.w  || 0) + (won  ? 1 : 0),
      d:   (base.d  || 0) + (drew ? 1 : 0),
      l:   (base.l  || 0) + (lost ? 1 : 0),
      gf:  (base.gf || 0) + gf,
      ga:  (base.ga || 0) + ga,
      gd:  (base.gd || 0) + (gf - ga),
      pts: (base.pts || 0) + (won ? 3 : drew ? 1 : 0),
    };
    if (entry?.id) await update(ref(db, `${TABLE_PATH}/${entry.id}`), updated);
    else await push(ref(db, TABLE_PATH), updated);
  }

  const homeWon = hs > as2, awayWon = as2 > hs, drew = hs === as2;
  await upsert(find(homeTeam), homeTeam, hs, as2, homeWon, drew, awayWon);
  await upsert(find(awayTeam), awayTeam, as2, hs, awayWon, drew, homeWon);
}

// ─── Revoke result from league table ─────────────────────────────────────────
async function revokeResultFromTable(result, tableData) {
  const { homeTeam, awayTeam, homeScore: hs, awayScore: as2 } = result;
  function find(name) { return tableData.find(t => t.name === name); }

  async function revert(entry, gf, ga, won, drew, lost) {
    if (!entry?.id) return;
    const updated = {
      ...entry,
      p:   Math.max(0, (entry.p  || 0) - 1),
      w:   Math.max(0, (entry.w  || 0) - (won  ? 1 : 0)),
      d:   Math.max(0, (entry.d  || 0) - (drew ? 1 : 0)),
      l:   Math.max(0, (entry.l  || 0) - (lost ? 1 : 0)),
      gf:  Math.max(0, (entry.gf || 0) - gf),
      ga:  Math.max(0, (entry.ga || 0) - ga),
      gd:  (entry.gd || 0) - (gf - ga),
      pts: Math.max(0, (entry.pts || 0) - (won ? 3 : drew ? 1 : 0)),
    };
    await update(ref(db, `${TABLE_PATH}/${entry.id}`), updated);
  }

  const homeWon = hs > as2, awayWon = as2 > hs, drew = hs === as2;
  await revert(find(homeTeam), hs, as2, homeWon, drew, awayWon);
  await revert(find(awayTeam), as2, hs, awayWon, drew, homeWon);
}

// ─── Admin Results History Modal ──────────────────────────────────────────────
function ResultsHistoryModal({ onClose, teamIconsCache }) {
  const [allResults, setAllResults] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [revoking, setRevoking] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const paths = ["leaguePhase", "knockouts", "playoffs"];
    const unsubs = paths.map(p => onValue(ref(db, `${RESULTS_PATH}/${p}`), snap => {
      const d = snap.val();
      const arr = d ? Object.entries(d).map(([k, v]) => ({ id: k, subTab: p, ...v })) : [];
      setAllResults(prev => {
        const filtered = prev.filter(r => r.subTab !== p);
        return [...filtered, ...arr].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      });
    }));
    const tUnsub = onValue(ref(db, TABLE_PATH), snap => {
      const d = snap.val();
      setTableData(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => { unsubs.forEach(u => u()); tUnsub(); };
  }, []);

  async function handleRevoke(r) {
    if (!window.confirm(`Revoke ${r.homeTeam} ${r.homeScore}–${r.awayScore} ${r.awayTeam}?`)) return;
    setRevoking(r.id);
    try {
      await remove(ref(db, `${RESULTS_PATH}/${r.subTab}/${r.id}`));
      if (r.subTab === "leaguePhase") await revokeResultFromTable(r, tableData);
    } catch (e) { alert("Revoke failed: " + e.message); }
    setRevoking(null);
  }

  const allTeams = [...new Set(allResults.flatMap(r => [r.homeTeam, r.awayTeam]).filter(Boolean))].sort();
  const filtered = filter === "all" ? allResults : allResults.filter(r => r.homeTeam === filter || r.awayTeam === filter);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", marginBottom: 20, letterSpacing: "3px" }}>📜 RESULTS HISTORY</h3>
      <div style={{ marginBottom: 20 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 280, cursor: "pointer" }}>
          <option value="all">All Teams</option>
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.3)" }}>No results found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...GLASS, borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
                  {r.homeTeam} <span style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.4rem" }}>{r.homeScore}–{r.awayScore}</span> {r.awayTeam}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 4 }}>
                  {r.subTab} · {r.date || "—"} · by {r.submittedByName || "—"}
                </div>
                {r.images?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {r.images.map((url, i) => (
                      <img key={i} src={url} alt="" style={{ width: 60, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,20,147,0.3)" }} />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => handleRevoke(r)} disabled={revoking === r.id} style={{ padding: "10px 20px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", color: "#ff6b6b", borderRadius: 10, cursor: revoking === r.id ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {revoking === r.id ? "Revoking..." : "🔄 Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Close</button>
    </div>
  );
}

// ─── Slideshow Manager ────────────────────────────────────────────────────────
function SlideshowManager({ onClose }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, SLIDESHOW_PATH), snap => { setImages(snap.val() || []); });
    return () => unsub();
  }, []);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToImgBB(f)));
      await set(ref(db, SLIDESHOW_PATH), [...images, ...urls]);
    } catch (err) { alert("Upload failed: " + err.message); }
    setUploading(false);
  }

  async function removeSlide(i) {
    await set(ref(db, SLIDESHOW_PATH), images.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16, letterSpacing: "2px" }}>🎞️ Manage Slideshow</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img src={url} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,20,147,0.3)" }} />
            <button onClick={() => removeSlide(i)} style={{ position: "absolute", top: -6, right: -6, background: "#ff4444", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
          </div>
        ))}
      </div>
      <label style={{ display: "block", padding: "16px", border: "2px dashed rgba(255,20,147,0.35)", borderRadius: 12, textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", marginBottom: 16 }}>
        {uploading ? "Uploading..." : "📸 Upload Slide Images"}
        <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
      </label>
      <button onClick={onClose} style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}

// ─── Bracket Image Manager ────────────────────────────────────────────────────
function BracketImageManager({ onClose }) {
  const [koUrl, setKoUrl] = useState("");
  const [poUrl, setPoUrl] = useState("");
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, `${SETTINGS_PATH}/bracketImage`), snap => {
      const d = snap.val() || {};
      setKoUrl(d.knockouts || ""); setPoUrl(d.playoffs || "");
    });
    return () => unsub();
  }, []);

  async function handleUpload(type, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(type);
    try {
      const url = await uploadToImgBB(file);
      await set(ref(db, `${SETTINGS_PATH}/bracketImage/${type}`), url);
    } catch (err) { alert("Upload failed: " + err.message); }
    setUploading(null);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20, letterSpacing: "2px" }}>🏆 Bracket Images</h3>
      {[{ key: "knockouts", label: "Knockouts Bracket", url: koUrl }, { key: "playoffs", label: "Play-offs Bracket", url: poUrl }].map(({ key, label, url }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: 8, fontWeight: 700 }}>{label}</div>
          {url && <img src={url} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 8, border: "1px solid rgba(255,20,147,0.3)" }} />}
          <label style={{ display: "block", padding: "12px", border: "2px dashed rgba(255,20,147,0.35)", borderRadius: 10, textAlign: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
            {uploading === key ? "Uploading..." : "📤 Upload " + label}
            <input type="file" accept="image/*" onChange={e => handleUpload(key, e)} style={{ display: "none" }} disabled={!!uploading} />
          </label>
        </div>
      ))}
      <button onClick={onClose} style={{ width: "100%", padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}

// ─── Set Active Sub-Tab Modal ─────────────────────────────────────────────────
function SetActiveSubTabModal({ current, onClose }) {
  const [active, setActive] = useState(current || "leaguePhase");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await set(ref(db, `${SETTINGS_PATH}/activeResultsSubTab`), active);
    setSaving(false);
    onClose();
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16, letterSpacing: "2px" }}>🎯 Set Active Results Tab</h3>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", marginBottom: 20 }}>Manager submissions will go to the active tab. Only League Phase results update the standings.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {RESULT_SUB_TABS.map(st => (
          <button key={st.id} onClick={() => setActive(st.id)} style={{ padding: "16px 20px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: "1rem", background: active === st.id ? "#FF1493" : "rgba(255,20,147,0.08)", border: `1px solid ${active === st.id ? "#FF1493" : "rgba(255,20,147,0.3)"}`, color: "#fff", textAlign: "left" }}>
            {st.label} {active === st.id ? "✓ Active" : ""}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Edit Table Modal ─────────────────────────────────────────────────────────
function EditTableModal({ onClose }) {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, TABLE_PATH), snap => {
      const d = snap.val();
      setTeams(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, []);

  function selectTeam(team) {
    setSelected(team);
    setForm({ p: team.p||0, w: team.w||0, d: team.d||0, l: team.l||0, gf: team.gf||0, ga: team.ga||0, gd: team.gd||0, pts: team.pts||0 });
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    await update(ref(db, `${TABLE_PATH}/${selected.id}`), { ...form, p: +form.p, w: +form.w, d: +form.d, l: +form.l, gf: +form.gf, ga: +form.ga, gd: +form.gd, pts: +form.pts });
    setSaving(false);
    setSelected(null);
  }

  async function handleAddTeam() {
    if (!addName.trim()) return;
    setAdding(true);
    await push(ref(db, TABLE_PATH), { name: addName.trim(), p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 });
    setAddName("");
    setAdding(false);
  }

  async function handleDelete(team) {
    if (!window.confirm(`Delete ${team.name}?`)) return;
    await remove(ref(db, `${TABLE_PATH}/${team.id}`));
  }

  const fieldLabel = { color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", display: "block", marginBottom: 4 };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 16, letterSpacing: "2px" }}>📋 EDIT LEAGUE TABLE</h3>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="New team name" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        <button onClick={handleAddTeam} disabled={adding} style={{ padding: "14px 20px", background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{adding ? "Adding..." : "+ Add"}</button>
      </div>
      {selected ? (
        <div>
          <div style={{ color: "#FF1493", fontWeight: 700, fontSize: "1rem", marginBottom: 14 }}>Editing: {selected.name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {["p","w","d","l","gf","ga","gd","pts"].map(k => (
              <div key={k}>
                <label style={fieldLabel}>{k.toUpperCase()}</label>
                <input type="number" value={form[k] || 0} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ ...inputStyle, marginBottom: 0 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px", background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setSelected(null)} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ maxHeight: "50vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {teams.sort((a,b) => (b.pts||0)-(a.pts||0)).map(team => (
            <div key={team.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", ...GLASS, borderRadius: 10 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>{team.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => selectTeam(team)} style={{ padding: "8px 16px", background: "rgba(255,20,147,0.15)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}>Edit</button>
                <button onClick={() => handleDelete(team)} style={{ padding: "8px 16px", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.3)", borderRadius: 8, color: "#ff6b6b", cursor: "pointer", fontSize: "0.85rem" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: "14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TokyoPage() {
  const { isAdmin, teamIconsCache, updateTeamIcon, manager } = useAdmin();
  const [tab, setTab] = useState("leaguePhase");
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState("leaguePhase");

  // Admin modals
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [bracketOpen,   setBracketOpen]   = useState(false);
  const [activeTabOpen, setActiveTabOpen] = useState(false);
  const [tableEditOpen, setTableEditOpen] = useState(false);
  const [addTeamOpen,   setAddTeamOpen]   = useState(false);
  const [teamLogoOpen,  setTeamLogoOpen]  = useState(false);

  // Load slideshow images
  useEffect(() => {
    const unsub = onValue(ref(db, SLIDESHOW_PATH), snap => { setSlideshowImages(snap.val() || []); });
    return () => unsub();
  }, []);

  // Load active results sub-tab
  useEffect(() => {
    const unsub = onValue(ref(db, `${SETTINGS_PATH}/activeResultsSubTab`), snap => {
      if (snap.val()) setActiveSubTab(snap.val());
    });
    return () => unsub();
  }, []);

  // Sync team logos from Firebase into cache on page load
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.teamIcons), snap => {
      const logos = snap.val() || {};
      Object.entries(logos).forEach(([teamName, url]) => {
        updateTeamIcon(teamName, url);
      });
    });
    return () => unsub();
  }, []);

  const tokyoAdminMenuItems = [
    { icon: "➕", label: "Add Team",       action: () => setAddTeamOpen(true) },
    { icon: "🖼️", label: "Add Team Logo",  action: () => setTeamLogoOpen(true) },
    { icon: "📜", label: "Results History", action: () => setHistoryOpen(true) },
    { icon: "🎞️", label: "Manage Slideshow", action: () => setSlideshowOpen(true) },
    { icon: "🏆", label: "Bracket Images",  action: () => setBracketOpen(true) },
    { icon: "🎯", label: "Set Active Results Tab", action: () => setActiveTabOpen(true) },
    { icon: "📋", label: "Edit League Table", action: () => setTableEditOpen(true) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <BackgroundVideo />
      <Navbar tokyoMenuItems={isAdmin ? tokyoAdminMenuItems : undefined} />

      <div style={{ padding: "28px 24px 80px", maxWidth: "100%" }}>
        <Slideshow images={slideshowImages} />
        <TabBar tabs={MAIN_TABS} activeTab={tab} onTabChange={setTab} />

        {tab === "leaguePhase" && <LeaguePhaseTab teamIconsCache={teamIconsCache} />}
        {tab === "fixtures"    && <FixturesTab    teamIconsCache={teamIconsCache} />}
        {tab === "results"     && <ResultsTab     teamIconsCache={teamIconsCache} manager={manager} isAdmin={isAdmin} activeSubTab={activeSubTab} />}
      </div>

      {/* Admin Modals */}
      <Modal active={addTeamOpen}   onClose={() => setAddTeamOpen(false)}>
        <TokyoAddTeamModal onClose={() => setAddTeamOpen(false)} />
      </Modal>
      <Modal active={teamLogoOpen}  onClose={() => setTeamLogoOpen(false)}>
        <TeamLogoModal onClose={() => setTeamLogoOpen(false)} />
      </Modal>
      <Modal active={historyOpen}   onClose={() => setHistoryOpen(false)}   wide><ResultsHistoryModal  onClose={() => setHistoryOpen(false)}   teamIconsCache={teamIconsCache} /></Modal>
      <Modal active={slideshowOpen} onClose={() => setSlideshowOpen(false)} wide><SlideshowManager     onClose={() => setSlideshowOpen(false)} /></Modal>
      <Modal active={bracketOpen}   onClose={() => setBracketOpen(false)}   wide><BracketImageManager  onClose={() => setBracketOpen(false)} /></Modal>
      <Modal active={activeTabOpen} onClose={() => setActiveTabOpen(false)} wide><SetActiveSubTabModal current={activeSubTab} onClose={() => setActiveTabOpen(false)} /></Modal>
      <Modal active={tableEditOpen} onClose={() => setTableEditOpen(false)} wide><EditTableModal       onClose={() => setTableEditOpen(false)} /></Modal>

      <style>{`
        select option { background: #000033; color: #fff; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>
    </div>
  );
}
