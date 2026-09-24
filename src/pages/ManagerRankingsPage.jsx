import { useState, useEffect, useRef, useCallback } from "react";
import { db, PATHS } from "../firebase";
import { ref, onValue, get, set, push, update, remove } from "firebase/database";
import { useAdmin } from "../context/AdminContext";
import { verifyAdminKey } from "../utils/adminKey";
import { uploadToImgBB } from "../utils/imgUpload";
import Navbar from "../components/Navbar";
import LeagueHeadlineSlideshow from "../components/LeagueHeadlineSlideshow";

/* ─── THEME ─────────────────────────────────────────────────────────────── */
const T = {
  bg:         "#080808",
  bg2:        "#0d0d1a",
  bg3:        "#131326",
  bg4:        "#1a1a33",
  pink:       "#FF1493",
  pinkDark:   "#cc0e78",
  pinkDim:    "rgba(255,20,147,0.15)",
  border:     "rgba(255,255,255,0.07)",
  borderPink: "rgba(255,20,147,0.3)",
  text:       "#ffffff",
  muted:      "rgba(255,255,255,0.5)",
  dim:        "rgba(255,255,255,0.28)",
  radius:     "16px",
  radiusLg:   "24px",
  radiusXl:   "32px",
};

/* ─── LEAGUES ────────────────────────────────────────────────────────────── */
const LEAGUES = [
  { key: "premier",    name: "Premier League",   pts: 60 },
  { key: "laliga",     name: "La Liga",           pts: 50 },
  { key: "seriea",     name: "Serie A",           pts: 50 },
  { key: "bundesliga", name: "Bundesliga",        pts: 45 },
  { key: "ligue1",     name: "Ligue 1",           pts: 40 },
  { key: "ucl",        name: "Champions League",  pts: 90 },
  { key: "uel",        name: "Europa League",     pts: 50 },
  { key: "cwc",        name: "Club World Cup",    pts: 80 },
  { key: "sc",         name: "Super Cup",         pts: 30 },
];

