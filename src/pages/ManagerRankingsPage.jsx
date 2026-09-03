import { useState, useEffect, useRef } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, get, set, push, update, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { verifyAdminKey } from "../utils/adminKey";
import { uploadToImgBB } from "../utils/imgUpload";
import Navbar from "../components/Navbar";

/* ─── THEME ─────────────────────────────────────────────────────────────── */
const T = {
  bg:        "#080808",
  bg2:       "#0d0d1a",
  bg3:       "#131326",
  bg4:       "#1a1a33",
  pink:      "#FF1493",
  pinkDark:  "#cc0e78",
  pinkDim:   "rgba(255,20,147,0.15)",
  navy:      "#000033",
  border:    "rgba(255,255,255,0.07)",
  borderPink:"rgba(255,20,147,0.3)",
  text:      "#ffffff",
  muted:     "rgba(255,255,255,0.5)",
  dim:       "rgba(255,255,255,0.28)",
  radius:    "16px",
  radiusLg:  "24px",
  radiusXl:  "32px",
};

/* ─── LEAGUE CONFIG ─────────────────────────────────────────────────────── */
const LEAGUES = [
  { key: "premier",    name: "Premier League",      pts: 60 },
  { key: "laliga",     name: "La Liga",              pts: 50 },
  { key: "seriea",     name: "Serie A",              pts: 50 },
  { key: "bundesliga", name: "Bundesliga",           pts: 45 },
  { key: "ligue1",     name: "Ligue 1",              pts: 40 },
  { key: "ucl",        name: "Champions League",     pts: 90 },
  { key: "uel",        name: "Europa League",        pts: 50 },
  { key: "cwc",        name: "Club World Cup",       pts: 80 },
  { key: "sc",         name: "Super Cup",            pts: 30 },
];

const TROPHY_LIST = LEAGUES.map(l => ({ id: l.key, name: l.name, points: l.pts }));

