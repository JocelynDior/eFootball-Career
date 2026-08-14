import { db, PATHS } from '../firebase';
import { ref, get, set } from 'firebase/database';

export async function applyResultToTable(league, season, homeTeam, awayTeam, homeScore, awayScore, forfeitType) {
  const tableRef = ref(db, PATHS.table(league, season));
  const snap = await get(tableRef);
  const tableVal = snap.val() || {};

  function findTeam(name) {
    for (const [key, val] of Object.entries(tableVal)) {
      if (val.name === name) return { key, data: { ...val } };
    }
    return null;
  }

  const homeEntry = findTeam(homeTeam);
  const awayEntry = findTeam(awayTeam);
  if (!homeEntry || !awayEntry) return;

  const hd = homeEntry.data;
  const ad = awayEntry.data;

  if (forfeitType === 'no_contest') {
    hd.p = (hd.p || 0) + 1; hd.l = (hd.l || 0) + 1;
    ad.p = (ad.p || 0) + 1; ad.l = (ad.l || 0) + 1;
  } else if (forfeitType === 'forfeit_win') {
    hd.p = (hd.p || 0) + 1; hd.w = (hd.w || 0) + 1; hd.pts = (hd.pts || 0) + 3;
    ad.p = (ad.p || 0) + 1; ad.l = (ad.l || 0) + 1; ad.gd = (ad.gd || 0) - 3;
  } else {
    hd.p = (hd.p || 0) + 1; hd.gs = (hd.gs || 0) + homeScore; hd.gc = (hd.gc || 0) + awayScore; hd.gd = (hd.gd || 0) + (homeScore - awayScore);
    ad.p = (ad.p || 0) + 1; ad.gs = (ad.gs || 0) + awayScore; ad.gc = (ad.gc || 0) + homeScore; ad.gd = (ad.gd || 0) + (awayScore - homeScore);
    if (homeScore > awayScore) { hd.w = (hd.w || 0) + 1; hd.pts = (hd.pts || 0) + 3; ad.l = (ad.l || 0) + 1; }
    else if (homeScore < awayScore) { ad.w = (ad.w || 0) + 1; ad.pts = (ad.pts || 0) + 3; hd.l = (hd.l || 0) + 1; }
    else { hd.d = (hd.d || 0) + 1; hd.pts = (hd.pts || 0) + 1; ad.d = (ad.d || 0) + 1; ad.pts = (ad.pts || 0) + 1; }
  }

  await set(ref(db, `${PATHS.table(league, season)}/${homeEntry.key}`), hd);
  await set(ref(db, `${PATHS.table(league, season)}/${awayEntry.key}`), ad);
}

export async function reverseResultFromTable(league, season, homeTeam, awayTeam, homeScore, awayScore, forfeitType) {
  const tableRef = ref(db, PATHS.table(league, season));
  const snap = await get(tableRef);
  const tableVal = snap.val() || {};

  function findTeam(name) {
    for (const [key, val] of Object.entries(tableVal)) {
      if (val.name === name) return { key, data: { ...val } };
    }
    return null;
  }

  const homeEntry = findTeam(homeTeam);
  const awayEntry = findTeam(awayTeam);
  if (!homeEntry || !awayEntry) return;

  const hd = homeEntry.data;
  const ad = awayEntry.data;

  if (forfeitType === 'no_contest') {
    hd.p = Math.max(0, (hd.p || 0) - 1); hd.l = Math.max(0, (hd.l || 0) - 1);
    ad.p = Math.max(0, (ad.p || 0) - 1); ad.l = Math.max(0, (ad.l || 0) - 1);
  } else if (forfeitType === 'forfeit_win') {
    hd.p = Math.max(0, (hd.p || 0) - 1); hd.w = Math.max(0, (hd.w || 0) - 1); hd.pts = Math.max(0, (hd.pts || 0) - 3);
    ad.p = Math.max(0, (ad.p || 0) - 1); ad.l = Math.max(0, (ad.l || 0) - 1); ad.gd = (ad.gd || 0) + 3;
  } else {
    hd.p = Math.max(0, (hd.p || 0) - 1); hd.gs = Math.max(0, (hd.gs || 0) - homeScore); hd.gc = Math.max(0, (hd.gc || 0) - awayScore); hd.gd = (hd.gd || 0) - (homeScore - awayScore);
    ad.p = Math.max(0, (ad.p || 0) - 1); ad.gs = Math.max(0, (ad.gs || 0) - awayScore); ad.gc = Math.max(0, (ad.gc || 0) - homeScore); ad.gd = (ad.gd || 0) - (awayScore - homeScore);
    if (homeScore > awayScore) { hd.w = Math.max(0, (hd.w || 0) - 1); hd.pts = Math.max(0, (hd.pts || 0) - 3); ad.l = Math.max(0, (ad.l || 0) - 1); }
    else if (homeScore < awayScore) { ad.w = Math.max(0, (ad.w || 0) - 1); ad.pts = Math.max(0, (ad.pts || 0) - 3); hd.l = Math.max(0, (hd.l || 0) - 1); }
    else { hd.d = Math.max(0, (hd.d || 0) - 1); hd.pts = Math.max(0, (hd.pts || 0) - 1); ad.d = Math.max(0, (ad.d || 0) - 1); ad.pts = Math.max(0, (ad.pts || 0) - 1); }
  }

  await set(ref(db, `${PATHS.table(league, season)}/${homeEntry.key}`), hd);
  await set(ref(db, `${PATHS.table(league, season)}/${awayEntry.key}`), ad);
}