const TROPHY_LIST = LEAGUES.map(l => ({ id: l.key, name: l.name, points: l.pts }));

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Bebas+Neue&display=swap');
  .rmr * { box-sizing: border-box; margin: 0; padding: 0; }
  .rmr { font-family: 'Inter', sans-serif; background: ${T.bg}; min-height: 100vh; color: ${T.text}; }

  @keyframes rmrSpin    { to { transform: rotate(360deg); } }
  @keyframes rmrFadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes rmrFadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes rmrModalIn { from { opacity:0; transform:scale(.95) translateY(-10px); } to { opacity:1; transform:scale(1) translateY(0); } }

  .rmr-card { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radiusXl}; padding:28px; transition:all .25s; animation:rmrFadeUp .4s ease both; }
  .rmr-card:hover { border-color:${T.borderPink}; transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,.4); }
  .rmr-card.top3 { background:${T.bg3}; border-color:${T.borderPink}; }

  .rmr-search input { background:${T.bg2}; border:1px solid ${T.border}; border-radius:40px; color:${T.text}; font-size:1rem; padding:13px 18px 13px 44px; width:100%; transition:all .2s; font-family:inherit; }
  .rmr-search input:focus { outline:none; border-color:${T.borderPink}; box-shadow:0 0 0 3px ${T.pinkDim}; }

  .rmr-btn-pink   { background:linear-gradient(135deg,${T.pink},${T.pinkDark}); color:#fff; border:none; padding:13px 22px; border-radius:40px; font-weight:600; cursor:pointer; font-size:1rem; transition:all .2s; white-space:nowrap; font-family:inherit; }
  .rmr-btn-pink:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(255,20,147,.35); }
  .rmr-btn-outline { background:transparent; border:1px solid ${T.borderPink}; color:${T.pink}; padding:12px 18px; border-radius:40px; cursor:pointer; font-size:.95rem; font-weight:600; transition:all .2s; font-family:inherit; }
  .rmr-btn-outline:hover { background:${T.pinkDim}; }
  .rmr-btn-ghost  { background:${T.bg3}; border:1px solid ${T.border}; color:${T.muted}; padding:12px 16px; border-radius:40px; cursor:pointer; font-size:.9rem; transition:all .2s; font-family:inherit; }
  .rmr-btn-ghost:hover { color:${T.text}; border-color:${T.borderPink}; }
  .rmr-btn-tiny   { background:${T.bg3}; border:1px solid ${T.border}; color:${T.muted}; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:.8rem; transition:all .2s; font-family:inherit; }
  .rmr-btn-tiny:hover { color:${T.text}; }
  .rmr-btn-tiny.danger:hover { color:#f87171; border-color:rgba(239,68,68,.3); }
  .rmr-add-btn { width:100%; background:transparent; border:1px dashed ${T.border}; color:${T.muted}; padding:12px; border-radius:${T.radius}; cursor:pointer; font-size:.9rem; transition:all .2s; margin-top:8px; font-family:inherit; }
  .rmr-add-btn:hover { border-color:${T.borderPink}; color:${T.pink}; }

  /* tabs */
  .rmr-tabs { display:flex; justify-content:stretch; background:rgba(255,255,255,0.04); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,20,147,0.2); border-radius:50px; padding:8px; gap:4px; margin-bottom:28px; overflow-x:auto; }
  .rmr-tab  { flex:1 1 0; background:transparent; border:none; color:rgba(255,255,255,0.6); padding:20px 16px; border-radius:30px; font-weight:700; font-size:1.7rem; cursor:pointer; letter-spacing:0.4px; transition:all 0.25s; font-family:inherit; white-space:nowrap; text-align:center; min-width:0; }
  .rmr-tab.active { background:#FF1493; color:#fff; }
  .rmr-tab:not(.active):hover { background:rgba(255,255,255,0.1); }

  /* stat grid */
  .rmr-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px; }
  .rmr-stat-cell { background:${T.bg3}; border-radius:${T.radius}; padding:14px 6px; text-align:center; }
  .rmr-stat-label { font-size:.75rem; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
  .rmr-stat-val   { font-size:1.25rem; font-weight:700; color:${T.pink}; }

  /* status */
  .rmr-status { display:inline-flex; align-items:center; gap:5px; font-size:.8rem; font-weight:500; padding:4px 12px; border-radius:20px; margin-bottom:10px; }
  .rmr-status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; }
  .s-active  { background:rgba(34,197,94,.12);  color:#4ade80; border:1px solid rgba(34,197,94,.2); }
  .s-interim { background:rgba(251,191,36,.12); color:#fbbf24; border:1px solid rgba(251,191,36,.2); }
  .s-sacked  { background:rgba(239,68,68,.12);  color:#f87171; border:1px solid rgba(239,68,68,.2); }
  .s-retired { background:rgba(107,114,128,.12);color:#9ca3af; border:1px solid rgba(107,114,128,.2); }
  .s-free    { background:rgba(59,130,246,.12);  color:#60a5fa; border:1px solid rgba(59,130,246,.2); }

  /* overlay / sidemenu */
  .rmr-overlay  { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1999; backdrop-filter:blur(4px); }
  .rmr-sidemenu { position:fixed; top:0; right:0; width:300px; height:100vh; background:${T.bg2}; border-left:1px solid ${T.borderPink}; z-index:2000; padding:24px 20px; overflow-y:auto; }
  .rmr-menu-item { padding:16px 18px; border-radius:${T.radius}; cursor:pointer; font-size:1rem; font-weight:500; color:${T.muted}; border:1px solid transparent; transition:all .2s; display:flex; align-items:center; gap:10px; }
  .rmr-menu-item:hover { background:${T.bg3}; color:${T.text}; border-color:${T.border}; }
  .rmr-menu-item.pink-item { color:${T.pink}; }
  .rmr-menu-item.pink-item:hover { background:${T.pinkDim}; border-color:${T.borderPink}; }

  /* popup */
  .rmr-popup { position:fixed; inset:0; background:${T.bg}; z-index:4000; display:flex; flex-direction:column; animation:rmrFadeIn .25s ease; overflow:hidden; }
  .rmr-popup-nav { height:64px; background:${T.bg}; border-bottom:1px solid ${T.border}; display:flex; align-items:center; justify-content:space-between; padding:0 24px; flex-shrink:0; }
  .rmr-popup-nav-title { font-size:1.3rem; font-weight:700; }
  .rmr-popup-body { flex:1; overflow-y:auto; padding:32px 24px; max-width:800px; margin:0 auto; width:100%; }
  .rmr-section { margin-bottom:36px; }
  .rmr-section-title { font-size:.85rem; font-weight:700; color:${T.muted}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid ${T.border}; }

  /* modal */
  .rmr-modal-back { position:fixed; inset:0; background:rgba(0,0,0,.82); z-index:3000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); padding:16px; }
  .rmr-modal { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radiusXl}; max-width:540px; width:100%; max-height:88vh; overflow-y:auto; animation:rmrModalIn .25s ease; }
  .rmr-modal-header { padding:22px 28px 18px; border-bottom:1px solid ${T.border}; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:${T.bg2}; z-index:1; }
  .rmr-modal-title { font-size:1.15rem; font-weight:700; color:${T.pink}; }
  .rmr-modal-close { background:${T.bg3}; border:none; color:${T.muted}; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; transition:all .2s; font-family:inherit; }
  .rmr-modal-close:hover { background:${T.bg4}; color:${T.text}; }
  .rmr-modal-body { padding:24px 28px; }
  .rmr-modal-footer { padding:18px 28px; border-top:1px solid ${T.border}; display:flex; gap:10px; justify-content:flex-end; }

  /* form */
  .rmr-label    { display:block; font-size:.8rem; font-weight:600; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:7px; }
  .rmr-input, .rmr-select, .rmr-textarea { width:100%; padding:12px 16px; background:${T.bg3}; border:1px solid ${T.border}; border-radius:${T.radius}; color:${T.text}; font-size:1rem; font-family:inherit; transition:all .2s; }
  .rmr-input:focus, .rmr-select:focus, .rmr-textarea:focus { outline:none; border-color:${T.borderPink}; box-shadow:0 0 0 3px ${T.pinkDim}; }
  .rmr-textarea { min-height:110px; resize:vertical; }
  .rmr-select option { background:${T.bg3}; }

  /* title item */
  .rmr-title-item { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
  .rmr-title-name   { font-size:1rem; font-weight:600; }
  .rmr-title-season { font-size:.85rem; color:${T.muted}; }
  .rmr-title-pts    { font-size:.85rem; color:${T.pink}; font-weight:700; background:${T.pinkDim}; padding:4px 10px; border-radius:20px; }

  /* match */
  .rmr-match { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:14px 18px; display:grid; grid-template-columns:1fr auto 1fr; gap:14px; align-items:center; margin-bottom:10px; }
  .rmr-match-team   { display:flex; align-items:center; gap:8px; font-size:.95rem; font-weight:600; }
  .rmr-match-team.away { flex-direction:row-reverse; }
  .rmr-match-center { text-align:center; }
  .rmr-match-score  { font-size:1.3rem; font-weight:700; color:${T.pink}; font-family:'Bebas Neue',sans-serif; letter-spacing:2px; }
  .rmr-match-tourn  { font-size:.75rem; color:${T.muted}; margin-top:3px; }
  .rmr-match-md     { font-size:.72rem; color:${T.dim}; }
  .rmr-forfeit-tag  { font-size:.75rem; color:#f87171; background:rgba(239,68,68,.1); padding:2px 8px; border-radius:20px; margin-top:3px; display:inline-block; }

  /* record */
  .rmr-record { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radius}; padding:14px 18px; display:flex; justify-content:space-between; align-items:flex-start; gap:14px; margin-bottom:10px; }

  /* rank info */
  .rmr-rank-info h4 { color:${T.pink}; font-size:1rem; margin:18px 0 8px; }
  .rmr-rank-info ul { padding-left:22px; }
  .rmr-rank-info li { margin-bottom:4px; font-size:.95rem; color:${T.muted}; }
  .rmr-rank-info p  { font-size:.95rem; color:${T.muted}; line-height:1.8; }

  /* slideshow */
  .rmr-slideshow { position:relative; border-radius:${T.radiusLg}; overflow:hidden; margin-bottom:18px; background:${T.bg2}; }
  .rmr-slideshow img { width:100%; height:240px; object-fit:contain; display:block; }
  .rmr-dots { display:flex; justify-content:center; gap:7px; padding:12px 0; }
  .rmr-dot  { width:7px; height:7px; border-radius:50%; background:${T.bg4}; cursor:pointer; transition:all .2s; border:none; }
  .rmr-dot.active { background:${T.pink}; transform:scale(1.3); }

  /* thumb */
  .rmr-thumb { position:relative; width:90px; height:68px; border-radius:8px; overflow:hidden; border:1px solid ${T.border}; display:inline-block; margin:5px; }
  .rmr-thumb img { width:100%; height:100%; object-fit:cover; }
  .rmr-thumb-del { position:absolute; top:3px; right:3px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; }

  /* toast */
  .rmr-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:${T.bg3}; border:1px solid ${T.borderPink}; color:${T.text}; padding:12px 24px; border-radius:40px; font-size:.9rem; z-index:9999; opacity:0; transition:opacity .3s,bottom .3s; pointer-events:none; white-space:nowrap; }
  .rmr-toast.show { opacity:1; bottom:32px; }

  /* player card */
  .rmr-player-card { background:${T.bg2}; border:1px solid ${T.border}; border-radius:${T.radiusXl}; padding:22px 24px; display:flex; align-items:center; gap:18px; animation:rmrFadeUp .4s ease both; transition:all .25s; }
  .rmr-player-card:hover { border-color:${T.borderPink}; transform:translateY(-2px); }
  .rmr-player-icon { width:64px; height:64px; border-radius:50%; border:2px solid ${T.borderPink}; background:${T.bg3}; object-fit:cover; flex-shrink:0; }
  .rmr-player-rank { font-family:'Bebas Neue',sans-serif; font-size:1.5rem; color:${T.pink}; min-width:44px; text-align:center; }

  /* club card */
  .rmr-club-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:18px 0; }
  .rmr-club-stat { background:${T.bg3}; border-radius:${T.radius}; padding:14px 6px; text-align:center; }
  .rmr-club-stat .lbl { font-size:.72rem; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
  .rmr-club-stat .val { font-size:1.2rem; font-weight:700; color:${T.pink}; }

  /* progress bar */
  .rmr-progress-bar { width:100%; max-width:300px; background:${T.bg4}; border-radius:99px; height:10px; overflow:hidden; }
  .rmr-progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,${T.pink},${T.pinkDark}); transition:width .35s ease; }

  @media(max-width:600px){
    .rmr-stat-grid { gap:6px; }
    .rmr-match { grid-template-columns:1fr; }
    .rmr-match-team.away { flex-direction:row; }
    .rmr-popup-body { padding:20px 14px; }
  }
`;

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function isForfeit(r)   { return r.forfeitType && r.forfeitType !== "none" && r.forfeitType !== "no_contest"; }
function isNoContest(r) { return r.forfeitType === "no_contest" || (r.matchType === "forfeit" && r.homeScore === 0 && r.awayScore === 0); }

function calcPerformanceScore(stats) {
  return (stats.w || 0) - (stats.l || 0) + (stats.gs || 0) * 0.5 - (stats.gc || 0) * 0.5;
}
function calcTrophyPts(trophies = []) { return trophies.reduce((s, t) => s + (t.points || 0), 0); }
function calcMedalPts(medals = [])   { return medals.reduce((s, m) => s + (m.points || 0), 0); }
function calcAwardPts(awards = [])   { return awards.reduce((s, a) => s + (a.points || 0), 0); }
function totalScore(m) {
  const p = calcPerformanceScore(m.stats || {});
  return (p + calcTrophyPts(m.trophies) + calcMedalPts(m.medals) + calcAwardPts(m.individualAwards)) * 2;
}

/* ─── FETCH STATS FOR ONE MANAGER (tenure-aware, lazy) ──────────────────── */
async function fetchManagerStats(teamName, tenures) {
  // tenures: [{team, assignedAt, removedAt}]  (removedAt=null means current)
  let w=0,d=0,l=0,gs=0,gc=0,fw=0,fl=0,mp=0;
  const matchHistory = [];

  for (const lg of LEAGUES) {
    let seasons = [];
    try {
      const snap = await get(ref(db, `career_${lg.key}_settings`));
      const s = snap.val();
      seasons = s?.seasons ? s.seasons.map(String) : ["1"];
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

          // Check tenure: result must have been submitted during a tenure window for this team
          const submittedAt = r.submittedAt || 0;
          const matchingTenure = tenures.find(t =>
            t.team === (home === teamName ? home : away) &&
            submittedAt >= (t.assignedAt || 0) &&
            submittedAt <= (t.removedAt || Date.now())
          );
          if (!matchingTenure) continue;

          const nc = isNoContest(r);
          mp++;
          if (nc) {
            matchHistory.push({ home, away, homeScore: 0, awayScore: 0, tournament: lg.name, season, md: r.md || 0, isForfeit: false, isNoContest: true, submittedAt });
            continue;
          }
          const forf   = isForfeit(r);
          const isHome = home === teamName;
          const ms     = isHome ? (r.homeScore || 0) : (r.awayScore || 0);
          const mc     = isHome ? (r.awayScore || 0) : (r.homeScore || 0);
          if (forf) {
            if (ms > mc) { w++; fw++; } else { l++; fl++; gc += 3; }
          } else {
            gs += ms; gc += mc;
            if (ms > mc) w++;
            else if (ms === mc) d++;
            else l++;
          }
          matchHistory.push({ home, away, homeScore: r.homeScore||0, awayScore: r.awayScore||0, tournament: lg.name, season, md: r.md||0, isForfeit: forf, isNoContest: false, submittedAt });
        }
      } catch {}
    }
  }

  const gd = gs - gc;
  const games = w + d + l;
  matchHistory.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  return { w, d, l, gs, gc, gd, fw, fl, mp, winRate: games > 0 ? +((w/games)*100).toFixed(1) : 0, lossRate: games > 0 ? +((l/games)*100).toFixed(1) : 0, matchHistory };
}

/* ─── FETCH ALL RESULTS FOR A CLUB (for club tab) ───────────────────────── */
async function fetchClubResults(clubName) {
  const results = [];
  for (const lg of LEAGUES) {
    let seasons = [];
    try {
      const snap = await get(ref(db, `career_${lg.key}_settings`));
      const s = snap.val();
      seasons = s?.seasons ? s.seasons.map(String) : ["1"];
    } catch { seasons = ["1"]; }
    for (const season of seasons) {
      try {
        const snap = await get(ref(db, PATHS.results(lg.key, season)));
        const data = snap.val();
        if (!data) continue;
        for (const r of Object.values(data)) {
          if (r.homeTeam !== clubName && r.awayTeam !== clubName) continue;
          results.push({ ...r, tournament: lg.name, season });
        }
      } catch {}
    }
  }
  results.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  return results;
}

/* ─── FETCH ALL PLAYERS ─────────────────────────────────────────────────── */
async function fetchAllPlayers(onProgress) {
  const playerMap = {}; // name -> { name, goals, assists, team, images: {leagueKey: url} }
  let processed = 0;
  const total = LEAGUES.length * 2; // scorers + assistants per league

  for (const lg of LEAGUES) {
    let seasons = [];
    try {
      const snap = await get(ref(db, `career_${lg.key}_settings`));
      const s = snap.val();
      seasons = s?.seasons ? s.seasons.map(String) : ["1"];
    } catch { seasons = ["1"]; }

    // Top scorers
    for (const season of seasons) {
      try {
        const snap = await get(ref(db, PATHS.topScorers(lg.key, season)));
        const data = snap.val();
        if (data) {
          for (const p of Object.values(data)) {
            const key = (p.name || "").toLowerCase().trim();
            if (!key) continue;
            if (!playerMap[key]) playerMap[key] = { name: p.name, goals: 0, assists: 0, team: p.team || "", images: {} };
            playerMap[key].goals += p.count || 0;
            if (p.team) playerMap[key].team = p.team;
            if (p.imageUrl) playerMap[key].images[lg.key] = p.imageUrl;
          }
        }
      } catch {}
    }
    processed++;
    onProgress(processed, total);

    // Top assistants
    for (const season of seasons) {
      try {
        const snap = await get(ref(db, PATHS.topAssistants(lg.key, season)));
        const data = snap.val();
        if (data) {
          for (const p of Object.values(data)) {
            const key = (p.name || "").toLowerCase().trim();
            if (!key) continue;
            if (!playerMap[key]) playerMap[key] = { name: p.name, goals: 0, assists: 0, team: p.team || "", images: {} };
            playerMap[key].assists += p.count || 0;
            if (p.team) playerMap[key].team = p.team;
            if (p.imageUrl && !playerMap[key].images[lg.key]) playerMap[key].images[lg.key] = p.imageUrl;
          }
        }
      } catch {}
    }
    processed++;
    onProgress(processed, total);
  }

  return Object.values(playerMap)
    .map(p => ({
      ...p,
      combined: p.goals + p.assists,
      image: p.images["premier"] || p.images["laliga"] || p.images["ucl"] ||
             p.images["seriea"] || p.images["bundesliga"] || p.images["ligue1"] ||
             p.images["uel"] || p.images["cwc"] || p.images["sc"] || null,
    }))
    .filter(p => p.combined > 0)
    .sort((a, b) => b.combined - a.combined);
}

/* ─── FETCH CLUBS (aggregate stats) ─────────────────────────────────────── */
async function fetchAllClubs(clubs, onProgress) {
  const result = [];
  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i];
    let gs=0, gc=0, titles=0;
    for (const lg of LEAGUES) {
      let seasons = [];
      try {
        const snap = await get(ref(db, `career_${lg.key}_settings`));
        const s = snap.val();
        seasons = s?.seasons ? s.seasons.map(String) : ["1"];
      } catch { seasons = ["1"]; }
      for (const season of seasons) {
        try {
          const snap = await get(ref(db, PATHS.results(lg.key, season)));
          const data = snap.val();
          if (!data) continue;
          for (const r of Object.values(data)) {
            if (r.homeTeam === club.name) { gs += r.homeScore||0; gc += r.awayScore||0; }
            else if (r.awayTeam === club.name) { gs += r.awayScore||0; gc += r.homeScore||0; }
          }
        } catch {}
      }
    }
    result.push({ ...club, gs, gc, gd: gs - gc, titles, awards: 0, medals: 0 });
    onProgress(i + 1, clubs.length);
  }
  return result.sort((a, b) => b.gs - a.gs);
}

/* ─── SMALL COMPONENTS ───────────────────────────────────────────────────── */
function Avatar({ src, name, size = 80 }) {
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.borderPink}`, background: T.bg3, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.bg3, border: `2px solid ${T.borderPink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: T.pink, flexShrink: 0 }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active:      { cls: "s-active",  label: "Active Manager" },
    interim:     { cls: "s-interim", label: "Interim Manager" },
    sacked:      { cls: "s-sacked",  label: "Sacked" },
    retired:     { cls: "s-retired", label: "Retired" },
    "free-agent":{ cls: "s-free",    label: "Free Agent" },
  };
  const s = map[status] || map["active"];
  return <div className={`rmr-status ${s.cls}`}><span className="rmr-status-dot" />{s.label}</div>;
}

function Toast({ msg }) {
  return <div className={`rmr-toast${msg ? " show" : ""}`}>{msg}</div>;
}

function Modal({ title, onClose, footer, children }) {
  return (
    <div className="rmr-modal-back" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rmr-modal">
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

/* ─── LOADING SCREEN ─────────────────────────────────────────────────────── */
function LoadingScreen({ phase, count, total, timedOut }) {
  if (timedOut) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: 18, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>⚠️</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: T.text }}>Failed to load</div>
      <div style={{ fontSize: "1rem", color: T.muted, maxWidth: 300 }}>Please check your internet connection and try again.</div>
      <button className="rmr-btn-pink" onClick={() => window.location.reload()}>Try Again</button>
    </div>
  );

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: 22 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", border: `4px solid ${T.bg4}`, borderTop: `4px solid ${T.pink}`, animation: "rmrSpin 0.9s linear infinite" }} />
      <div style={{ fontSize: "1.1rem", fontWeight: 600, color: T.text, textAlign: "center", maxWidth: 320 }}>{phase}</div>
      {total > 0 && (
        <>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: T.pink, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
            {count} / {total}
          </div>
          <div className="rmr-progress-bar">
            <div className="rmr-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: ".9rem", color: T.muted }}>{pct}%</div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */
export default function ManagerRankingsPage() {
  const { isAdmin: ctxAdmin } = useAdmin();

  /* ── data ── */
  const [accounts, setAccounts]   = useState(null);   // null = not yet loaded
  const [rankData, setRankData]   = useState(null);
  const [managers, setManagers]   = useState([]);
  const [players, setPlayers]     = useState([]);
  const [clubs, setClubs]         = useState([]);
  const [rawClubs, setRawClubs]   = useState([]);     // from career_team_management

  /* ── per-tab loading ── */
  const [tabState, setTabState] = useState({
    managers: { ready: false, loading: false, timedOut: false, phase: "", count: 0, total: 0 },
    players:  { ready: false, loading: false, timedOut: false, phase: "", count: 0, total: 0 },
    clubs:    { ready: false, loading: false, timedOut: false, phase: "", count: 0, total: 0 },
  });
  const tabTimers = useRef({});

  function setTabLoading(t, updates) { setTabState(prev => ({ ...prev, [t]: { ...prev[t], ...updates } })); }

  /* ── ui ── */
  const [tab, setTab]             = useState("managers");
  const [search, setSearch]       = useState("");
  const [menuOpen, setMenuOpen]   = useState(false);
  const [toast, setToast]         = useState("");
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");

  /* ── popup / modals ── */
  const [popup, setPopup]         = useState(null);  // { type: "manager"|"player"|"club", data, stats, loading }
  const [modal, setModal]         = useState(null);
  const slideIntervalRef          = useRef(null);
  const [slideIdx, setSlideIdx]   = useState(0);



  /* ── restore admin ── */
  useEffect(() => {
    if (localStorage.getItem("careerAdminMode") === "true" || ctxAdmin) setIsAdmin(true);
  }, [ctxAdmin]);

  /* ── load accounts ── */
  useEffect(() => {
    const unsub = onValue(ref(db, "career_accounts"), snap => setAccounts(snap.val() || {}));
    return () => unsub();
  }, []);

  /* ── load rankData ── */
  useEffect(() => {
    const unsub = onValue(ref(db, "career_rankings"), snap => setRankData(snap.val() || {}));
    return () => unsub();
  }, []);

  /* ── load clubs from career_team_management ── */
  useEffect(() => {
    const unsub = onValue(ref(db, "career_team_management"), snap => {
      const data = snap.val() || {};
      setRawClubs(Object.entries(data).map(([name, val]) => ({
        name,
        badge: val.info?.badge || null,
        bankrupt: val.bankrupt || false,
      })));
    });
    return () => unsub();
  }, []);

  /* ── Load a tab on demand ── */
  const loadingRef = useRef({});

  async function loadTab(tabKey) {
    if (tabState[tabKey].ready || tabState[tabKey].loading || loadingRef.current[tabKey]) return;
    if (accounts === null || rankData === null) return;
    loadingRef.current[tabKey] = true;
    setTabLoading(tabKey, { loading: true, timedOut: false });
    startTabTimeout(tabKey);

    try {
      if (tabKey === "managers") {
        const entries = Object.entries(accounts);
        setTabLoading("managers", { phase: "Calculating manager stats...", count: 0, total: entries.length });
        const mgrList = [];
        for (let i = 0; i < entries.length; i++) {
          const [uid, acc] = entries[i];
          const rd = rankData[uid] || {};
          const tenures = [];
          if (acc.teamHistory) {
            for (const entry of Object.values(acc.teamHistory)) {
              if (entry.team && entry.team !== "None") {
                tenures.push({ team: entry.team, assignedAt: entry.assignedAt || 0, removedAt: entry.removedAt || Date.now() });
              }
            }
          }
          if (acc.team) tenures.push({ team: acc.team, assignedAt: acc.teamAssignedAt || 0, removedAt: Date.now() });
          mgrList.push({
            uid,
            username: acc.username || "Unknown",
            team: acc.team || null,
            profilePhoto: acc.profilePhoto || null,
            status: rd.overrideStatus || (acc.team ? "active" : "free-agent"),
            trophies: rd.trophies || [],
            medals: rd.medals || [],
            individualAwards: rd.individualAwards || [],
            records: rd.records || [],
            description: rd.description || "",
            trophyCabinet: rd.trophyCabinet || {},
            tenures,
            stats: { w:0,d:0,l:0,gs:0,gc:0,gd:0,fw:0,fl:0,mp:0,winRate:0,lossRate:0,matchHistory:[] },
          });
          setTabLoading("managers", { count: i + 1 });
        }
        mgrList.sort((a, b) => {
          const sa = totalScore(a), sb = totalScore(b);
          if (sa !== sb) return sb - sa;
          return (b.trophies||[]).length - (a.trophies||[]).length;
        });
        setManagers(mgrList);
        setTabLoading("managers", { ready: true, loading: false });

      } else if (tabKey === "players") {
        setTabLoading("players", { phase: "Calculating player stats...", count: 0, total: LEAGUES.length * 2 });
        const playerList = await fetchAllPlayers((c, t) => setTabLoading("players", { count: c, total: t }));
        setPlayers(playerList);
        setTabLoading("players", { ready: true, loading: false });

      } else if (tabKey === "clubs") {
        const clubSnap = await get(ref(db, "career_team_management"));
        const clubData = clubSnap.val() || {};
        const clubList = Object.entries(clubData).map(([name, val]) => ({
          name, badge: val.info?.badge || null, bankrupt: val.bankrupt || false,
        }));
        setTabLoading("clubs", { phase: "Calculating club stats...", count: 0, total: clubList.length });
        const builtClubs = await fetchAllClubs(clubList, (c, t) => setTabLoading("clubs", { count: c, total: t }));
        setClubs(builtClubs);
        setTabLoading("clubs", { ready: true, loading: false });
      }
    } catch (e) {
      setTabLoading(tabKey, { loading: false });
    }
    loadingRef.current[tabKey] = false;
  }

  /* ── Load managers tab on first data ready, load other tabs when switched to ── */
  useEffect(() => {
    if (accounts !== null && rankData !== null) loadTab("managers");
  }, [accounts, rankData]);

  useEffect(() => {
    loadTab(tab);
  }, [tab, accounts, rankData]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  /* ── open manager popup (lazy stats) ── */
  async function openManagerPopup(mgr) {
    setPopup({ type: "manager", data: mgr, stats: null, loading: true });
    setSlideIdx(0);
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    try {
      const stats = await fetchManagerStats(mgr.team, mgr.tenures);
      setPopup(p => ({ ...p, stats, loading: false }));
      const imgs = mgr.trophyCabinet?.slideshow?.images || [];
      const dur  = mgr.trophyCabinet?.slideshow?.duration || 3000;
      if (imgs.length > 1) {
        slideIntervalRef.current = setInterval(() => setSlideIdx(i => (i + 1) % imgs.length), dur);
      }
    } catch {
      setPopup(p => ({ ...p, loading: false }));
    }
  }

  /* ── open club popup (lazy) ── */
  async function openClubPopup(club) {
    setPopup({ type: "club", data: club, stats: null, loading: true });
    try {
      const results = await fetchClubResults(club.name);
      // Top scorers / assistants across all leagues
      const scorerMap = {}, assistMap = {};
      for (const lg of LEAGUES) {
        let seasons = [];
        try { const s = (await get(ref(db, `career_${lg.key}_settings`))).val(); seasons = s?.seasons ? s.seasons.map(String) : ["1"]; } catch { seasons = ["1"]; }
        for (const season of seasons) {
          try {
            const sd = (await get(ref(db, PATHS.topScorers(lg.key, season)))).val();
            if (sd) for (const p of Object.values(sd)) { if ((p.team||"").toLowerCase() === club.name.toLowerCase()) scorerMap[(p.name||"").toLowerCase()] = { name: p.name, count: (scorerMap[(p.name||"").toLowerCase()]?.count || 0) + (p.count||0) }; }
            const ad = (await get(ref(db, PATHS.topAssistants(lg.key, season)))).val();
            if (ad) for (const p of Object.values(ad)) { if ((p.team||"").toLowerCase() === club.name.toLowerCase()) assistMap[(p.name||"").toLowerCase()] = { name: p.name, count: (assistMap[(p.name||"").toLowerCase()]?.count || 0) + (p.count||0) }; }
          } catch {}
        }
      }
      const topScorer   = Object.values(scorerMap).sort((a,b)=>b.count-a.count)[0] || null;
      const topAssist   = Object.values(assistMap).sort((a,b)=>b.count-a.count)[0] || null;
      setPopup(p => ({ ...p, stats: { results: results.slice(0,10), topScorer, topAssist }, loading: false }));
    } catch {
      setPopup(p => ({ ...p, loading: false }));
    }
  }

  function closePopup() {
    setPopup(null);
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
  }

  async function saveRankField(uid, fields) { await update(ref(db, `career_rankings/${uid}`), fields); }
  async function refreshRank(uid) {
    const snap = await get(ref(db, `career_rankings/${uid}`));
    setRankData(prev => ({ ...prev, [uid]: snap.val() || {} }));
  }

  function handleAdminLogin() {
    if (verifyAdminKey(adminKeyInput)) {
      setIsAdmin(true);
      localStorage.setItem("careerAdminMode", "true");
      showToast("Admin mode activated");
      setModal(null);
    } else { showToast("Incorrect key"); }
  }

  /* ── filtered lists ── */
  const q = search.toLowerCase();
  const filteredMgr = managers.filter(m => m.username.toLowerCase().includes(q) || (m.team||"").toLowerCase().includes(q));
  const filteredPlr = players.filter(p => p.name.toLowerCase().includes(q) || (p.team||"").toLowerCase().includes(q));
  const filteredClb = clubs.filter(c => c.name.toLowerCase().includes(q));

  const ts = tabState[tab];

  /* ─── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{css}</style>
      <div className="rmr">
        <Navbar title="Rankings" />
        <Toast msg={toast} />

        {/* Headline */}
        <LeagueHeadlineSlideshow league="rankings" />

        {/* Side menu */}
        {menuOpen && (
          <>
            <div className="rmr-overlay" onClick={() => setMenuOpen(false)} />
            <div className="rmr-sidemenu">
              <button className="rmr-modal-close" style={{ float: "right" }} onClick={() => setMenuOpen(false)}>✕</button>
              <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="rmr-menu-item" onClick={() => { setMenuOpen(false); setModal({ type: "rankingMethod" }); }}>📊 Ranking Method</div>
                {!isAdmin && <div className="rmr-menu-item pink-item" onClick={() => { setMenuOpen(false); setModal({ type: "adminLogin" }); }}>🔑 Admin Mode</div>}
                {isAdmin  && <div className="rmr-menu-item pink-item" onClick={() => { setIsAdmin(false); localStorage.removeItem("careerAdminMode"); setMenuOpen(false); showToast("Admin mode off"); }}>✅ Admin Active — Logout</div>}
              </div>
            </div>
          </>
        )}

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

          {/* Search + menu */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
            <div className="rmr-search" style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 16 }}>🔍</span>
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="rmr-btn-ghost" onClick={() => setMenuOpen(true)}>☰ Menu</button>
          </div>

          {/* Tabs */}
          <div className="rmr-tabs">
            {[["managers","👔 Managers"],["players","⚽ Players"],["clubs","🏟️ Clubs"]].map(([key, label]) => (
              <button
                key={key}
                className={`rmr-tab${tab === key ? " active" : ""}`}
                onClick={() => setTab(key)}
                onMouseOver={e => { if (tab !== key) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseOut={e => { if (tab !== key) e.currentTarget.style.background = "transparent"; }}
              >{label}</button>
            ))}
          </div>

          {/* ── PER-TAB LOADING / TIMEOUT ── */}
          {ts.loading && <LoadingScreen phase={ts.phase} count={ts.count} total={ts.total} timedOut={false} />}
          {ts.timedOut && <LoadingScreen phase="" count={0} total={0} timedOut={true} />}

          {/* ── MANAGERS TAB ── */}
          {ts.ready && tab === "managers" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {filteredMgr.length === 0
                ? <div style={{ textAlign: "center", color: T.dim, padding: "60px 20px", fontSize: "1rem" }}>No managers found.</div>
                : filteredMgr.map((m, idx) => {
                    const rank = idx + 1;
                    const rankLabel = rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : `#${rank}`;
                    const score = totalScore(m);
                    const stats = m.stats || {};
                    const titlesCount = (m.trophies || []).length;
                    return (
                      <div key={m.uid} className={`rmr-card${rank <= 3 ? " top3" : ""}`} style={{ animationDelay: `${idx * 0.04}s` }}>
                        {/* Top row */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 22 }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <Avatar src={m.profilePhoto} name={m.username} size={80} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 5 }}>{m.username}</div>
                            <StatusBadge status={m.status} />
                            <div style={{ fontSize: ".9rem", color: T.muted }}>{m.team || "No current team"}</div>
                          </div>
                        </div>

                        {/* Rank + Score block */}
                        <div style={{ background: T.bg3, borderRadius: T.radius, padding: "16px 20px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: ".8rem", color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>🏆 Total Score</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.7rem", color: T.muted, letterSpacing: 1, lineHeight: 1 }}>{rankLabel}</span>
                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.7rem", color: T.pink, letterSpacing: 1, lineHeight: 1 }}>{score.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="rmr-stat-grid">
                          {[
                            ["Wins",   stats.w || 0,   null],
                            ["Draws",  stats.d || 0,   null],
                            ["Losses", stats.l || 0,   null],
                            ["GS",     stats.gs|| 0,   null],
                            ["GD",     (stats.gd>=0?"+":"")+(stats.gd||0), (stats.gd||0)>=0?"#4ade80":"#f87171"],
                            ["GC",     stats.gc|| 0,   null],
                            ["Win %",  (stats.winRate||0)+"%", null],
                            ["Titles", titlesCount,    null],
                            ["Loss %", (stats.lossRate||0)+"%", null],
                          ].map(([label, val, color]) => (
                            <div key={label} className="rmr-stat-cell">
                              <div className="rmr-stat-label">{label}</div>
                              <div className="rmr-stat-val" style={color ? { color } : {}}>{val}</div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="rmr-btn-outline" style={{ flex: 1, minWidth: 160 }} onClick={() => openManagerPopup(m)}>📊 View More Statistics</button>
                          {isAdmin && <button className="rmr-btn-ghost" onClick={() => { setModal({ type: "editStatus", uid: m.uid, cur: m.status }); }}>✏️ Status</button>}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* ── PLAYERS TAB ── */}
          {ts.ready && tab === "players" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredPlr.length === 0
                ? <div style={{ textAlign: "center", color: T.dim, padding: "60px 20px", fontSize: "1rem" }}>No players found.</div>
                : filteredPlr.map((p, idx) => (
                    <div key={p.name + idx} className="rmr-player-card" style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className="rmr-player-rank">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx+1}`}</div>
                      {p.image
                        ? <img src={p.image} alt={p.name} className="rmr-player-icon" />
                        : <div className="rmr-player-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>⚽</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "1.15rem", marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: ".9rem", color: T.muted }}>{p.team || "Unknown Club"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: ".72rem", color: T.muted, textTransform: "uppercase", letterSpacing: .5 }}>Goals</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: T.pink }}>{p.goals}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: ".72rem", color: T.muted, textTransform: "uppercase", letterSpacing: .5 }}>Assists</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: T.pink }}>{p.assists}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: ".72rem", color: T.muted, textTransform: "uppercase", letterSpacing: .5 }}>Total</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", color: "#fff", fontWeight: 700 }}>{p.combined}</div>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {/* ── CLUBS TAB ── */}
          {ts.ready && tab === "clubs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {filteredClb.length === 0
                ? <div style={{ textAlign: "center", color: T.dim, padding: "60px 20px", fontSize: "1rem" }}>No clubs found.</div>
                : filteredClb.map((c, idx) => {
                    const currentMgr = managers.find(m => m.team === c.name);
                    return (
                      <div key={c.name} className="rmr-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                        {/* Club header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                          <div style={{ width: 72, height: 72, borderRadius: 16, border: `2px solid ${T.borderPink}`, background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                            {c.badge ? <img src={c.badge} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "2rem" }}>🏟️</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 4 }}>{c.name}</div>
                            <div style={{ fontSize: ".9rem", color: T.muted }}>Manager: <span style={{ color: T.pink }}>{currentMgr?.username || "Unassigned"}</span></div>
                          </div>
                        </div>

                        {/* 3×2 stats */}
                        <div className="rmr-club-stat-grid">
                          {[
                            ["Goals Scored", c.gs],
                            ["Goals Conceded", c.gc],
                            ["Goal Diff", (c.gd>=0?"+":"")+c.gd],
                            ["Titles", c.titles],
                            ["Awards", c.awards],
                            ["Medals", c.medals],
                          ].map(([label, val]) => (
                            <div key={label} className="rmr-club-stat">
                              <div className="lbl">{label}</div>
                              <div className="val" style={(label==="Goal Diff") ? { color: c.gd >= 0 ? "#4ade80" : "#f87171" } : {}}>{val}</div>
                            </div>
                          ))}
                        </div>

                        <button className="rmr-btn-outline" style={{ width: "100%" }} onClick={() => openClubPopup(c)}>📊 View More</button>
                      </div>
                    );
                  })
              }
            </div>
          )}

        </div>

        {/* ── MANAGER POPUP ── */}
        {popup?.type === "manager" && (
          <ManagerPopup
            manager={popup.data}
            stats={popup.stats}
            loading={popup.loading}
            isAdmin={isAdmin}
            slideIdx={slideIdx}
            setSlideIdx={setSlideIdx}
            onClose={closePopup}
            onModal={(type, extra) => setModal({ type, uid: popup.data.uid, ...extra })}
            db={db}
            onRefresh={async uid => {
              await refreshRank(uid);
              const updated = managers.find(m => m.uid === uid);
              if (updated) openManagerPopup(updated);
            }}
          />
        )}

        {/* ── CLUB POPUP ── */}
        {popup?.type === "club" && (
          <ClubPopup
            club={popup.data}
            stats={popup.stats}
            loading={popup.loading}
            managers={managers}
            onClose={closePopup}
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
            onRefresh={refreshRank}
            saveRankField={saveRankField}
            db={db}
            popupData={popup?.data || null}
            onReopenPopup={m => openManagerPopup(m)}
          />
        )}
      </div>
    </>
  );
}

/* ─── MANAGER POPUP ──────────────────────────────────────────────────────── */
function ManagerPopup({ manager: m, stats, loading, isAdmin, slideIdx, setSlideIdx, onClose, onModal, db, onRefresh }) {
  const trophies = m.trophies || [];
  const medals   = m.medals   || [];
  const awards   = m.individualAwards || [];
  const records  = m.records  || [];
  const cabinet  = m.trophyCabinet?.slideshow || {};
  const imgs     = cabinet.images || [];

  const perf      = calcPerformanceScore(stats || {});
  const trophyPts = calcTrophyPts(trophies);
  const medalPts  = calcMedalPts(medals);
  const awardPts  = calcAwardPts(awards);
  const score     = (perf + trophyPts + medalPts + awardPts) * 2;

  const matchHistory = stats?.matchHistory || [];

  const fs = { // font sizes — bigger throughout
    label:  ".85rem",
    val:    "1.1rem",
    big:    "2.2rem",
    body:   "1rem",
    muted:  ".9rem",
  };

  return (
    <div className="rmr-popup">
      <div className="rmr-popup-nav">
        <div className="rmr-popup-nav-title">{m.username}</div>
        <button className="rmr-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="rmr-popup-body">
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: `4px solid ${T.bg4}`, borderTop: `4px solid ${T.pink}`, animation: "rmrSpin 0.9s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ color: T.muted, fontSize: "1.1rem" }}>Loading match history...</div>
          </div>
        ) : (
          <>
            {/* Score breakdown */}
            <div className="rmr-section">
              <div className="rmr-section-title">📊 Score Breakdown</div>
              <div style={{ background: T.bg3, borderRadius: T.radius, padding: 20, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.muted, fontSize: fs.body }}>Total Score</span>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: fs.big, color: T.pink }}>{score.toFixed(1)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    ["Performance (W/L/GS/GC)", perf.toFixed(1)],
                    ["Trophy Points", trophyPts.toFixed(1)],
                    ["Medal Points",  medalPts.toFixed(1)],
                    ["Award Points",  awardPts.toFixed(1)],
                    ["× 2 multiplier", "×2"],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: fs.body }}>
                      <span style={{ color: T.muted }}>{label}</span>
                      <span style={{ color: T.pink, fontWeight: 700 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extended stats */}
            <div className="rmr-section">
              <div className="rmr-section-title">📊 Extended Stats</div>
              <div style={{ display: "flex", justifyContent: "space-around", background: T.bg2, borderRadius: T.radius, padding: 18, marginBottom: 10 }}>
                {[["Wins",stats?.w||0],["Draws",stats?.d||0],["Losses",stats?.l||0],["GS",stats?.gs||0],["GC",stats?.gc||0],["MP",stats?.mp||0]].map(([l,v]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: ".75rem", color: T.muted, textTransform: "uppercase" }}>{l}</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700, color: T.pink }}>{v}</div>
                  </div>
                ))}
              </div>
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("manualStats")}>✏️ Edit Stats Manually</button>}
            </div>

            {/* Titles */}
            <div className="rmr-section">
              <div className="rmr-section-title">🏆 Titles & Honours</div>
              {imgs.length > 0 && (
                <div className="rmr-slideshow">
                  <img src={imgs[slideIdx % imgs.length]} alt="Trophy" />
                  {imgs.length > 1 && (
                    <div className="rmr-dots">{imgs.map((_,i) => <button key={i} className={`rmr-dot${i===slideIdx?" active":""}`} onClick={() => setSlideIdx(i)} />)}</div>
                  )}
                </div>
              )}
              {trophies.map((t, i) => (
                <div key={i} className="rmr-title-item">
                  <div><div className="rmr-title-name">🏆 {t.name}</div><div className="rmr-title-season">Season {t.season}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="rmr-title-pts">{t.points} pts</div>
                    {isAdmin && <button className="rmr-btn-tiny danger" onClick={async () => { const u = trophies.filter((_,j)=>j!==i); await set(ref(db,`career_rankings/${m.uid}/trophies`),u); await onRefresh(m.uid); }}>🗑️</button>}
                  </div>
                </div>
              ))}
              {medals.map((med, i) => {
                const icon = med.type==="gold"?"🥇":med.type==="silver"?"🥈":"🥉";
                return (
                  <div key={i} className="rmr-title-item">
                    <div><div className="rmr-title-name">{icon} {med.name}</div><div className="rmr-title-season">Season {med.season}</div></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="rmr-title-pts">{med.points.toFixed(1)} pts</div>
                      {isAdmin && <button className="rmr-btn-tiny danger" onClick={async () => { const u = medals.filter((_,j)=>j!==i); await set(ref(db,`career_rankings/${m.uid}/medals`),u); await onRefresh(m.uid); }}>🗑️</button>}
                    </div>
                  </div>
                );
              })}
              {awards.map((aw, i) => {
                const icon = aw.type==="golden_boot"?"⚽":aw.type==="golden_glove"?"🧤":aw.type==="ballon_dor"?"🌟":aw.type==="yashin"?"🏅":"👨‍💼";
                return (
                  <div key={i} className="rmr-title-item">
                    <div><div className="rmr-title-name">{icon} {aw.name}</div><div className="rmr-title-season">Season {aw.season}</div></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="rmr-title-pts">{aw.points.toFixed(1)} pts</div>
                      {isAdmin && <button className="rmr-btn-tiny danger" onClick={async () => { const u = awards.filter((_,j)=>j!==i); await set(ref(db,`career_rankings/${m.uid}/individualAwards`),u); await onRefresh(m.uid); }}>🗑️</button>}
                    </div>
                  </div>
                );
              })}
              {!trophies.length && !medals.length && !awards.length && <p style={{ color: T.dim, fontSize: fs.muted, fontStyle: "italic" }}>No titles yet</p>}
              {isAdmin && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <button className="rmr-add-btn" onClick={() => onModal("addTrophy")}>+ Trophy</button>
                  <button className="rmr-add-btn" onClick={() => onModal("addMedal")}>+ Medal</button>
                  <button className="rmr-add-btn" onClick={() => onModal("addAward")}>+ Award</button>
                  <button className="rmr-add-btn" onClick={() => onModal("slideshowManager")}>📸 Trophy Images</button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="rmr-section">
              <div className="rmr-section-title">📝 Description</div>
              {m.description
                ? <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 18, fontSize: fs.body, lineHeight: 1.8, color: T.muted, whiteSpace: "pre-wrap" }}>{m.description}</div>
                : <p style={{ color: T.dim, fontSize: fs.muted, fontStyle: "italic" }}>No description yet</p>
              }
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("editDescription")}>✏️ Edit Description</button>}
            </div>

            {/* Records */}
            <div className="rmr-section">
              <div className="rmr-section-title">📋 Records</div>
              {records.length > 0 ? records.map((r, i) => (
                <div key={i} className="rmr-record">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: fs.body, fontWeight: 600 }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: fs.muted, color: T.muted, marginTop: 3 }}>{r.description}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: T.pink, fontSize: "1.2rem", whiteSpace: "nowrap" }}>{r.value}</div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="rmr-btn-tiny" onClick={() => onModal("editRecord", { recordIdx: i })}>✏️</button>
                      <button className="rmr-btn-tiny danger" onClick={async () => { const u = records.filter((_,j)=>j!==i); await set(ref(db,`career_rankings/${m.uid}/records`),u); await onRefresh(m.uid); }}>🗑️</button>
                    </div>
                  )}
                </div>
              )) : <p style={{ color: T.dim, fontSize: fs.muted, fontStyle: "italic" }}>No records yet</p>}
              {isAdmin && <button className="rmr-add-btn" onClick={() => onModal("addRecord")}>+ Add Record</button>}
            </div>

            {/* Match history */}
            <div className="rmr-section">
              <div className="rmr-section-title">📅 Match History</div>
              {matchHistory.length > 0 ? matchHistory.map((mh, i) => (
                <div key={i} className="rmr-match">
                  <div className="rmr-match-team">{mh.home}</div>
                  <div className="rmr-match-center">
                    <div className="rmr-match-score">{mh.isForfeit ? "FF" : `${mh.homeScore} - ${mh.awayScore}`}</div>
                    <div className="rmr-match-tourn">{mh.tournament}</div>
                    <div className="rmr-match-md">S{mh.season} · MD {mh.md}</div>
                    {mh.isForfeit   && <span className="rmr-forfeit-tag">Forfeit</span>}
                    {mh.isNoContest && <span className="rmr-forfeit-tag" style={{ color: T.muted }}>No Contest</span>}
                  </div>
                  <div className="rmr-match-team away">{mh.away}</div>
                </div>
              )) : <p style={{ color: T.dim, fontSize: fs.muted, fontStyle: "italic" }}>No match history available</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── CLUB POPUP ─────────────────────────────────────────────────────────── */
function ClubPopup({ club, stats, loading, managers, onClose }) {
  const currentMgr  = managers.find(m => m.team === club.name);
  const prevMgrs    = managers.filter(m => m.tenures?.some(t => t.team === club.name && t.removedAt < Date.now() && m.team !== club.name));

  return (
    <div className="rmr-popup">
      <div className="rmr-popup-nav">
        <div className="rmr-popup-nav-title">{club.name}</div>
        <button className="rmr-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="rmr-popup-body">
        {/* Club badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 18, border: `2px solid ${T.borderPink}`, background: T.bg3, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {club.badge ? <img src={club.badge} alt={club.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "2.5rem" }}>🏟️</span>}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.5rem" }}>{club.name}</div>
            {club.bankrupt && <div style={{ color: "#f87171", fontSize: ".9rem", marginTop: 4 }}>🔴 Bankrupt</div>}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: `4px solid ${T.bg4}`, borderTop: `4px solid ${T.pink}`, animation: "rmrSpin 0.9s linear infinite", margin: "0 auto 20px" }} />
            <div style={{ color: T.muted, fontSize: "1rem" }}>Loading club data...</div>
          </div>
        ) : (
          <>
            {/* Managers */}
            <div className="rmr-section">
              <div className="rmr-section-title">👔 Management</div>
              <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16, marginBottom: 10 }}>
                <div style={{ fontSize: ".8rem", color: T.muted, marginBottom: 4, textTransform: "uppercase" }}>Current Manager</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.pink }}>{currentMgr?.username || "Unassigned"}</div>
              </div>
              {prevMgrs.length > 0 && (
                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16 }}>
                  <div style={{ fontSize: ".8rem", color: T.muted, marginBottom: 10, textTransform: "uppercase" }}>Previous Managers</div>
                  {prevMgrs.map((pm, i) => <div key={i} style={{ fontSize: "1rem", color: T.text, padding: "5px 0", borderBottom: i < prevMgrs.length-1 ? `1px solid ${T.border}` : "none" }}>{pm.username}</div>)}
                </div>
              )}
            </div>

            {/* Top performers */}
            <div className="rmr-section">
              <div className="rmr-section-title">⭐ All-Time Top Performers</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16 }}>
                  <div style={{ fontSize: ".8rem", color: T.muted, marginBottom: 6, textTransform: "uppercase" }}>Top Scorer</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.topScorer?.name || "—"}</div>
                  {stats?.topScorer && <div style={{ color: T.pink, fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem" }}>{stats.topScorer.count} ⚽</div>}
                </div>
                <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 16 }}>
                  <div style={{ fontSize: ".8rem", color: T.muted, marginBottom: 6, textTransform: "uppercase" }}>Top Assist</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.topAssist?.name || "—"}</div>
                  {stats?.topAssist && <div style={{ color: T.pink, fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem" }}>{stats.topAssist.count} 🎯</div>}
                </div>
              </div>
            </div>

            {/* Recent results */}
            <div className="rmr-section">
              <div className="rmr-section-title">📅 Recent Results</div>
              {stats?.results?.length > 0 ? stats.results.map((r, i) => (
                <div key={i} className="rmr-match">
                  <div className="rmr-match-team">{r.homeTeam}</div>
                  <div className="rmr-match-center">
                    <div className="rmr-match-score">{r.homeScore} - {r.awayScore}</div>
                    <div className="rmr-match-tourn">{r.tournament}</div>
                    <div className="rmr-match-md">Season {r.season}</div>
                  </div>
                  <div className="rmr-match-team away">{r.awayTeam}</div>
                </div>
              )) : <p style={{ color: T.dim, fontSize: ".9rem", fontStyle: "italic" }}>No results yet</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── MODAL ROUTER ───────────────────────────────────────────────────────── */
function ModalRouter({ modal, managers, isAdmin, onClose, showToast, onAdminLogin, adminKeyInput, setAdminKeyInput, onRefresh, saveRankField, db, popupData, onReopenPopup }) {
  const [form, setForm]       = useState({});
  const [uploading, setUploading] = useState(false);
  const fileRef               = useRef(null);

  const uid     = modal.uid || popupData?.uid;
  const manager = managers.find(m => m.uid === uid);

  async function refresh() {
    await onRefresh(uid);
    if (popupData) onReopenPopup(manager);
  }

  if (modal.type === "adminLogin") return (
    <Modal title="Admin Login" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={onAdminLogin}>Login</button></>}>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Admin Key</label>
        <input className="rmr-input" type="password" value={adminKeyInput} onChange={e => setAdminKeyInput(e.target.value)} placeholder="Enter admin key" onKeyDown={e => e.key === "Enter" && onAdminLogin()} />
      </div>
    </Modal>
  );

  if (modal.type === "rankingMethod") return (
    <Modal title="Ranking Method" onClose={onClose} footer={<button className="rmr-btn-pink" onClick={onClose}>Got it</button>}>
      <div className="rmr-rank-info">
        <p><strong style={{ color: T.pink }}>Total Score</strong> = (Performance + Trophy + Medal + Award Points) × 2</p>
        <h4>Performance Points</h4>
        <ul><li>Win: +1 pt</li><li>Loss: -1 pt</li><li>Goal Scored: +0.5 pts</li><li>Goal Conceded: -0.5 pts</li></ul>
        <h4>Trophy Points</h4>
        <ul>{TROPHY_LIST.map(t => <li key={t.id}>{t.name}: {t.points} pts</li>)}</ul>
        <h4>Stats are tenure-aware</h4>
        <p>Only results submitted while a manager was at a club count toward their stats.</p>
      </div>
    </Modal>
  );

  if (modal.type === "editStatus") return (
    <Modal title="Edit Manager Status" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async () => { await saveRankField(uid, { overrideStatus: form.status || modal.cur }); await refresh(); onClose(); showToast("Status updated"); }}>Save</button></>}>
      <div style={{ marginBottom: 16 }}>
        <label className="rmr-label">Status</label>
        <select className="rmr-select" defaultValue={modal.cur || "active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="active">Active Manager</option>
          <option value="interim">Interim Manager</option>
          <option value="sacked">Sacked</option>
          <option value="retired">Retired</option>
          <option value="free-agent">Free Agent</option>
        </select>
      </div>
    </Modal>
  );

  if (modal.type === "addTrophy") return (
    <Modal title="Add Trophy" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async () => { if (!form.trophyId || !form.season) { showToast("Fill all fields"); return; } const t = TROPHY_LIST.find(x => x.id === form.trophyId); const u = [...(manager?.trophies||[]), { id: t.id, name: t.name, points: t.points, season: form.season }]; await set(ref(db,`career_rankings/${uid}/trophies`),u); await refresh(); onClose(); showToast("Trophy added"); }}>Add</button></>}>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Competition</label><select className="rmr-select" value={form.trophyId||""} onChange={e => setForm(f=>({...f,trophyId:e.target.value}))}><option value="">Select</option>{TROPHY_LIST.map(t=><option key={t.id} value={t.id}>{t.name} ({t.points} pts)</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Season</label><input className="rmr-input" placeholder="e.g. 3" value={form.season||""} onChange={e=>setForm(f=>({...f,season:e.target.value}))} /></div>
    </Modal>
  );

  if (modal.type === "addMedal") return (
    <Modal title="Add Medal" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async () => { if (!form.trophyId||!form.medalType||!form.season){showToast("Fill all fields");return;} const t=TROPHY_LIST.find(x=>x.id===form.trophyId); let pts=t.points/2; if(form.medalType==="silver")pts=pts/2; if(form.medalType==="bronze")pts=pts/4; const u=[...(manager?.medals||[]),{trophyId:t.id,name:t.name,type:form.medalType,points:pts,season:form.season}]; await set(ref(db,`career_rankings/${uid}/medals`),u); await refresh(); onClose(); showToast("Medal added"); }}>Add</button></>}>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Competition</label><select className="rmr-select" value={form.trophyId||""} onChange={e=>setForm(f=>({...f,trophyId:e.target.value}))}><option value="">Select</option>{TROPHY_LIST.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Medal Type</label><select className="rmr-select" value={form.medalType||""} onChange={e=>setForm(f=>({...f,medalType:e.target.value}))}><option value="">Select</option><option value="gold">🥇 Gold</option><option value="silver">🥈 Silver</option><option value="bronze">🥉 Bronze</option></select></div>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Season</label><input className="rmr-input" placeholder="e.g. 3" value={form.season||""} onChange={e=>setForm(f=>({...f,season:e.target.value}))} /></div>
    </Modal>
  );

  if (modal.type === "addAward") return (
    <Modal title="Add Individual Award" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async () => { if(!form.awardType||!form.season){showToast("Fill all fields");return;} let pts=0,name=""; if(form.awardType==="golden_boot"||form.awardType==="golden_glove"){if(!form.trophyId){showToast("Select competition");return;} const t=TROPHY_LIST.find(x=>x.id===form.trophyId); pts=t.points/2; name=`${t.name} ${form.awardType==="golden_boot"?"Golden Boot":"Golden Glove"}`;} else if(form.awardType==="ballon_dor"){pts=50;name="Ballon d'Or";} else if(form.awardType==="yashin"){pts=45;name="Yashin Trophy";} else if(form.awardType==="manager_of_season"){pts=50;name="Manager of the Season";} const u=[...(manager?.individualAwards||[]),{type:form.awardType,name,points:pts,season:form.season}]; await set(ref(db,`career_rankings/${uid}/individualAwards`),u); await refresh(); onClose(); showToast("Award added"); }}>Add</button></>}>
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Award Type</label><select className="rmr-select" value={form.awardType||""} onChange={e=>setForm(f=>({...f,awardType:e.target.value}))}><option value="">Select</option><option value="golden_boot">⚽ Golden Boot</option><option value="golden_glove">🧤 Golden Glove</option><option value="ballon_dor">🌟 Ballon d'Or (50 pts)</option><option value="yashin">🏅 Yashin Trophy (45 pts)</option><option value="manager_of_season">👨‍💼 Manager of the Season (50 pts)</option></select></div>
      {(form.awardType==="golden_boot"||form.awardType==="golden_glove")&&<div style={{marginBottom:16}}><label className="rmr-label">Competition</label><select className="rmr-select" value={form.trophyId||""} onChange={e=>setForm(f=>({...f,trophyId:e.target.value}))}><option value="">Select</option>{TROPHY_LIST.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
      <div style={{ marginBottom: 16 }}><label className="rmr-label">Season</label><input className="rmr-input" placeholder="e.g. 3" value={form.season||""} onChange={e=>setForm(f=>({...f,season:e.target.value}))} /></div>
    </Modal>
  );

  if (modal.type === "editDescription") return (
    <Modal title="Edit Description" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async ()=>{await saveRankField(uid,{description:form.description??""}); await refresh(); onClose(); showToast("Saved");}}>Save</button></>}>
      <div style={{marginBottom:16}}><label className="rmr-label">Description</label><textarea className="rmr-textarea" defaultValue={manager?.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
    </Modal>
  );

  if (modal.type === "addRecord" || modal.type === "editRecord") {
    const editing = modal.type === "editRecord";
    const existing = editing ? (manager?.records||[])[modal.recordIdx] : null;
    return (
      <Modal title={editing?"Edit Record":"Add Record"} onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-pink" onClick={async ()=>{ const name=form.recName??existing?.name??""; const value=form.recValue??existing?.value??""; const desc=form.recDesc??existing?.description??""; if(!name||!value){showToast("Name and value required");return;} const recs=[...(manager?.records||[])]; const rec={name,value,description:desc}; if(editing)recs[modal.recordIdx]=rec; else recs.push(rec); await set(ref(db,`career_rankings/${uid}/records`),recs); await refresh(); onClose(); showToast("Record saved"); }}>Save</button></>}>
        <div style={{marginBottom:16}}><label className="rmr-label">Record Name</label><input className="rmr-input" placeholder="e.g. Most Wins in a Row" defaultValue={existing?.name||""} onChange={e=>setForm(f=>({...f,recName:e.target.value}))} /></div>
        <div style={{marginBottom:16}}><label className="rmr-label">Value</label><input className="rmr-input" placeholder="e.g. 10" defaultValue={existing?.value||""} onChange={e=>setForm(f=>({...f,recValue:e.target.value}))} /></div>
        <div style={{marginBottom:16}}><label className="rmr-label">Description (optional)</label><textarea className="rmr-textarea" defaultValue={existing?.description||""} onChange={e=>setForm(f=>({...f,recDesc:e.target.value}))} /></div>
      </Modal>
    );
  }

  if (modal.type === "manualStats") {
    const s = manager?.stats || {};
    return (
      <Modal title="Edit Stats Manually" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Cancel</button><button className="rmr-btn-ghost" onClick={async()=>{await set(ref(db,`career_rankings/${uid}/manualStats`),null); await refresh(); onClose(); showToast("Reset to auto");}}>Reset to Auto</button><button className="rmr-btn-pink" onClick={async()=>{ const keys=["w","d","l","mp","gs","gc","fw","fl"]; const ms={}; keys.forEach(k=>ms[k]=parseInt(form[k]??s[k]??0)||0); ms.gd=ms.gs-ms.gc; const g=ms.w+ms.d+ms.l; ms.winRate=g>0?+((ms.w/g)*100).toFixed(1):0; ms.lossRate=g>0?+((ms.l/g)*100).toFixed(1):0; await saveRankField(uid,{manualStats:ms}); await refresh(); onClose(); showToast("Stats saved"); }}>Save</button></>}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[["w","Wins"],["d","Draws"],["l","Losses"],["mp","Matches Played"],["gs","Goals Scored"],["gc","Goals Conceded"],["fw","Forfeit Wins"],["fl","Forfeit Losses"]].map(([k,label])=>(
            <div key={k} style={{marginBottom:8}}><label className="rmr-label">{label}</label><input className="rmr-input" type="number" min="0" defaultValue={s[k]||0} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
          ))}
        </div>
      </Modal>
    );
  }

  if (modal.type === "slideshowManager") {
    const imgs = manager?.trophyCabinet?.slideshow?.images || [];
    const dur  = (manager?.trophyCabinet?.slideshow?.duration || 3000) / 1000;
    return (
      <Modal title="Trophy Cabinet Images" onClose={onClose} footer={<><button className="rmr-btn-ghost" onClick={onClose}>Close</button><button className="rmr-btn-ghost" onClick={async()=>{ const d=parseFloat(form.slideDur??dur)*1000; await set(ref(db,`career_rankings/${uid}/trophyCabinet/slideshow/duration`),d); await refresh(); showToast("Duration saved"); }}>Save Duration</button><button className="rmr-btn-pink" disabled={uploading} onClick={async()=>{ const file=fileRef.current?.files[0]; if(!file){showToast("Select an image");return;} setUploading(true); try{const url=await uploadToImgBB(file); const u=[...imgs,url]; await set(ref(db,`career_rankings/${uid}/trophyCabinet/slideshow/images`),u); await refresh(); showToast("Uploaded");}catch{showToast("Upload failed");} setUploading(false); }}>{uploading?"Uploading...":"Upload"}</button></>}>
        <div style={{marginBottom:12}}>
          {imgs.map((url,i)=>(
            <div key={i} className="rmr-thumb"><img src={url} alt="" /><button className="rmr-thumb-del" onClick={async()=>{ const u=imgs.filter((_,j)=>j!==i); await set(ref(db,`career_rankings/${uid}/trophyCabinet/slideshow/images`),u); await refresh(); showToast("Removed"); }}>✕</button></div>
          ))}
          {!imgs.length && <p style={{color:T.dim,fontSize:".85rem"}}>No images yet</p>}
        </div>
        <div style={{marginBottom:16}}><label className="rmr-label">Upload Image</label><input type="file" ref={fileRef} accept="image/*" style={{marginTop:8,color:T.muted,fontSize:".85rem"}} /></div>
        <div style={{marginBottom:16}}><label className="rmr-label">Duration (seconds)</label><input className="rmr-input" type="number" min="1" max="10" step="0.5" defaultValue={dur} onChange={e=>setForm(f=>({...f,slideDur:e.target.value}))} /></div>
      </Modal>
    );
  }

  return null;
}
