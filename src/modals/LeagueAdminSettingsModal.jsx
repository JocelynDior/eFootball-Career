import { useState, useEffect } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, set, push, remove } from "firebase/database";
import Modal from "../components/Modal";
import ManagerKeysModal from "./ManagerKeysModal";
import ManagerHistoryModal from "./ManagerHistoryModal";
import RequestsHistoryModal from "./RequestsHistoryModal";
import { uploadToImgBB } from "../utils/imgUpload";

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,20,147,0.4)",
  borderRadius: 10, color: "#fff",
  fontFamily: "inherit", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box", marginBottom: 10,
};
const labelStyle = {
  color: "rgba(255,255,255,0.6)", fontSize: "0.75rem",
  display: "block", marginBottom: 4,
  textTransform: "uppercase", letterSpacing: "0.5px",
};
const btnStyle = {
  width: "100%", padding: "16px 20px",
  background: "rgba(255,20,147,0.08)",
  border: "1px solid rgba(255,20,147,0.25)",
  borderRadius: 14, color: "#fff", cursor: "pointer",
  fontWeight: 600, fontSize: "0.95rem", textAlign: "left",
  display: "flex", alignItems: "center", gap: 14,
  transition: "all 0.2s", marginBottom: 10, fontFamily: "inherit",
};

const DEFAULT_COLORS = ["#4169E1", "#FF6B00", "#ef4444", "#22c55e", "#FFB800", "#a855f7"];