/* ─── STYLES ────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
  .rmr-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
  .rmr-wrap { font-family: 'Inter', sans-serif; background: ${T.bg}; min-height: 100vh; color: ${T.text}; }

  .rmr-search input { background: ${T.bg2}; border: 1px solid ${T.border}; border-radius: 40px; color: ${T.text}; font-size: .875rem; padding: 11px 16px 11px 40px; width: 100%; transition: all .2s; font-family: inherit; }
  .rmr-search input:focus { outline: none; border-color: ${T.borderPink}; box-shadow: 0 0 0 3px ${T.pinkDim}; }

  .rmr-card { background: ${T.bg2}; border: 1px solid ${T.border}; border-radius: ${T.radiusXl}; padding: 24px; transition: all .25s; animation: rmrFadeUp .4s ease both; }
  .rmr-card:hover { border-color: ${T.borderPink}; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.4); }
  @keyframes rmrFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

  .rmr-btn-pink { background: linear-gradient(135deg,${T.pink},${T.pinkDark}); color:#fff; border:none; padding:11px 20px; border-radius:40px; font-weight:600; cursor:pointer; font-size:.875rem; transition:all .2s; white-space:nowrap; font-family:inherit; }
  .rmr-btn-pink:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(255,20,147,.35); }

  .rmr-btn-outline { background:transparent; border:1px solid ${T.borderPink}; color:${T.pink}; padding:10px 16px; border-radius:40px; cursor:pointer; font-size:.8rem; font-weight:600; transition:all .2s; font-family:inherit; }
  .rmr-btn-outline:hover { background:${T.pinkDim}; }

  .rmr-btn-ghost { background:${T.bg3}; border:1px solid ${T.border}; color:${T.muted}; padding:10px 14px; border-radius:40px; cursor:pointer; font-size:.8rem; transition:all .2s; font-family:inherit; }
  .rmr-btn-ghost:hover { color:${T.text}; border-color:${T.borderPink}; }
  .rmr-btn-ghost.danger:hover { color:#f87171; border-color:rgba(239,68,68,.3); }

  .rmr-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
  .rmr-stat-cell { background:${T.bg3}; border-radius:${T.radius}; padding:10px 4px; text-align:center; }
  .rmr-stat-label { font-size:.65rem; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  .rmr-stat-val { font-size:1.1rem; font-weight:700; color:${T.pink}; }

  /* status badges */
  .rmr-status { display:inline-flex; align-items:center; gap:5px; font-size:.72rem; font-weight:500; padding:3px 10px; border-radius:20px; margin-bottom:8px; }
  .rmr-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
  .s-active   { background:rgba(34,197,94,.12);  color:#4ade80; border:1px solid rgba(34,197,94,.2);  }
  .s-interim  { background:rgba(251,191,36,.12); color:#fbbf24; border:1px solid rgba(251,191,36,.2); }
  .s-sacked   { background:rgba(239,68,68,.12);  color:#f87171; border:1px solid rgba(239,68,68,.2);  }
  .s-retired  { background:rgba(107,114,128,.12);color:#9ca3af; border:1px solid rgba(107,114,128,.2);}
  .s-free     { background:rgba(59,130,246,.12); color:#60a5fa; border:1px solid rgba(59,130,246,.2); }

  /* overlay / side-menu */
  .rmr-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1999; backdrop-filter:blur(4px); }
  .rmr-sidemenu { position:fixed; top:0; right:0; width:300px; height:100vh; background:${T.bg2}; border-left:1px solid ${T.borderPink}; z-index:2000; padding:24px 20px; overflow-y:auto; }
  .rmr-menu-item { padding:14px 16px; border-radius:${T.radius}; cursor:pointer; font-size:.9rem; font-weight:500; color:${T.muted}; border:1px solid transparent; transition:all .2s; display:flex; align-items:center; gap:10px; }
  .rmr-menu-item:hover { background:${T.bg3}; color:${T.text}; border-color:${T.border}; }
  .rmr-menu-item.pink-item { color:${T.pink}; }
  .rmr-menu-item.pink-item:hover { background:${T.pinkDim}; border-color:${T.borderPink}; }

  /* stats full-screen popup */
  .rmr-popup { position:fixed; inset:0; background:${T.bg}; z-index:4000; display:flex; flex-direction:column; animation:rmrFadeIn .25s ease; overflow:hidden; }
  @keyframes rmrFadeIn { from{opacity:0} to{opacity:1} }
  .rmr-popup-nav { height:56px; background:${T.bg}; border-bottom:1px solid ${T.border}; display:flex; align-items:center; justify-content:space-between; padding:0 20px; flex-shrink:0; position:sticky; top:0; z-index:10; }
  .rmr-popup-body { flex:1; overflow-y:auto; padding:24px 20px; max-width:700px; margin:0 auto; width:100%; }
  .rmr-section { margin-bottom:32px; }
  .rmr-section-title { font-size:.7rem; font-weight:700; color:${T.muted}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid ${T.border}; }

  /* modal */
  .rmr-modal-back { position:fixed; inset:0; background:rgba(0,0,0,.82); z-index:3000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); padding:16px; }
  .rmr-modal { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radiusXl}; max-width:520px; width:100%; max-height:88vh; overflow-y:auto; animation:rmrModalIn .25s ease; }
  @keyframes rmrModalIn { from{opacity:0;transform:scale(.95) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  .rmr-modal-header { padding:20px 24px 16px; border-bottom:1px solid ${T.border}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:${T.bg2}; z-index:1; }
  .rmr-modal-title { font-size:1rem; font-weight:700; color:${T.pink}; }
  .rmr-modal-close { background:${T.bg3}; border:none; color:${T.muted}; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .2s; font-family:inherit; }
  .rmr-modal-close:hover { background:${T.bg4}; color:${T.text}; }
  .rmr-modal-body { padding:20px 24px; }
  .rmr-modal-footer { padding:16px 24px; border-top:1px solid ${T.border}; display:flex; gap:10px; justify-content:flex-end; }

  /* form */
  .rmr-label { display:block; font-size:.75rem; font-weight:600; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
  .rmr-input, .rmr-select, .rmr-textarea { width:100%; padding:10px 14px; background:${T.bg3}; border:1px solid ${T.border}; border-radius:${T.radius}; color:${T.text}; font-size:.875rem; font-family:inherit; transition:all .2s; }
  .rmr-input:focus, .rmr-select:focus, .rmr-textarea:focus { outline:none; border-color:${T.borderPink}; box-shadow:0 0 0 3px ${T.pinkDim}; }
  .rmr-textarea { min-height:100px; resize:vertical; }
  .rmr-select option { background:${T.bg3}; }

  /* comp picker */
  .rmr-comp-picker { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .rmr-comp-opt { background:${T.bg3}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:12px; cursor:pointer; text-align:center; font-size:.8rem; font-weight:600; transition:all .2s; color:${T.muted}; font-family:inherit; }
  .rmr-comp-opt:hover { border-color:${T.borderPink}; color:${T.pink}; }
  .rmr-comp-opt.selected { background:${T.pinkDim}; border-color:${T.borderPink}; color:${T.pink}; }

  /* tags */
  .rmr-tag { background:${T.bg3}; border:1px solid ${T.border}; color:${T.muted}; font-size:.75rem; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:6px; margin:3px; }
  .rmr-tag-rm { background:none; border:none; color:${T.muted}; cursor:pointer; font-size:12px; padding:0; line-height:1; transition:color .2s; font-family:inherit; }
  .rmr-tag-rm:hover { color:#f87171; }

  /* title items */
  .rmr-title-item { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .rmr-title-name { font-size:.875rem; font-weight:600; }
  .rmr-title-season { font-size:.75rem; color:${T.muted}; }
  .rmr-title-pts { font-size:.75rem; color:${T.pink}; font-weight:700; background:${T.pinkDim}; padding:3px 8px; border-radius:20px; }

  /* match history */
  .rmr-match { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:12px 16px; display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; margin-bottom:8px; }
  .rmr-match-team { display:flex; align-items:center; gap:8px; font-size:.8rem; font-weight:600; }
  .rmr-match-team.away { flex-direction:row-reverse; }
  .rmr-match-center { text-align:center; }
  .rmr-match-score { font-size:1rem; font-weight:700; color:${T.pink}; font-family:'Bebas Neue',sans-serif; letter-spacing:2px; }
  .rmr-match-tourn { font-size:.65rem; color:${T.muted}; margin-top:3px; }
  .rmr-match-md { font-size:.65rem; color:${T.dim}; }
  .rmr-forfeit-tag { font-size:.7rem; color:#f87171; background:rgba(239,68,68,.1); padding:2px 8px; border-radius:20px; margin-top:3px; display:inline-block; }

  /* record */
  .rmr-record { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:12px 16px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px; }

  /* rank info */
  .rmr-rank-info h4 { color:${T.pink}; font-size:.85rem; margin:16px 0 6px; }
  .rmr-rank-info ul { padding-left:20px; }
  .rmr-rank-info li { margin-bottom:2px; font-size:.8rem; color:${T.muted}; }
  .rmr-rank-info p { font-size:.8rem; color:${T.muted}; line-height:1.8; }

  /* slideshow */
  .rmr-slideshow { position:relative; border-radius:${T.radiusLg}; overflow:hidden; margin-bottom:16px; background:${T.bg2}; }
  .rmr-slideshow img { width:100%; height:220px; object-fit:contain; display:block; }
  .rmr-dots { display:flex; justify-content:center; gap:6px; padding:10px 0; }
  .rmr-dot { width:6px; height:6px; border-radius:50%; background:${T.bg4}; cursor:pointer; transition:all .2s; border:none; }
  .rmr-dot.active { background:${T.pink}; transform:scale(1.3); }

  /* prev clubs */
  .rmr-prev-club { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:12px 16px; display:flex; align-items:center; gap:12px; margin-bottom:8px; }

  /* add btn */
  .rmr-add-btn { width:100%; background:transparent; border:1px dashed ${T.border}; color:${T.muted}; padding:10px; border-radius:${T.radius}; cursor:pointer; font-size:.8rem; transition:all .2s; margin-top:8px; font-family:inherit; }
  .rmr-add-btn:hover { border-color:${T.borderPink}; color:${T.pink}; }

  /* tiny btns */
  .rmr-btn-tiny { background:${T.bg3}; border:1px solid ${T.border}; color:${T.muted}; padding:4px 10px; border-radius:20px; cursor:pointer; font-size:.7rem; transition:all .2s; font-family:inherit; }
  .rmr-btn-tiny:hover { color:${T.text}; }
  .rmr-btn-tiny.danger:hover { color:#f87171; border-color:rgba(239,68,68,.3); }

  /* toast */
  .rmr-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:${T.bg3}; border:1px solid ${T.borderPink}; color:${T.text}; padding:10px 20px; border-radius:40px; font-size:.8rem; z-index:9999; opacity:0; transition:opacity .3s,bottom .3s; pointer-events:none; white-space:nowrap; }
  .rmr-toast.show { opacity:1; bottom:32px; }

  /* forfeit row */
  .rmr-forfeit-row { display:flex; justify-content:space-around; background:${T.bg2}; border-radius:${T.radius}; padding:12px; margin-top:16px; margin-bottom:8px; }
  .rmr-forfeit-stat { text-align:center; }
  .rmr-forfeit-stat .lbl { font-size:.65rem; color:${T.muted}; }
  .rmr-forfeit-stat .val { font-size:1rem; font-weight:700; color:${T.pink}; }

  /* simple team tags */
  .rmr-team-tag { background:${T.bg3}; border:1px solid ${T.borderPink}; border-radius:20px; padding:6px 14px; font-size:.75rem; color:${T.pink}; display:inline-block; margin:3px; }

  /* thumb grid for slideshow manager */
  .rmr-thumb { position:relative; width:80px; height:60px; border-radius:8px; overflow:hidden; border:1px solid ${T.border}; display:inline-block; margin:4px; }
  .rmr-thumb img { width:100%; height:100%; object-fit:cover; }
  .rmr-thumb-del { position:absolute; top:2px; right:2px; background:#ef4444; color:white; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; }

  @media(max-width:600px){
    .rmr-stat-grid { gap:4px; }
    .rmr-stat-val { font-size:.9rem; }
    .rmr-match { grid-template-columns:1fr; }
    .rmr-match-team.away { flex-direction:row; }
    .rmr-comp-picker { grid-template-columns:1fr; }
  }
`;

/* ─── HELPERS ───────────────────────────────────────────────────────────── */
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function isForfeit(r) {
  return r.forfeitType && r.forfeitType !== "none" && r.forfeitType !== "no_contest";
}
function isNoContest(r) {
  return r.forfeitType === "no_contest" || r.matchType === "forfeit" && r.homeScore === 0 && r.awayScore === 0;
}

/* ─── SCORE CALCULATION ─────────────────────────────────────────────────── */
function calcPerformanceScore(stats) {
  const winPts   = (stats.w  || 0) * 1;
  const lossPts  = (stats.l  || 0) * -1;
  const gsPts    = (stats.gs || 0) * 0.5;
  const gcPts    = (stats.gc || 0) * -0.5;
  return winPts + lossPts + gsPts + gcPts;
}

function calcTrophyPts(trophies = []) {
  return trophies.reduce((s, t) => s + (t.points || 0), 0);
}
function calcMedalPts(medals = []) {
  return medals.reduce((s, m) => s + (m.points || 0), 0);
}
function calcAwardPts(awards = []) {
  return awards.reduce((s, a) => s + (a.points || 0), 0);
}

function totalScore(manager) {
  const perf    = calcPerformanceScore(manager.stats || {});
  const trophyP = calcTrophyPts(manager.trophies);
  const medalP  = calcMedalPts(manager.medals);
  const awardP  = calcAwardPts(manager.individualAwards);
  return perf + trophyP + medalP + awardP;
}

/* ─── FETCH RESULTS FOR ALL LEAGUES ─────────────────────────────────────── */
async function fetchAllStats(teamName) {
  let w=0, d=0, l=0, gs=0, gc=0, fw=0, fl=0, mp=0;
  const matchHistory = [];

  for (const lg of LEAGUES) {
    // find all seasons by reading settings
    let seasons = [];
    try {
      const settSnap = await get(ref(db, `career_${lg.key}_settings`));
      const sett = settSnap.val();
      if (sett?.seasons) seasons = sett.seasons.map(String);
      else seasons = ["1"];
    } catch { seasons = ["1"]; }

    for (const season of seasons) {
      try {
        const snap = await get(ref(db, PATHS.results(lg.key, season)));
        const data = snap.val();
        if (!data) continue;

        for (const r of Object.values(data)) {
          const home = r.homeTeam || "";
          const away = r.awayTeam || "";
          if (home !== teamName && away !== teamName) continue;

          const nc = isNoContest(r);
          mp++;
          if (nc) {
            matchHistory.push({ home, away, homeScore: 0, awayScore: 0, tournament: lg.name, season, md: r.md || 0, isForfeit: false, isNoContest: true });
            continue;
          }

          const forf = isForfeit(r);
          const isHome = home === teamName;
          const ms = isHome ? (r.homeScore || 0) : (r.awayScore || 0);
          const mc = isHome ? (r.awayScore || 0) : (r.homeScore || 0);

          if (forf) {
            if (ms > mc) { w++; fw++; }
            else { l++; fl++; gc += 3; }
          } else {
            gs += ms; gc += mc;
            if (ms > mc) w++;
            else if (ms === mc) d++;
            else l++;
          }
          matchHistory.push({
            home, away,
            homeScore: r.homeScore || 0,
            awayScore: r.awayScore || 0,
            tournament: lg.name,
            season,
            md: r.md || 0,
            isForfeit: forf,
            isNoContest: false,
          });
        }
      } catch {}
    }
  }

  const gd = gs - gc;
  const games = w + d + l;
  const winRate  = games > 0 ? +((w / games) * 100).toFixed(1) : 0;
  const lossRate = games > 0 ? +((l / games) * 100).toFixed(1) : 0;
  matchHistory.sort((a, b) => (b.season * 1000 + (b.md||0)) - (a.season * 1000 + (a.md||0)));
  return { w, d, l, gs, gc, gd, fw, fl, mp, winRate, lossRate, matchHistory };
}

/* ─── AVATAR FALLBACK ───────────────────────────────────────────────────── */
function Avatar({ src, name, size = 72 }) {
  const initials = (name || "?")[0].toUpperCase();
  if (src) return (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.borderPink}`, background: T.bg3, flexShrink: 0 }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.bg3, border: `2px solid ${T.borderPink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: T.pink, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

/* ─── STATUS BADGE ──────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    active:     { cls: "s-active",  label: "Active Manager" },
    interim:    { cls: "s-interim", label: "Interim Manager" },
    sacked:     { cls: "s-sacked",  label: "Sacked" },
    retired:    { cls: "s-retired", label: "Retired" },
    "free-agent":{ cls: "s-free",   label: "Free Agent" },
  };
  const s = map[status] || map["active"];
  return (
    <div className={`rmr-status ${s.cls}`}>
      <span className="rmr-status-dot" />
      {s.label}
    </div>
  );
}

/* ─── TOAST ─────────────────────────────────────────────────────────────── */
function Toast({ msg }) {
  return <div className={`rmr-toast${msg ? " show" : ""}`}>{msg}</div>;
}

/* ─── MODAL WRAPPER ─────────────────────────────────────────────────────── */
function Modal({ title, onClose, footer, children, wide }) {
  return (
    <div className="rmr-modal-back" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rmr-modal" style={wide ? { maxWidth: 680 } : {}}>
        <div className="rmr-modal-header">
          <div className="rmr-modal-title">{title}</div>
          <button className="rmr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rmr-modal-body">{children}</div>
        {footer && <div className="rmr-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */
export default function ManagerRankingsPage() {
  const { isAdmin: ctxAdmin } = useAdmin();

  // data
  const [accounts, setAccounts]   = useState({});
  const [rankData, setRankData]   = useState({});   // career_rankings per uid
  const [managers, setManagers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // ui
  const [search, setSearch]       = useState("");
  const [menuOpen, setMenuOpen]   = useState(false);
  const [toast, setToast]         = useState("");
  const [isAdmin, setIsAdmin]     = useState(false);

  // popup
  const [popupUid, setPopupUid]   = useState(null);
  const [popupStats, setPopupStats] = useState(null);

  // modals
  const [modal, setModal]         = useState(null); // { type, uid }

  // slideshow
  const slideIntervalRef = useRef(null);
  const [slideIdx, setSlideIdx]   = useState(0);

  // admin state
  const [adminKeyInput, setAdminKeyInput] = useState("");

  // temp form state (reused across modals)
  const [form, setForm]           = useState({});

  /* ── toast helper ── */
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  /* ── restore admin session ── */
  useEffect(() => {
    if (localStorage.getItem("careerAdminMode") === "true" || ctxAdmin) setIsAdmin(true);
  }, [ctxAdmin]);

  /* ── load accounts ── */
  useEffect(() => {
    const unsub = onValue(ref(db, PATHS.accounts), snap => {
      setAccounts(snap.val() || {});
    });
    return () => unsub();
  }, []);

  /* ── load rank data (trophies, medals etc stored per uid) ── */
  useEffect(() => {
    const unsub = onValue(ref(db, "career_rankings"), snap => {
      setRankData(snap.val() || {});
    });
    return () => unsub();
  }, []);

  /* ── build managers list when accounts or rankData change ── */
  useEffect(() => {
    async function build() {
      setLoading(true);
      const list = [];
      for (const [uid, acc] of Object.entries(accounts)) {
        if (acc.role !== "manager") continue;
        const rd = rankData[uid] || {};
        // fetch stats for their team
        let stats = rd.manualStats || null;
        if (!stats && acc.team) {
          try { stats = await fetchAllStats(acc.team); } catch { stats = null; }
        }
        if (!stats) stats = { w:0,d:0,l:0,gs:0,gc:0,gd:0,fw:0,fl:0,mp:0,winRate:0,lossRate:0,matchHistory:[] };
        list.push({
          uid,
          username:  acc.username || "Unknown",
          team:      acc.team || null,
          profilePhoto: acc.profilePhoto || null,
          status:    rd.overrideStatus || (acc.team ? "active" : "free-agent"),
          trophies:  rd.trophies || [],
          medals:    rd.medals   || [],
          individualAwards: rd.individualAwards || [],
          records:   rd.records  || [],
          description: rd.description || "",
          trophyCabinet: rd.trophyCabinet || {},
          stats,
        });
      }
      // sort by total score desc
      list.sort((a, b) => {
        const sa = totalScore(a), sb = totalScore(b);
        if (sa !== sb) return sb - sa;
        if ((b.trophies||[]).length !== (a.trophies||[]).length) return (b.trophies||[]).length - (a.trophies||[]).length;
        if (a.stats.w !== b.stats.w) return b.stats.w - a.stats.w;
        return (b.stats.gd||0) - (a.stats.gd||0);
      });
      setManagers(list);
      setLoading(false);
    }
    if (Object.keys(accounts).length > 0 || !loading) build();
    else if (Object.keys(accounts).length === 0 && !loading) { setManagers([]); setLoading(false); }
  }, [accounts, rankData]);

  // initial load guard
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  /* ── filtered list ── */
  const filtered = managers.filter(m =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.team || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ── open stats popup ── */
  async function openPopup(uid) {
    const m = managers.find(x => x.uid === uid);
    if (!m) return;
    setPopupUid(uid);
    setPopupStats(null);
    setSlideIdx(0);
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    setStatsLoading(true);
    // re-fetch full match history (may already be there)
    let stats = m.stats;
    if (m.team && (!stats.matchHistory || !stats.matchHistory.length)) {
      try { stats = await fetchAllStats(m.team); } catch {}
    }
    setPopupStats({ ...m, stats });
    setStatsLoading(false);

    // start slideshow
    const imgs = m.trophyCabinet?.slideshow?.images || [];
    const dur  = m.trophyCabinet?.slideshow?.duration || 3000;
    if (imgs.length > 1) {
      slideIntervalRef.current = setInterval(() => {
        setSlideIdx(i => (i + 1) % imgs.length);
      }, dur);
    }
  }

  function closePopup() {
    setPopupUid(null);
    setPopupStats(null);
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
  }

  /* ── firebase helpers ── */
  async function saveRankField(uid, fields) {
    await update(ref(db, `career_rankings/${uid}`), fields);
  }
  async function refreshRank(uid) {
    const snap = await get(ref(db, `career_rankings/${uid}`));
    setRankData(prev => ({ ...prev, [uid]: snap.val() || {} }));
  }

  /* ── admin login ── */
  function handleAdminLogin() {
    if (verifyAdminKey(adminKeyInput)) {
      setIsAdmin(true);
      localStorage.setItem("careerAdminMode", "true");
      showToast("Admin mode activated");
      setModal(null);
    } else {
      showToast("Incorrect key");
    }
  }

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{css}</style>
      <div className="rmr-wrap">
        <Navbar title="Manager Rankings" />
        <Toast msg={toast} />

        {/* SIDE MENU */}
        {menuOpen && (
          <>
            <div className="rmr-overlay" onClick={() => setMenuOpen(false)} />
            <div className="rmr-sidemenu">
              <button className="rmr-modal-close" style={{ float: "right" }} onClick={() => setMenuOpen(false)}>✕</button>
              <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="rmr-menu-item" onClick={() => { setMenuOpen(false); setModal({ type: "rankingMethod" }); }}>📊 Ranking Method</div>
                {!isAdmin && (
                  <div className="rmr-menu-item pink-item" onClick={() => { setMenuOpen(false); setModal({ type: "adminLogin" }); }}>🔑 Admin Mode</div>
                )}
                {isAdmin && (
                  <div className="rmr-menu-item pink-item" onClick={() => { setIsAdmin(false); localStorage.removeItem("careerAdminMode"); setMenuOpen(false); showToast("Admin mode off"); }}>✅ Admin Active — Logout</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* HEADER */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
            <div className="rmr-search" style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 14 }}>🔍</span>
              <input placeholder="Search manager or team..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="rmr-btn-ghost" onClick={() => setMenuOpen(true)}>☰ Menu</button>
          </div>

          {/* CARDS */}
          {loading ? (
            <div style={{ textAlign: "center", color: T.muted, padding: "80px 20px" }}>
              <div style={{ fontSize: "2rem", marginBottom: 16 }}>⏳</div>
              Loading managers...
            </div>
          ) : !filtered.length ? (
            <div style={{ textAlign: "center", color: T.dim, padding: "60px 20px" }}>No managers found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map((m, idx) => {
                const rank = idx + 1;
                const rankLabel = rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : `#${rank}`;
                const score = totalScore(m);
                const stats = m.stats || {};
                const games = stats.w + stats.d + stats.l;
                const lossRate = games > 0 ? ((stats.l / games) * 100).toFixed(1) : "0.0";
                const titlesCount = (m.trophies || []).length;

                return (
                  <div key={m.uid} className="rmr-card" style={{ animationDelay: `${idx * 0.05}s`, ...(rank <= 3 ? { background: T.bg3, borderColor: T.borderPink } : {}) }}>
                    {/* TOP ROW */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <Avatar src={m.profilePhoto} name={m.username} size={72} />
                        <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", background: T.bg, border: `1px solid ${T.borderPink}`, color: T.pink, fontSize: ".7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{rankLabel}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "1.15rem", marginBottom: 4 }}>{m.username}</div>
                        <StatusBadge status={m.status} />
                        <div style={{ fontSize: ".75rem", color: T.muted }}>{m.team || "No current team"}</div>
                      </div>
                    </div>

                    {/* SCORE ROW */}
                    <div style={{ background: T.bg3, borderRadius: T.radius, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: ".7rem", color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>🏆 Total Score</span>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem", color: T.pink, letterSpacing: 1 }}>{score.toFixed(1)}</span>
                    </div>

                    {/* STATS 3x3 */}
                    <div className="rmr-stat-grid">
                      {[
                        ["Wins",   stats.w   || 0, null],
                        ["Draws",  stats.d   || 0, null],
                        ["Losses", stats.l   || 0, null],
                        ["GS",     stats.gs  || 0, null],
                        ["GD",     (stats.gd >= 0 ? "+" : "") + (stats.gd || 0), (stats.gd || 0) >= 0 ? "#4ade80" : "#f87171"],
                        ["GC",     stats.gc  || 0, null],
                        ["Win %",  (stats.winRate || 0) + "%", null],
                        ["Titles", titlesCount, null],
                        ["Loss %", lossRate + "%", null],
                      ].map(([label, val, color]) => (
                        <div key={label} className="rmr-stat-cell">
                          <div className="rmr-stat-label">{label}</div>
                          <div className="rmr-stat-val" style={color ? { color } : {}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* ACTIONS */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="rmr-btn-outline" style={{ flex: 1, minWidth: 140 }} onClick={() => openPopup(m.uid)}>📊 View More Statistics</button>
                      {isAdmin && (
                        <>
                          <button className="rmr-btn-ghost" onClick={() => { setModal({ type: "editStatus", uid: m.uid, cur: m.status }); setForm({ status: m.status }); }}>✏️ Status</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── STATS POPUP ── */}
        {popupUid && (
          <StatsPopup
            manager={popupStats || managers.find(m => m.uid === popupUid)}
            loading={statsLoading}
            isAdmin={isAdmin}
            slideIdx={slideIdx}
            setSlideIdx={setSlideIdx}
            onClose={closePopup}
            onModal={(type, extra) => setModal({ type, uid: popupUid, ...extra })}
            showToast={showToast}
            db={db}
            onRefresh={async uid => { await refreshRank(uid); const updated = managers.find(m => m.uid === uid); if (updated) openPopup(uid); }}
          />
        )}

        {/* ── MODALS ── */}
        {modal && (
          <ModalRouter
            modal={modal}
            managers={managers}
            isAdmin={isAdmin}
            onClose={() => setModal(null)}
            showToast={showToast}
            onAdminLogin={handleAdminLogin}
            adminKeyInput={adminKeyInput}
            setAdminKeyInput={setAdminKeyInput}
            onRefresh={async uid => { await refreshRank(uid); }}
            saveRankField={saveRankField}
            db={db}
            popupUid={popupUid}
            onReopenPopup={uid => openPopup(uid)}
          />
        )}
      </div>
    </>
  );
}

/* ─── STATS POPUP COMPONENT ─────────────────────────────────────────────── */
function StatsPopup({ manager: m, loading, isAdmin, slideIdx, setSlideIdx, onClose, onModal, showToast, db, onRefresh }) {
  if (!m) return null;
  const trophies = m.trophies || [];
  const medals   = m.medals   || [];
  const awards   = m.individualAwards || [];
  const records  = m.records  || [];
  const stats    = m.stats    || {};
  const matchHistory = stats.matchHistory || [];
  const cabinet  = m.trophyCabinet?.slideshow || {};
  const imgs     = cabinet.images || [];

  const perf      = calcPerformanceScore(stats);
  const trophyPts = calcTrophyPts(trophies);
  const medalPts  = calcMedalPts(medals);
  const awardPts  = calcAwardPts(awards);
  const score     = perf + trophyPts + medalPts + awardPts;

  return (
    <div className="rmr-popup">
      <div className="rmr-popup-nav">
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{m.username}</div>
        <button className="rmr-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="rmr-popup-body">
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: T.muted }}>Loading stats...</div>
        ) : (
          <>
            {/* SCORE BREAKDOWN */}
            <div className="rmr-section">
              <div className="rmr-section-title">📊 Score Breakdown</div>
              <div style={{ background: T.bg3, borderRadius: T.radius, padding: "16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.muted, fontSize: ".875rem" }}>Total Score</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", color: T.pink }}>{score.toFixed(1)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    ["Performance (W/L/GS/GC)", perf.toFixed(1)],
                    ["Trophy Points", trophyPts.toFixed(1)],
                    ["Medal Points", medalPts.toFixed(1)],
                    ["Award Points", awardPts.toFixed(1)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem" }}>
                      <span style={{ color: T.muted }}>{label}</span>
                      <span style={{ color: T.pink, fontWeight: 700 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TITLES */}
            <div className="rmr-section">
              <div className="rmr-section-title">🏆 Manager Titles</div>

              {/* Trophy cabinet slideshow */}
              {imgs.length > 0 && (
                <div className="rmr-slideshow">
                  <img src={imgs[slideIdx % imgs.length]} alt="Trophy" />
                  {imgs.length > 1 && (
                    <div className="rmr-dots">
                      {imgs.map((_, i) => (
                        <button key={i} className={`rmr-dot${i === slideIdx ? " active" : ""}`} onClick={() => setSlideIdx(i)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trophies.length > 0 && trophies.map((t, i) => (
                <div key={i} className="rmr-title-item">
                  <div>
                    <div className="rmr-title-name">🏆 {t.name}</div>
                    <div className="rmr-title-season">Season {t.season}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="rmr-title-pts">{t.points} pts</div>
                    {isAdmin && (
                      <button className="rmr-btn-tiny danger" onClick={async () => {
                        const updated = trophies.filter((_, j) => j !== i);
                        await set(ref(db, `career_rankings/${m.uid}/trophies`), updated);
                        await onRefresh(m.uid);
                      }}>🗑️</button>
                    )}
                  </div>
                </div>
              ))}

              {medals.length > 0 && medals.map((med, i) => {
                const icon = med.type === "gold" ? "🥇" : med.type === "silver" ? "🥈" : "🥉";
                return (
                  <div key={i} className="rmr-title-item">
                    <div>
                      <div className="rmr-title-name">{icon} {med.name}</div>
                      <div className="rmr-title-season">Season {med.season}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="rmr-title-pts">{med.points.toFixed(1)} pts</div>
                      {isAdmin && (
                        <button className="rmr-btn-tiny danger" onClick={async () => {
                          const updated = medals.filter((_, j) => j !== i);
                          await set(ref(db, `career_rankings/${m.uid}/medals`), updated);
                          await onRefresh(m.uid);
                        }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}

              {awards.length > 0 && awards.map((aw, i) => {
                const icon = aw.type === "golden_boot" ? "⚽" : aw.type === "golden_glove" ? "🧤" : aw.type === "ballon_dor" ? "🌟" : aw.type === "yashin" ? "🏅" : "👨‍💼";
                return (
                  <div key={i} className="rmr-title-item">
                    <div>
                      <div className="rmr-title-name">{icon} {aw.name}</div>
                      <div className="rmr-title-season">Season {aw.season}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="rmr-title-pts">{aw.points.toFixed(1)} pts</div>
                      {isAdmin && (
                        <button className="rmr-btn-tiny danger" onClick={async () => {
                          const updated = awards.filter((_, j) => j !== i);
                          await set(ref(db, `career_rankings/${m.uid}/individualAwards`), updated);
                          await onRefresh(m.uid);
                        }}>🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}

              {!trophies.length && !medals.length && !awards.length && (
                <p style={{ color: T.dim, fontSize: ".8rem", fontStyle: "italic" }}>No titles yet</p>
              )}

              {isAdmin && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="rmr-add-btn" onClick={() => onModal("addTrophy")}>+ Trophy</button>
                  <button className="rmr-add-btn" onClick={() => onModal("addMedal")}>+ Medal</button>
                  <button className="rmr-add-btn" onClick={() => onModal("addAward")}>+ Award</button>
                  <button className="rmr-add-btn" onClick={() => onModal("slideshowManager")}>📸 Trophy Images</button>
                </div>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="rmr-section">
              <div className="rmr-section-title">📝 Description</div>
              {m.description
                ? <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16, fontSize: ".875rem", lineHeight: 1.7, color: T.muted, whiteSpace: "pre-wrap" }}>{m.description}</div>
                : <p style={{ color: T.dim, fontSize: ".8rem", fontStyle: "italic" }}>No description yet</p>
              }
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("editDescription")}>✏️ Edit Description</button>}
            </div>

            {/* EXTENDED STATS */}
            <div className="rmr-section">
              <div className="rmr-section-title">📊 Extended Stats</div>
              <div className="rmr-forfeit-row">
                <div className="rmr-forfeit-stat"><div className="lbl">Forfeit Wins</div><div className="val">{stats.fw || 0}</div></div>
                <div className="rmr-forfeit-stat"><div className="lbl">Forfeit Losses</div><div className="val">{stats.fl || 0}</div></div>
                <div className="rmr-forfeit-stat"><div className="lbl">Matches Played</div><div className="val">{stats.mp || 0}</div></div>
              </div>
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("manualStats")}>✏️ Edit Stats Manually</button>}
            </div>

            {/* RECORDS */}
            <div className="rmr-section">
              <div className="rmr-section-title">📊 Records</div>
              {records.length > 0 ? records.map((r, i) => (
                <div key={i} className="rmr-record">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: ".875rem", fontWeight: 600 }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: ".75rem", color: T.muted, marginTop: 2 }}>{r.description}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: T.pink, fontSize: "1rem", whiteSpace: "nowrap" }}>{r.value}</div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="rmr-btn-tiny" onClick={() => onModal("editRecord", { recordIdx: i })}>✏️</button>
                      <button className="rmr-btn-tiny danger" onClick={async () => {
                        const updated = records.filter((_, j) => j !== i);
                        await set(ref(db, `career_rankings/${m.uid}/records`), updated);
                        await onRefresh(m.uid);
                      }}>🗑️</button>
                    </div>
                  )}
                </div>
              )) : (
                <p style={{ color: T.dim, fontSize: ".8rem", fontStyle: "italic" }}>No records yet</p>
              )}
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("addRecord")}>+ Add Record</button>}
            </div>

            {/* MATCH HISTORY */}
            <div className="rmr-section">
              <div className="rmr-section-title">📅 Match History</div>
              {matchHistory.length > 0 ? matchHistory.map((mh, i) => (
                <div key={i} className="rmr-match">
                  <div className="rmr-match-team">{mh.home}</div>
                  <div className="rmr-match-center">
                    <div className="rmr-match-score">{mh.isForfeit ? "FF" : `${mh.homeScore} - ${mh.awayScore}`}</div>
                    <div className="rmr-match-tourn">{mh.tournament}</div>
                    <div className="rmr-match-md">Season {mh.season} · {typeof mh.md === "number" ? `MD ${mh.md}` : mh.md}</div>
                    {mh.isForfeit && <span className="rmr-forfeit-tag">Forfeit</span>}
                    {mh.isNoContest && <span className="rmr-forfeit-tag" style={{ color: T.muted }}>No Contest</span>}
                  </div>
                  <div className="rmr-match-team away">{mh.away}</div>
                </div>
              )) : (
                <p style={{ color: T.dim, fontSize: ".8rem", fontStyle: "italic" }}>No match history available</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── MODAL ROUTER ──────────────────────────────────────────────────────── */
function ModalRouter({ modal, managers, isAdmin, onClose, showToast, onAdminLogin, adminKeyInput, setAdminKeyInput, onRefresh, saveRankField, db, popupUid, onReopenPopup }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const uid = modal.uid || popupUid;
  const manager = managers.find(m => m.uid === uid);

  async function refresh() {
    await onRefresh(uid);
    if (popupUid) onReopenPopup(popupUid);
  }

  /* ── Admin login ── */
  if (modal.type === "adminLogin") return (
    <Modal title="Admin Login" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={onAdminLogin}>Login</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Admin Key</label>
        <input className="rmr-input" type="password" value={adminKeyInput} onChange={e => setAdminKeyInput(e.target.value)} placeholder="Enter admin key" onKeyDown={e => e.key === "Enter" && onAdminLogin()} />
      </div>
    </Modal>
  );

  /* ── Ranking method ── */
  if (modal.type === "rankingMethod") return (
    <Modal title="Ranking Method" onClose={onClose} footer={<button className="rmr-btn-pink" onClick={onClose}>Got it</button>}>
      <div className="rmr-rank-info">
        <p><strong style={{ color: T.pink }}>Total Score</strong> = Performance + Trophy + Medal + Award Points</p>
        <h4>Performance Points</h4>
        <ul>
          <li>Win: +1 pt</li>
          <li>Loss: -1 pt</li>
          <li>Goal Scored: +0.5 pts</li>
          <li>Goal Conceded: -0.5 pts</li>
        </ul>
        <h4>Trophy Points</h4>
        <ul>{TROPHY_LIST.map(t => <li key={t.id}>{t.name}: {t.points} pts</li>)}</ul>
        <h4>Medal Points</h4>
        <ul>
          <li>🥇 Gold = Trophy Points ÷ 2</li>
          <li>🥈 Silver = Gold ÷ 2</li>
          <li>🥉 Bronze = Silver ÷ 2</li>
        </ul>
        <h4>Individual Awards</h4>
        <ul>
          <li>⚽ Golden Boot = Trophy Points ÷ 2</li>
          <li>🧤 Golden Glove = Trophy Points ÷ 2</li>
          <li>🌟 Ballon d'Or = 50 pts</li>
          <li>🏅 Yashin Trophy = 45 pts</li>
          <li>👨‍💼 Manager of the Season = 50 pts</li>
        </ul>
        <h4>Tiebreaker</h4>
        <ul>
          <li>1. Total Score</li>
          <li>2. Most Trophies</li>
          <li>3. Most Wins</li>
          <li>4. Best Goal Difference</li>
        </ul>
      </div>
    </Modal>
  );

  /* ── Edit status ── */
  if (modal.type === "editStatus") return (
    <Modal title="Edit Manager Status" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={async () => {
          await saveRankField(uid, { overrideStatus: form.status });
          await refresh(); onClose(); showToast("Status updated");
        }}>Save</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Status</label>
        <select className="rmr-select" value={form.status || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="active">Active Manager</option>
          <option value="interim">Interim Manager</option>
          <option value="sacked">Sacked</option>
          <option value="retired">Retired</option>
          <option value="free-agent">Free Agent</option>
        </select>
      </div>
    </Modal>
  );

  /* ── Add Trophy ── */
  if (modal.type === "addTrophy") return (
    <Modal title="Add Trophy" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={async () => {
          if (!form.trophyId || !form.season) { showToast("Fill all fields"); return; }
          const trophy = TROPHY_LIST.find(t => t.id === form.trophyId);
          const updated = [...(manager?.trophies || []), { id: trophy.id, name: trophy.name, points: trophy.points, season: form.season }];
          await set(ref(db, `career_rankings/${uid}/trophies`), updated);
          await refresh(); onClose(); showToast("Trophy added");
        }}>Add Trophy</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Competition</label>
        <select className="rmr-select" value={form.trophyId || ""} onChange={e => setForm(f => ({ ...f, trophyId: e.target.value }))}>
          <option value="">Select competition</option>
          {TROPHY_LIST.map(t => <option key={t.id} value={t.id}>{t.name} ({t.points} pts)</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Season</label>
        <input className="rmr-input" placeholder="e.g. 3" value={form.season || ""} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
      </div>
    </Modal>
  );

  /* ── Add Medal ── */
  if (modal.type === "addMedal") return (
    <Modal title="Add Medal" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={async () => {
          if (!form.trophyId || !form.medalType || !form.season) { showToast("Fill all fields"); return; }
          const trophy = TROPHY_LIST.find(t => t.id === form.trophyId);
          let pts = trophy.points / 2;
          if (form.medalType === "silver") pts = pts / 2;
          if (form.medalType === "bronze") pts = pts / 4;
          const updated = [...(manager?.medals || []), { trophyId: trophy.id, name: trophy.name, type: form.medalType, points: pts, season: form.season }];
          await set(ref(db, `career_rankings/${uid}/medals`), updated);
          await refresh(); onClose(); showToast("Medal added");
        }}>Add Medal</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Competition</label>
        <select className="rmr-select" value={form.trophyId || ""} onChange={e => setForm(f => ({ ...f, trophyId: e.target.value }))}>
          <option value="">Select competition</option>
          {TROPHY_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Medal Type</label>
        <select className="rmr-select" value={form.medalType || ""} onChange={e => setForm(f => ({ ...f, medalType: e.target.value }))}>
          <option value="">Select type</option>
          <option value="gold">🥇 Gold (1st)</option>
          <option value="silver">🥈 Silver (2nd)</option>
          <option value="bronze">🥉 Bronze (3rd)</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Season</label>
        <input className="rmr-input" placeholder="e.g. 3" value={form.season || ""} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
      </div>
    </Modal>
  );

  /* ── Add Award ── */
  if (modal.type === "addAward") return (
    <Modal title="Add Individual Award" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={async () => {
          if (!form.awardType || !form.season) { showToast("Fill all fields"); return; }
          let pts = 0, name = "";
          if (form.awardType === "golden_boot" || form.awardType === "golden_glove") {
            if (!form.trophyId) { showToast("Select competition"); return; }
            const trophy = TROPHY_LIST.find(t => t.id === form.trophyId);
            pts = trophy.points / 2;
            name = `${trophy.name} ${form.awardType === "golden_boot" ? "Golden Boot" : "Golden Glove"}`;
          } else if (form.awardType === "ballon_dor")           { pts = 50; name = "Ballon d'Or"; }
          else if (form.awardType === "yashin")                 { pts = 45; name = "Yashin Trophy"; }
          else if (form.awardType === "manager_of_season")      { pts = 50; name = "Manager of the Season"; }
          const updated = [...(manager?.individualAwards || []), { type: form.awardType, name, points: pts, season: form.season }];
          await set(ref(db, `career_rankings/${uid}/individualAwards`), updated);
          await refresh(); onClose(); showToast("Award added");
        }}>Add Award</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Award Type</label>
        <select className="rmr-select" value={form.awardType || ""} onChange={e => setForm(f => ({ ...f, awardType: e.target.value }))}>
          <option value="">Select award</option>
          <option value="golden_boot">⚽ Golden Boot</option>
          <option value="golden_glove">🧤 Golden Glove</option>
          <option value="ballon_dor">🌟 Ballon d'Or (50 pts)</option>
          <option value="yashin">🏅 Yashin Trophy (45 pts)</option>
          <option value="manager_of_season">👨‍💼 Manager of the Season (50 pts)</option>
        </select>
      </div>
      {(form.awardType === "golden_boot" || form.awardType === "golden_glove") && (
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Competition</label>
          <select className="rmr-select" value={form.trophyId || ""} onChange={e => setForm(f => ({ ...f, trophyId: e.target.value }))}>
            <option value="">Select competition</option>
            {TROPHY_LIST.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Season</label>
        <input className="rmr-input" placeholder="e.g. 3" value={form.season || ""} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} />
      </div>
    </Modal>
  );

  /* ── Edit Description ── */
  if (modal.type === "editDescription") return (
    <Modal title="Edit Description" onClose={onClose} footer={
      <>
        <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="rmr-btn-pink" onClick={async () => {
          await saveRankField(uid, { description: form.description || "" });
          await refresh(); onClose(); showToast("Description saved");
        }}>Save</button>
      </>
    }>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Description</label>
        <textarea className="rmr-textarea" value={form.description ?? (manager?.description || "")} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
    </Modal>
  );

  /* ── Add Record ── */
  if (modal.type === "addRecord" || modal.type === "editRecord") {
    const editing = modal.type === "editRecord";
    const existingRecord = editing ? (manager?.records || [])[modal.recordIdx] : null;
    return (
      <Modal title={editing ? "Edit Record" : "Add Record"} onClose={onClose} footer={
        <>
          <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="rmr-btn-pink" onClick={async () => {
            const name = form.recName ?? existingRecord?.name ?? "";
            const value = form.recValue ?? existingRecord?.value ?? "";
            const desc = form.recDesc ?? existingRecord?.description ?? "";
            if (!name || !value) { showToast("Name and value required"); return; }
            const records = [...(manager?.records || [])];
            const record = { name, value, description: desc };
            if (editing) records[modal.recordIdx] = record;
            else records.push(record);
            await set(ref(db, `career_rankings/${uid}/records`), records);
            await refresh(); onClose(); showToast("Record saved");
          }}>Save</button>
        </>
      }>
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Record Name</label>
          <input className="rmr-input" placeholder="e.g. Most Wins in a Row" defaultValue={existingRecord?.name || ""} onChange={e => setForm(f => ({ ...f, recName: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Value</label>
          <input className="rmr-input" placeholder="e.g. 10" defaultValue={existingRecord?.value || ""} onChange={e => setForm(f => ({ ...f, recValue: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Description (optional)</label>
          <textarea className="rmr-textarea" defaultValue={existingRecord?.description || ""} onChange={e => setForm(f => ({ ...f, recDesc: e.target.value }))} />
        </div>
      </Modal>
    );
  }

  /* ── Manual Stats ── */
  if (modal.type === "manualStats") {
    const s = manager?.stats || {};
    return (
      <Modal title="Edit Stats Manually" onClose={onClose} footer={
        <>
          <button className="rmr-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="rmr-btn-ghost" onClick={async () => {
            await set(ref(db, `career_rankings/${uid}/manualStats`), null);
            await refresh(); onClose(); showToast("Reset to auto");
          }}>Reset to Auto</button>
          <button className="rmr-btn-pink" onClick={async () => {
            const keys = ["w","d","l","mp","gs","gc","fw","fl"];
            const ms = {};
            keys.forEach(k => ms[k] = parseInt(form[k] ?? s[k] ?? 0) || 0);
            ms.gd = ms.gs - ms.gc;
            const games = ms.w + ms.d + ms.l;
            ms.winRate  = games > 0 ? +((ms.w / games) * 100).toFixed(1) : 0;
            ms.lossRate = games > 0 ? +((ms.l / games) * 100).toFixed(1) : 0;
            await saveRankField(uid, { manualStats: ms });
            await refresh(); onClose(); showToast("Stats saved");
          }}>Save</button>
        </>
      }>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["w","Wins"],["d","Draws"],["l","Losses"],["mp","Matches Played"],["gs","Goals Scored"],["gc","Goals Conceded"],["fw","Forfeit Wins"],["fl","Forfeit Losses"]].map(([k, label]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <label className="rmr-label">{label}</label>
              <input className="rmr-input" type="number" min="0" defaultValue={s[k] || 0} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  /* ── Slideshow Manager ── */
  if (modal.type === "slideshowManager") {
    const imgs = manager?.trophyCabinet?.slideshow?.images || [];
    const dur  = (manager?.trophyCabinet?.slideshow?.duration || 3000) / 1000;
    return (
      <Modal title="Trophy Cabinet Images" onClose={onClose} footer={
        <>
          <button className="rmr-btn-ghost" onClick={onClose}>Close</button>
          <button className="rmr-btn-ghost" onClick={async () => {
            const d = parseFloat(form.slideDur ?? dur) * 1000;
            await saveRankField(uid, { "trophyCabinet/slideshow/duration": d });
            await set(ref(db, `career_rankings/${uid}/trophyCabinet/slideshow/duration`), d);
            await refresh(); showToast("Duration saved");
          }}>Save Duration</button>
          <button className="rmr-btn-pink" disabled={uploading} onClick={async () => {
            const file = fileRef.current?.files[0];
            if (!file) { showToast("Select an image"); return; }
            setUploading(true);
            try {
              const url = await uploadToImgBB(file);
              const updated = [...imgs, url];
              await set(ref(db, `career_rankings/${uid}/trophyCabinet/slideshow/images`), updated);
              await refresh(); showToast("Image uploaded");
            } catch { showToast("Upload failed"); }
            setUploading(false);
          }}>{uploading ? "Uploading..." : "Upload"}</button>
        </>
      }>
        <div style={{ marginBottom: 12 }}>
          {imgs.map((url, i) => (
            <div key={i} className="rmr-thumb">
              <img src={url} alt="" />
              <button className="rmr-thumb-del" onClick={async () => {
                const updated = imgs.filter((_, j) => j !== i);
                await set(ref(db, `career_rankings/${uid}/trophyCabinet/slideshow/images`), updated);
                await refresh(); showToast("Image removed");
              }}>✕</button>
            </div>
          ))}
          {!imgs.length && <p style={{ color: T.dim, fontSize: ".8rem" }}>No images yet</p>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Upload Trophy Image</label>
          <input type="file" ref={fileRef} accept="image/*" style={{ marginTop: 8, color: T.muted, fontSize: ".8rem" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="rmr-label">Slideshow Duration (seconds)</label>
          <input className="rmr-input" type="number" min="1" max="10" step="0.5" defaultValue={dur} onChange={e => setForm(f => ({ ...f, slideDur: e.target.value }))} />
        </div>
      </Modal>
    );
  }

  return null;
}
