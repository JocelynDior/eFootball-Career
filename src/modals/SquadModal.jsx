import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, set, onValue, remove, update } from "firebase/database";
import { askGroq } from "../utils/groq";

const FORMATIONS = [
  "4-3-3","4-4-2","4-2-3-1","3-5-2","5-3-2",
  "4-1-4-1","3-4-3","5-4-1","4-5-1","3-6-1",
];

const POSITIONS = ["GK","LB","CB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"];

const FORMATION_LAYOUTS = {
  "4-3-3": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CM",x:25,y:52 },{ pos:"CM",x:50,y:52 },{ pos:"CM",x:75,y:52 },
    { pos:"LW",x:15,y:28 },{ pos:"ST",x:50,y:22 },{ pos:"RW",x:85,y:28 },
  ],
  "4-4-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"LM",x:15,y:50 },{ pos:"CM",x:35,y:50 },{ pos:"CM",x:65,y:50 },{ pos:"RM",x:85,y:50 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "4-2-3-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CDM",x:35,y:56 },{ pos:"CDM",x:65,y:56 },
    { pos:"LW",x:15,y:38 },{ pos:"CAM",x:50,y:38 },{ pos:"RW",x:85,y:38 },
    { pos:"ST",x:50,y:20 },
  ],
  "3-5-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LWB",x:10,y:52 },{ pos:"CDM",x:30,y:52 },{ pos:"CM",x:50,y:52 },{ pos:"CM",x:70,y:52 },{ pos:"RWB",x:90,y:52 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "5-3-2": [
    { pos:"GK",x:50,y:90 },
    { pos:"LWB",x:10,y:70 },{ pos:"CB",x:28,y:74 },{ pos:"CB",x:50,y:75 },{ pos:"CB",x:72,y:74 },{ pos:"RWB",x:90,y:70 },
    { pos:"CM",x:25,y:50 },{ pos:"CM",x:50,y:48 },{ pos:"CM",x:75,y:50 },
    { pos:"ST",x:35,y:24 },{ pos:"ST",x:65,y:24 },
  ],
  "4-1-4-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"CDM",x:50,y:58 },
    { pos:"LM",x:12,y:42 },{ pos:"CM",x:35,y:42 },{ pos:"CM",x:65,y:42 },{ pos:"RM",x:88,y:42 },
    { pos:"ST",x:50,y:20 },
  ],
  "3-4-3": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LM",x:12,y:52 },{ pos:"CM",x:35,y:52 },{ pos:"CM",x:65,y:52 },{ pos:"RM",x:88,y:52 },
    { pos:"LW",x:15,y:26 },{ pos:"ST",x:50,y:20 },{ pos:"RW",x:85,y:26 },
  ],
  "5-4-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LWB",x:10,y:70 },{ pos:"CB",x:28,y:74 },{ pos:"CB",x:50,y:75 },{ pos:"CB",x:72,y:74 },{ pos:"RWB",x:90,y:70 },
    { pos:"LM",x:15,y:48 },{ pos:"CM",x:35,y:48 },{ pos:"CM",x:65,y:48 },{ pos:"RM",x:85,y:48 },
    { pos:"ST",x:50,y:22 },
  ],
  "4-5-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"LB",x:15,y:72 },{ pos:"CB",x:35,y:72 },{ pos:"CB",x:65,y:72 },{ pos:"RB",x:85,y:72 },
    { pos:"LM",x:10,y:48 },{ pos:"CM",x:28,y:50 },{ pos:"CM",x:50,y:48 },{ pos:"CM",x:72,y:50 },{ pos:"RM",x:90,y:48 },
    { pos:"ST",x:50,y:22 },
  ],
  "3-6-1": [
    { pos:"GK",x:50,y:90 },
    { pos:"CB",x:25,y:72 },{ pos:"CB",x:50,y:72 },{ pos:"CB",x:75,y:72 },
    { pos:"LM",x:8,y:52 },{ pos:"CDM",x:25,y:52 },{ pos:"CM",x:40,y:52 },{ pos:"CM",x:60,y:52 },{ pos:"CDM",x:75,y:52 },{ pos:"RM",x:92,y:52 },
    { pos:"ST",x:50,y:22 },
  ],
};