// ─── Slideshow Manager ────────────────────────────────────────────────────────
function SlideshowManager({ league, onBack }) {
  const [slides, setSlides] = useState([]); // [{ id, imageUrl, caption }]
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const basePath = `career_${league}_settings/headlines`;

  useEffect(() => {
    const unsub = onValue(ref(db, basePath), snap => {
      const d = snap.val();
      setSlides(d ? Object.entries(d).map(([k, v]) => ({ id: k, ...v })) : []);
    });
    return () => unsub();
  }, [basePath]);

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
    if (!file) { setStatus("Please select an image."); return; }
    setUploading(true);
    setStatus("Uploading...");
    try {
      const url = await uploadToImgBB(file);
      await push(ref(db, basePath), { imageUrl: url, caption: caption.trim() });
      setStatus("✅ Slide added!");
      setFile(null);
      setPreview("");
      setCaption("");
    } catch (e) {
      setStatus("❌ Failed: " + e.message);
    }
    setUploading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this slide?")) return;
    await remove(ref(db, `${basePath}/${id}`));
  }

  async function handleUpdateCaption(id, newCaption) {
    await set(ref(db, `${basePath}/${id}/caption`), newCaption);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>
        🎞️ Manage Slideshow
      </h3>

      {/* Current slides */}
      {slides.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
            Current Slides ({slides.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {slides.map(slide => (
              <div key={slide.id} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 12, overflow: "hidden" }}>
                {/* Image preview */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "16/5", overflow: "hidden" }}>
                  <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    onClick={() => handleDelete(slide.id)}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(200,0,0,0.85)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >✕</button>
                </div>
                {/* Caption edit */}
                <div style={{ padding: "10px 12px" }}>
                  <CaptionEditor
                    initial={slide.caption || ""}
                    onSave={val => handleUpdateCaption(slide.id, val)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new slide */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14 }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 12, fontSize: "0.9rem" }}>➕ Add New Slide</div>

        {/* Image picker */}
        <label style={{ display: "block", marginBottom: 10 }}>
          <div style={{ background: "rgba(255,20,147,0.1)", border: "2px dashed rgba(255,20,147,0.4)", borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer" }}>
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8 }} />
            ) : (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>📷 Tap to choose image</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        {/* Caption */}
        <label style={labelStyle}>Caption (optional)</label>
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="e.g. Matchday 5 Results"
          style={inputStyle}
        />

        {status && (
          <div style={{ color: status.startsWith("✅") ? "#22c55e" : status.startsWith("❌") ? "#ff6b6b" : "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 10 }}>
            {status}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{ width: "100%", padding: 12, background: uploading || !file ? "rgba(255,20,147,0.3)" : "#FF1493", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: uploading || !file ? "not-allowed" : "pointer", fontSize: "0.95rem" }}
        >
          {uploading ? "Uploading..." : "Upload Slide"}
        </button>
      </div>

      <button onClick={onBack} style={{ width: "100%", marginTop: 14, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>
        ← Back
      </button>
    </div>
  );
}

// Inline caption editor
function CaptionEditor({ initial, onSave }) {
  const [val, setVal] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function save() {
    await onSave(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={val}
        onChange={e => { setVal(e.target.value); setSaved(false); }}
        placeholder="Caption (optional)"
        style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: "0.82rem", padding: "7px 10px" }}
      />
      <button onClick={save} style={{ padding: "7px 14px", background: saved ? "#22c55e" : "rgba(255,20,147,0.2)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
        {saved ? "✅" : "Save"}
      </button>
    </div>
  );
}

// ─── Team Linker ──────────────────────────────────────────────────────────────
function TeamLinker({ league, teams, onBack }) {
  const [fixtureTeams, setFixtureTeams] = useState([]);
  const [links, setLinks] = useState({}); // { tableTeamName: fixturesTeamName }
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const basePath = `career_${league}_settings/teamLinks`;

  // Load current links
  useEffect(() => {
    const unsub = onValue(ref(db, basePath), snap => {
      setLinks(snap.val() || {});
    });
    return () => unsub();
  }, [basePath]);

  // Load all fixture team names for this league from calendar
  useEffect(() => {
    const leagueNameMap = {
      premier_league: "premier league",
      serie_a: "serie a",
      la_liga: "la liga",
    };
    const targetName = leagueNameMap[league] || league.replace(/_/g, " ");

    const unsub = onValue(ref(db, "career_calendarEvents"), snap => {
      const data = snap.val() || {};
      const names = new Set();
      for (const dateData of Object.values(data)) {
        for (const tourn of Object.values(dateData?.tournaments || {})) {
          if ((tourn?.name || "").toLowerCase().includes(targetName)) {
            for (const fix of Object.values(tourn?.fixtures || {})) {
              if (fix?.home) names.add(fix.home);
              if (fix?.away) names.add(fix.away);
            }
          }
        }
      }
      setFixtureTeams([...names].sort());
    });
    return () => unsub();
  }, [league]);

  function handleLink(tableTeam, fixturesTeam) {
    setLinks(prev => {
      const updated = { ...prev };
      if (!fixturesTeam) {
        delete updated[tableTeam];
      } else {
        updated[tableTeam] = fixturesTeam;
      }
      return updated;
    });
  }

  async function saveLinks() {
    setSaving(true);
    setStatus("");
    try {
      await set(ref(db, basePath), links);
      setStatus("✅ Links saved!");
    } catch (e) {
      setStatus("❌ Error: " + e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 8 }}>🔗 Team Linking</h3>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 20 }}>
        Link table team names to fixture team names so they share icons and display correctly across all pages.<br />
        e.g. "Man City" (table) → "Manchester City" (fixtures)
      </p>

      {teams && teams.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {teams.map(team => (
            <div key={team.key || team.name} style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>
                📋 {team.name}
              </div>
              <select
                value={links[team.name] || ""}
                onChange={e => handleLink(team.name, e.target.value)}
                style={{ ...inputStyle, marginBottom: 0 }}
              >
                <option value="">— No link (use same name) —</option>
                {fixtureTeams.map(ft => (
                  <option key={ft} value={ft}>{ft}</option>
                ))}
              </select>
              {links[team.name] && (
                <div style={{ color: "#22c55e", fontSize: "0.8rem", marginTop: 6 }}>
                  ✅ Linked to: {links[team.name]}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "30px 0", marginBottom: 20 }}>
          No teams in this league yet.
        </div>
      )}

      {status && (
        <div style={{ color: status.startsWith("✅") ? "#22c55e" : "#ff6b6b", fontSize: "0.85rem", marginBottom: 12, textAlign: "center" }}>{status}</div>
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

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function LeagueAdminSettingsModal({ league, season, teams, onClose }) {
  const [view, setView] = useState("main");

  // Zone config state
  const [zones, setZones] = useState([]);
  const [dashedLines, setDashedLines] = useState([]);
  const [savingZones, setSavingZones] = useState(false);

  // Table / Group Stage toggle
  const [tabMode, setTabMode] = useState("table");
  const [savingMode, setSavingMode] = useState(false);

  // New zone form
  const [newZoneFrom, setNewZoneFrom] = useState("");
  const [newZoneTo, setNewZoneTo] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("#4169E1");
  const [newZoneLabel, setNewZoneLabel] = useState("");

  // New dashed line form
  const [newDashAfter, setNewDashAfter] = useState("");
  const [newDashLabel, setNewDashLabel] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(db, `career_${league}_settings`), snap => {
      const d = snap.val() || {};
      setZones(d.zones?.colorZones || []);
      setDashedLines(d.zones?.dashedLines || []);
      setTabMode(d.tabMode || "table");
    });
    return () => unsub();
  }, [league]);

  async function saveTabMode(mode) {
    setSavingMode(true);
    await set(ref(db, `career_${league}_settings/tabMode`), mode);
    setTabMode(mode);
    setSavingMode(false);
  }

  function addZone() {
    if (!newZoneFrom || !newZoneTo || !newZoneLabel) return;
    setZones(prev => [...prev, { from: +newZoneFrom, to: +newZoneTo, color: newZoneColor, label: newZoneLabel }]);
    setNewZoneFrom(""); setNewZoneTo(""); setNewZoneLabel(""); setNewZoneColor("#4169E1");
  }

  function removeZone(i) { setZones(prev => prev.filter((_, idx) => idx !== i)); }

  function addDashedLine() {
    if (!newDashAfter || !newDashLabel) return;
    setDashedLines(prev => [...prev, { afterPosition: +newDashAfter, label: newDashLabel }]);
    setNewDashAfter(""); setNewDashLabel("");
  }

  function removeDashedLine(i) { setDashedLines(prev => prev.filter((_, idx) => idx !== i)); }

  async function saveZones() {
    setSavingZones(true);
    await set(ref(db, `career_${league}_settings/zones`), { colorZones: zones, dashedLines });
    setSavingZones(false);
    alert("Zone config saved!");
  }

  // Sub-views
  if (view === "slideshow") return <SlideshowManager league={league} onBack={() => setView("main")} />;
  if (view === "keys") return <Modal active onClose={() => setView("main")}><ManagerKeysModal onClose={() => setView("main")} /></Modal>;
  if (view === "history") return <Modal active onClose={() => setView("main")}><ManagerHistoryModal league={league} season={season} onClose={() => setView("main")} /></Modal>;
  if (view === "requests") return <Modal active onClose={() => setView("main")}><RequestsHistoryModal league={league} season={season} onClose={() => setView("main")} /></Modal>;

  if (view === "teamLinks") return <TeamLinker league={league} teams={teams} onBack={() => setView("main")} />;

  if (view === "zones") {
    return (
      <div>
        <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>🎨 Zone Config</h3>

        {/* Color Zones */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>Color Zones</div>
          {zones.map((z, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, background: z.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ color: "#fff", flex: 1, fontSize: "0.9rem" }}>Pos {z.from}–{z.to}: {z.label}</span>
              <button onClick={() => removeZone(i)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
            </div>
          ))}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><label style={labelStyle}>From Position</label><input type="number" value={newZoneFrom} onChange={e => setNewZoneFrom(e.target.value)} style={inputStyle} min={1} /></div>
              <div><label style={labelStyle}>To Position</label><input type="number" value={newZoneTo} onChange={e => setNewZoneTo(e.target.value)} style={inputStyle} min={1} /></div>
            </div>
            <label style={labelStyle}>Label (e.g. "Champions League")</label>
            <input value={newZoneLabel} onChange={e => setNewZoneLabel(e.target.value)} style={inputStyle} placeholder="Zone label" />
            <label style={labelStyle}>Color</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {DEFAULT_COLORS.map(c => (
                <button key={c} onClick={() => setNewZoneColor(c)} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: newZoneColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
              ))}
              <input type="color" value={newZoneColor} onChange={e => setNewZoneColor(e.target.value)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", background: "transparent" }} />
            </div>
            <button onClick={addZone} style={{ width: "100%", padding: 10, background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Add Zone</button>
          </div>
        </div>

        {/* Dashed Lines */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 10, fontSize: "0.95rem" }}>Dashed Lines</div>
          {dashedLines.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <span style={{ color: "#ef4444", fontSize: "0.85rem", flex: 1 }}>After pos {d.afterPosition}: {d.label}</span>
              <button onClick={() => removeDashedLine(i)} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "#ff6b6b", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
            </div>
          ))}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={labelStyle}>After Position</label><input type="number" value={newDashAfter} onChange={e => setNewDashAfter(e.target.value)} style={inputStyle} min={1} /></div>
              <div><label style={labelStyle}>Label</label><input value={newDashLabel} onChange={e => setNewDashLabel(e.target.value)} style={inputStyle} placeholder="e.g. Relegation line" /></div>
            </div>
            <button onClick={addDashedLine} style={{ width: "100%", padding: 10, background: "#FF1493", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Add Dashed Line</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveZones} disabled={savingZones} style={{ flex: 1, padding: 14, background: "#FF1493", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", opacity: savingZones ? 0.7 : 1 }}>{savingZones ? "Saving..." : "💾 Save Zone Config"}</button>
          <button onClick={() => setView("main")} style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ color: "#FF1493", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.8rem", marginBottom: 20 }}>⚙️ League Admin Settings</h3>

      {/* Tab Mode Toggle */}
      <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>First Tab Mode</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => saveTabMode("table")} style={{ flex: 1, padding: "12px 0", background: tabMode === "table" ? "#FF1493" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
            🏆 League Table
          </button>
          <button onClick={() => saveTabMode("groupStage")} style={{ flex: 1, padding: "12px 0", background: tabMode === "groupStage" ? "#FF1493" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
            🗂️ Group Stage
          </button>
        </div>
        {savingMode && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: 6, textAlign: "center" }}>Saving...</div>}
      </div>

      {teams && teams.length > 0 && (
        <div style={{ background: "rgba(255,20,147,0.06)", border: "1px solid rgba(255,20,147,0.2)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Teams in {league} — Season {season}</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem" }}>{teams.length} team{teams.length === 1 ? "" : "s"} registered</div>
        </div>
      )}

      {[
        ["🎞️", "Manage Slideshow", "slideshow"],
        ["🎨", "Zone Config", "zones"],
        ["🔗", "Team Linking", "teamLinks"],
        ["📜", "Submission History", "requests"],
        ["🔑", "Manager Keys", "keys"],
        ["📋", "Manager History", "history"],
      ].map(([icon, label, id]) => (
        <button key={id} onClick={() => setView(id)} style={btnStyle}
          onMouseOver={e => { e.currentTarget.style.background = "rgba(255,20,147,0.18)"; e.currentTarget.style.borderColor = "#FF1493"; }}
          onMouseOut={e => { e.currentTarget.style.background = "rgba(255,20,147,0.08)"; e.currentTarget.style.borderColor = "rgba(255,20,147,0.25)"; }}>
          <span style={{ fontSize: "1.4rem" }}>{icon}</span>{label}<span style={{ marginLeft: "auto", color: "#FF1493" }}>›</span>
        </button>
      ))}

      <button onClick={onClose} style={{ width: "100%", marginTop: 8, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,20,147,0.3)", borderRadius: 12, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  );
}