const POS_GROUP = {
  GK:["GK"], LB:["LB","LWB"], RB:["RB","RWB"], LWB:["LWB","LB"], RWB:["RWB","RB"],
  CB:["CB"], CDM:["CDM","CM"], CM:["CM","CDM","CAM"], CAM:["CAM","CM"],
  LM:["LM","LW"], RM:["RM","RW"], LW:["LW","LM"], RW:["RW","RM"],
  CF:["CF","ST"], ST:["ST","CF"],
};

const inputStyle = {
  width:"100%", padding:"14px 18px",
  background:"rgba(255,255,255,0.06)",
  border:"1px solid rgba(255,20,147,0.35)",
  borderRadius:"12px", color:"#fff",
  fontFamily:"inherit", fontSize:"1rem",
  outline:"none", boxSizing:"border-box",
};

const labelStyle = {
  color:"rgba(255,255,255,0.65)", fontSize:"0.85rem",
  display:"block", marginBottom:"8px",
  textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:700,
};

const TODAY = new Date().toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" });
const CONTRACT_EXPIRY = "October 2026";

// Map fotmob position strings to our position codes
function mapFotmobPosition(pos) {
  if (!pos) return "CM";
  const p = pos.toLowerCase();
  if (p.includes("goalkeeper") || p === "gk") return "GK";
  if (p.includes("right back") || p === "rb") return "RB";
  if (p.includes("left back") || p === "lb") return "LB";
  if (p.includes("centre-back") || p.includes("center back") || p === "cb") return "CB";
  if (p.includes("right wing-back") || p === "rwb") return "RWB";
  if (p.includes("left wing-back") || p === "lwb") return "LWB";
  if (p.includes("defensive mid") || p === "cdm" || p === "dm") return "CDM";
  if (p.includes("central mid") || p === "cm") return "CM";
  if (p.includes("attacking mid") || p === "cam" || p === "am") return "CAM";
  if (p.includes("right mid") || p === "rm") return "RM";
  if (p.includes("left mid") || p === "lm") return "LM";
  if (p.includes("right wing") || p === "rw") return "RW";
  if (p.includes("left wing") || p === "lw") return "LW";
  if (p.includes("centre-forward") || p.includes("center forward") || p === "cf") return "CF";
  if (p.includes("striker") || p.includes("forward") || p === "st") return "ST";
  return "CM";
}

// Map fotmob formation string e.g. "4-3-3" to our formations
function mapFotmobFormation(fmt) {
  if (!fmt) return "4-3-3";
  const clean = fmt.replace(/\s/g, "");
  return FORMATIONS.includes(clean) ? clean : "4-3-3";
}

function buildPitchDisplay(slots, startingPlayers) {
  const used = new Set();
  return slots.map(slot => {
    // Exact match
    let match = startingPlayers.find(p => !used.has(p.id) && p.position === slot.pos);
    // Group match
    if (!match) {
      const group = POS_GROUP[slot.pos] || [slot.pos];
      match = startingPlayers.find(p => !used.has(p.id) && group.includes(p.position));
    }
    // No fallback — slot stays empty if no position match
    if (match) used.add(match.id);
    return { slot, player: match || null };
  });
}

// ── Player Edit Popup ────────────────────────────────────────────────────────
function PlayerEditPopup({ player, teamPath, onClose }) {
  const [shirtNumber, setShirtNumber] = useState(player.shirtNumber || "");
  const [position, setPosition] = useState(player.position || "");
  const [role, setRole] = useState(player.role || "starting");
  const [wage, setWage] = useState(player.wage || "");
  const [fetchingWage, setFetchingWage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!player.wage) fetchWage();
  }, []);

  async function fetchWage() {
    setFetchingWage(true);
    try {
      const raw = await askGroq(
        `You are a football salary expert. Return ONLY valid JSON, no markdown, no <think> tags.`,
        `Today's date is ${TODAY}. What is ${player.name}'s current weekly wage? Return: {"weeklyWage":"€X,XXX"}`
      );
      const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/```json|```/g,"").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const data = JSON.parse(match ? match[0] : clean);
      setWage(data.weeklyWage || "—");
    } catch { setWage("—"); }
    setFetchingWage(false);
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      await update(ref(db, `${teamPath}/${player.id}`), { shirtNumber, position, role, wage, contractExpires: CONTRACT_EXPIRY });
      onClose();
    } catch(e) { setError("Save failed: " + e.message); }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove(ref(db, `${teamPath}/${player.id}`));
      onClose();
    } catch(e) { setError("Delete failed: " + e.message); }
    setDeleting(false);
  }

  const iStyle = { ...inputStyle };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ background:"#0a0015", border:"1px solid rgba(255,20,147,0.3)", borderRadius:"24px", padding:"32px", maxWidth:"440px", width:"100%", position:"relative" }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"14px", background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", borderRadius:"50%", width:"32px", height:"32px", cursor:"pointer" }}>✕</button>
        <div style={{ color:"#fff", fontFamily:"'Bebas Neue', sans-serif", fontSize:"2rem", letterSpacing:"2px", marginBottom:"20px" }}>{player.name}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
          <div>
            <label style={labelStyle}>Shirt #</label>
            <input value={shirtNumber} onChange={e=>setShirtNumber(e.target.value)} style={iStyle} type="number" />
          </div>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={position} onChange={e=>setPosition(e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
              {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:"16px" }}>
          <label style={labelStyle}>Role</label>
          <div style={{ display:"flex", gap:"10px" }}>
            {[["starting","Starting XI"],["bench","Bench"]].map(([val,label])=>(
              <button key={val} onClick={()=>setRole(val)} style={{ flex:1, padding:"12px", borderRadius:"12px", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:"0.9rem", background:role===val?"#FF1493":"rgba(255,255,255,0.06)", border:`1px solid ${role===val?"#FF1493":"rgba(255,20,147,0.3)"}`, color:"#fff" }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,20,147,0.15)", borderRadius:"14px", padding:"16px", marginBottom:"16px" }}>
          {[["💰 Weekly Wage", fetchingWage?"Fetching...":(wage||"—")],["📅 Contract Expires", CONTRACT_EXPIRY]].map(([label,value])=>(
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"0.95rem" }}>{label}</span>
              <span style={{ color:"#fff", fontWeight:700, fontSize:"0.95rem" }}>{value}</span>
            </div>
          ))}
        </div>
        {error && <div style={{ color:"#ff6b6b", fontSize:"0.9rem", marginBottom:"12px", padding:"10px", background:"rgba(255,0,0,0.1)", borderRadius:"10px" }}>{error}</div>}
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"14px", background:"#FF1493", border:"none", borderRadius:"12px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor:saving?"not-allowed":"pointer" }}>{saving?"Saving...":"💾 Save"}</button>
          <button onClick={handleDelete} disabled={deleting} style={{ flex:1, padding:"14px", background:"rgba(255,50,50,0.15)", border:"1px solid rgba(255,50,50,0.4)", borderRadius:"12px", color:"#ff6b6b", fontWeight:700, fontSize:"1rem", cursor:deleting?"not-allowed":"pointer" }}>{deleting?"...":"🗑️"}</button>
        </div>
      </div>
    </div>
  );
}

export default function SquadModal({ team, onClose }) {
  const [formation, setFormation] = useState("4-3-3");
  const [players, setPlayers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [settingDefault, setSettingDefault] = useState(false);

  const [newName, setNewName] = useState("");
  const [newShirt, setNewShirt] = useState("");
  const [newPosition, setNewPosition] = useState("ST");
  const [newRole, setNewRole] = useState("starting");

  const teamPath = `career_team_management/${team}/squad`;

  useEffect(() => {
    if (!team) return;
    const unsub = onValue(ref(db, teamPath), snap => {
      const data = snap.val();
      setPlayers(data ? Object.entries(data).map(([id,p])=>({ id,...p })) : []);
    });
    const fUnsub = onValue(ref(db, `career_team_management/${team}/formation`), snap => {
      if (snap.val()) setFormation(snap.val());
    });
    return () => { unsub(); fUnsub(); };
  }, [team]);

  // ── Set Default Squad from Fotmob ─────────────────────────────────────────
  async function handleSetDefaultSquad() {
    setSettingDefault(true);
    setError("");
    try {
      // Search fotmob for the team
      const searchRes = await fetch(
        `https://www.fotmob.com/api/search?term=${encodeURIComponent(team)}`,
        { headers: { Accept: "application/json" } }
      );
      const searchData = await searchRes.json();

      // Find team result
      const teamHit = searchData?.squads?.find(r => r.name?.toLowerCase().includes(team.toLowerCase()))
        || searchData?.squads?.[0];

      let autoPlayers = [];
      let autoFormation = "4-3-3";

      if (teamHit?.id) {
        // Fetch team details
        const teamRes = await fetch(
          `https://www.fotmob.com/api/teams?id=${teamHit.id}&tab=squad&type=europe&timeZone=Europe/London`,
          { headers: { Accept: "application/json" } }
        );
        const teamData = await teamRes.json();

        // Try to get lineup from recent match
        const matchesRes = await fetch(
          `https://www.fotmob.com/api/teams?id=${teamHit.id}&tab=matches&type=europe&timeZone=Europe/London`,
          { headers: { Accept: "application/json" } }
        );
        const matchesData = await matchesRes.json();

        // Get last played match id
        const lastMatch = matchesData?.matches?.previousMatches?.[matchesData.matches.previousMatches.length - 1];

        if (lastMatch?.id) {
          const matchRes = await fetch(
            `https://www.fotmob.com/api/matchDetails?matchId=${lastMatch.id}`,
            { headers: { Accept: "application/json" } }
          );
          const matchDetail = await matchRes.json();

          // Find which side is our team
          const homeId = matchDetail?.header?.teams?.[0]?.id;
          const side = homeId === teamHit.id ? "home" : "away";
          const lineup = matchDetail?.content?.lineup?.[side];
          const formationStr = lineup?.formation || "4-3-3";
          autoFormation = mapFotmobFormation(formationStr);

          // Starting XI
          const starters = lineup?.starters || [];
          starters.forEach((p, i) => {
            autoPlayers.push({
              id: `default_${Date.now()}_${i}`,
              name: p.name?.fullName || p.name || `Player ${i+1}`,
              shirtNumber: p.shirtNumber || String(i+1),
              position: mapFotmobPosition(p.positionBoardPo || p.role),
              role: "starting",
              contractExpires: CONTRACT_EXPIRY,
            });
          });

          // Bench
          const bench = lineup?.subs || lineup?.bench || [];
          bench.forEach((p, i) => {
            autoPlayers.push({
              id: `default_bench_${Date.now()}_${i}`,
              name: p.name?.fullName || p.name || `Sub ${i+1}`,
              shirtNumber: p.shirtNumber || "",
              position: mapFotmobPosition(p.positionBoardPo || p.role),
              role: "bench",
              contractExpires: CONTRACT_EXPIRY,
            });
          });
        }

        // Fallback to squad list if no lineup found
        if (autoPlayers.length === 0) {
          const members = teamData?.members || [];
          members.slice(0,23).forEach((p, i) => {
            autoPlayers.push({
              id: `default_squad_${Date.now()}_${i}`,
              name: p.name || `Player ${i+1}`,
              shirtNumber: p.shirtNumber || "",
              position: mapFotmobPosition(p.role),
              role: i < 11 ? "starting" : "bench",
              contractExpires: CONTRACT_EXPIRY,
            });
          });
        }
      }

      // If fotmob failed entirely — use Groq as fallback
      if (autoPlayers.length === 0) {
        const raw = await askGroq(
          `You are a football data expert. Return ONLY valid JSON, no markdown, no <think> tags.`,
          `Today is ${TODAY}. What is ${team}'s most recent real starting XI and formation? Return JSON:
{"formation":"4-3-3","starters":[{"name":"","position":"GK","shirtNumber":"1"},...],"bench":[{"name":"","position":"","shirtNumber":""},...]}
Use real current players only. Starters must be exactly 11.`
        );
        const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/```json|```/g,"").trim();
        const match = clean.match(/\{[\s\S]*\}/);
        const data = JSON.parse(match ? match[0] : clean);
        autoFormation = mapFotmobFormation(data.formation);
        (data.starters || []).forEach((p,i) => {
          autoPlayers.push({ id:`groq_${Date.now()}_${i}`, name:p.name, shirtNumber:p.shirtNumber||"", position:mapFotmobPosition(p.position), role:"starting", contractExpires:CONTRACT_EXPIRY });
        });
        (data.bench || []).forEach((p,i) => {
          autoPlayers.push({ id:`groq_bench_${Date.now()}_${i}`, name:p.name, shirtNumber:p.shirtNumber||"", position:mapFotmobPosition(p.position), role:"bench", contractExpires:CONTRACT_EXPIRY });
        });
      }

      setFormation(autoFormation);
      setPlayers(autoPlayers.slice(0,23));
    } catch(e) {
      setError("Auto-fill failed: " + e.message);
    }
    setSettingDefault(false);
  }

  function addPlayer() {
    if (!newName.trim()) return;
    if (players.length >= 23) { setError("Maximum squad size is 23 players."); return; }
    setError("");
    setPlayers(prev => [...prev, {
      id: Date.now().toString(),
      name: newName.trim(),
      shirtNumber: newShirt || "",
      position: newPosition,
      role: newRole,
      contractExpires: CONTRACT_EXPIRY,
    }]);
    setNewName(""); setNewShirt("");
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const squadObj = {};
      players.forEach(p => { squadObj[p.id] = p; });
      await set(ref(db, teamPath), squadObj);
      await set(ref(db, `career_team_management/${team}/formation`), formation);
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch(e) { setError("Save failed: " + e.message); }
    setSaving(false);
  }

  const slots = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-3-3"];
  const startingPlayers = players.filter(p => p.role === "starting");
  const benchPlayers = players.filter(p => p.role === "bench");
  const pitchDisplay = buildPitchDisplay(slots, startingPlayers);

  return (
    <div style={{ fontFamily:"'Inter', sans-serif" }}>
      <h3 style={{ color:"#FF1493", fontFamily:"'Bebas Neue', sans-serif", fontSize:"2.8rem", marginBottom:"8px", letterSpacing:"3px" }}>
        👥 SQUAD BUILDER
      </h3>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.9rem", marginBottom:"20px" }}>Team: <span style={{ color:"#FF1493", fontWeight:700 }}>{team}</span></div>

      {/* Disclaimer */}
      <div style={{ background:"rgba(255,170,0,0.1)", border:"2px solid rgba(255,170,0,0.5)", borderRadius:"14px", padding:"14px 18px", marginBottom:"20px" }}>
        <div style={{ color:"#ffaa00", fontWeight:800, fontSize:"0.95rem", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"1px" }}>⚠️ Disclaimer</div>
        <div style={{ color:"rgba(255,255,255,0.8)", fontSize:"0.9rem", lineHeight:1.6 }}>Only use real players that play for <strong>"{team}"</strong>. No retired or unsigned players.</div>
      </div>

      {/* Set Default Squad button */}
      <button
        onClick={handleSetDefaultSquad}
        disabled={settingDefault}
        style={{ width:"100%", padding:"18px", background:settingDefault?"rgba(255,20,147,0.15)":"linear-gradient(135deg,rgba(255,20,147,0.2),rgba(255,20,147,0.05))", border:"2px solid rgba(255,20,147,0.5)", borderRadius:"14px", color:settingDefault?"rgba(255,20,147,0.5)":"#FF1493", fontWeight:700, fontSize:"1.1rem", cursor:settingDefault?"not-allowed":"pointer", marginBottom:"24px", fontFamily:"inherit", letterSpacing:"0.5px" }}
      >
        {settingDefault ? "🔍 Researching on Fotmob..." : "⚡ Set Default Squad (Auto-fill from Fotmob)"}
      </button>

      {/* Formation */}
      <div style={{ marginBottom:"24px" }}>
        <label style={labelStyle}>Formation</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"10px" }}>
          {FORMATIONS.map(f=>(
            <button key={f} onClick={()=>setFormation(f)} style={{ padding:"10px 18px", borderRadius:"24px", cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:"0.95rem", background:formation===f?"#FF1493":"rgba(255,20,147,0.1)", border:`1px solid ${formation===f?"#FF1493":"rgba(255,20,147,0.3)"}`, color:"#fff" }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Pitch preview */}
      <div style={{ marginBottom:"28px" }}>
        <label style={labelStyle}>Pitch Preview — {formation} · {startingPlayers.length} starting · click shirt to edit</label>
        <div style={{ position:"relative", width:"100%", paddingBottom:"140%", background:"linear-gradient(180deg,#1a5c1a 0%,#2d8c2d 20%,#1a5c1a 40%,#2d8c2d 60%,#1a5c1a 80%,#2d8c2d 100%)", borderRadius:"16px", border:"3px solid rgba(255,255,255,0.15)", overflow:"hidden" }}>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 100 140" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
            <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
            <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
            <rect x="22" y="2" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
            <rect x="22" y="118" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
          </svg>
          {pitchDisplay.map(({ slot, player }, i) => (
            <div key={i} style={{ position:"absolute", left:`${slot.x}%`, top:`${slot.y}%`, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", zIndex:2 }}>
              <div
                onClick={() => player && setEditingPlayer(player)}
                style={{ width:"64px", height:"64px", background:player?"#FF1493":"rgba(255,255,255,0.15)", borderRadius:"10px", border:player?"2px solid #fff":"2px dashed rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:player?"0 2px 14px rgba(255,20,147,0.7)":"none", cursor:player?"pointer":"default", transition:"transform 0.15s" }}
                onMouseOver={e=>{ if(player) e.currentTarget.style.transform="scale(1.1)"; }}
                onMouseOut={e=>{ e.currentTarget.style.transform="scale(1)"; }}
              >
                <span style={{ color:"#fff", fontWeight:900, fontSize:"1.1rem" }}>{player?(player.shirtNumber||"#"):slot.pos}</span>
              </div>
              <div style={{ color:player?"#fff":"rgba(255,255,255,0.3)", fontSize:"0.7rem", fontWeight:700, marginTop:"3px", textAlign:"center", maxWidth:"64px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textShadow:"0 1px 4px rgba(0,0,0,0.9)", background:"rgba(0,0,0,0.5)", borderRadius:"4px", padding:"2px 5px" }}>
                {player ? player.name.split(" ").pop() : slot.pos}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add player */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,20,147,0.2)", borderRadius:"16px", padding:"20px", marginBottom:"24px" }}>
        <div style={{ color:"#fff", fontWeight:700, fontSize:"1.1rem", marginBottom:"16px" }}>➕ Add Player ({players.length}/23)</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:"10px", marginBottom:"12px" }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Player name" style={inputStyle} onKeyDown={e=>e.key==="Enter"&&addPlayer()} />
          <input value={newShirt} onChange={e=>setNewShirt(e.target.value)} placeholder="#" style={inputStyle} type="number" />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
          <div>
            <label style={labelStyle}>Position</label>
            <select value={newPosition} onChange={e=>setNewPosition(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
              <option value="starting">Starting XI</option>
              <option value="bench">Bench</option>
            </select>
          </div>
        </div>
        <button onClick={addPlayer} disabled={players.length>=23} style={{ width:"100%", padding:"14px", background:players.length>=23?"rgba(255,20,147,0.2)":"#FF1493", border:"none", borderRadius:"12px", color:"#fff", fontWeight:700, fontSize:"1rem", cursor:players.length>=23?"not-allowed":"pointer" }}>
          {players.length>=23?"Squad Full (23/23)":"Add Player"}
        </button>
      </div>

      {/* Player lists */}
      {startingPlayers.length > 0 && (
        <div style={{ marginBottom:"16px" }}>
          <label style={labelStyle}>Starting XI ({startingPlayers.length})</label>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {startingPlayers.map(p=>(
              <div key={p.id} onClick={()=>setEditingPlayer(p)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"rgba(255,20,147,0.08)", border:"1px solid rgba(255,20,147,0.2)", borderRadius:"12px", cursor:"pointer" }}
                onMouseOver={e=>e.currentTarget.style.borderColor="rgba(255,20,147,0.5)"}
                onMouseOut={e=>e.currentTarget.style.borderColor="rgba(255,20,147,0.2)"}
              >
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"32px", height:"32px", background:"#FF1493", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:"0.85rem" }}>{p.shirtNumber||"#"}</div>
                  <div>
                    <div style={{ color:"#fff", fontWeight:700, fontSize:"1rem" }}>{p.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.8rem" }}>{p.position}</div>
                  </div>
                </div>
                <span style={{ color:"rgba(255,20,147,0.7)", fontSize:"0.85rem" }}>✏️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {benchPlayers.length > 0 && (
        <div style={{ marginBottom:"24px" }}>
          <label style={labelStyle}>Bench ({benchPlayers.length})</label>
          <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
            {benchPlayers.map(p=>(
              <div key={p.id} onClick={()=>setEditingPlayer(p)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", cursor:"pointer" }}
                onMouseOver={e=>e.currentTarget.style.borderColor="rgba(255,20,147,0.3)"}
                onMouseOut={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}
              >
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <div style={{ width:"32px", height:"32px", background:"rgba(255,255,255,0.1)", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:"0.85rem" }}>{p.shirtNumber||"#"}</div>
                  <div>
                    <div style={{ color:"#fff", fontWeight:700, fontSize:"1rem" }}>{p.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.8rem" }}>{p.position} · Bench</div>
                  </div>
                </div>
                <span style={{ color:"rgba(255,20,147,0.7)", fontSize:"0.85rem" }}>✏️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ color:"#ff6b6b", fontSize:"1rem", marginBottom:"16px", padding:"14px", background:"rgba(255,0,0,0.1)", borderRadius:"12px" }}>{error}</div>}

      {saved ? (
        <div style={{ textAlign:"center", color:"#00ff88", fontWeight:700, padding:"20px", background:"rgba(0,255,136,0.1)", borderRadius:"14px", fontSize:"1.1rem" }}>✅ Squad Saved!</div>
      ) : (
        <div style={{ display:"flex", gap:"14px" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"18px", background:"#FF1493", border:"none", borderRadius:"14px", color:"#fff", fontWeight:700, fontSize:"1.1rem", cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
            {saving?"Saving...":"💾 Save Squad"}
          </button>
          <button onClick={onClose} style={{ flex:1, padding:"18px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,20,147,0.3)", borderRadius:"14px", color:"#fff", cursor:"pointer", fontSize:"1.1rem" }}>Cancel</button>
        </div>
      )}

      {editingPlayer && (
        <PlayerEditPopup player={editingPlayer} teamPath={teamPath} onClose={() => setEditingPlayer(null)} />
      )}

      <style>{`select option { background:#000033; color:#fff; } input::placeholder { color:rgba(255,255,255,0.3); }`}</style>
    </div>
  );
}
