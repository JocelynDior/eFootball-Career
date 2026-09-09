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
    hd.p   = (hd.p  || 0) + 1;
    hd.l   = (hd.l  || 0) + 1;
    ad.p   = (ad.p  || 0) + 1;
    ad.l   = (ad.l  || 0) + 1;
    // GS / GC / GD unchanged — no goals scored in a no-contest
  } else if (forfeitType === 'forfeit_win') {
    // homeTeam is always the forfeit winner (caller must pass winner as homeTeam)
    hd.p   = (hd.p   || 0) + 1;
    hd.w   = (hd.w   || 0) + 1;
    hd.pts = (hd.pts  || 0) + 3;
    hd.gs  = (hd.gs   || 0) + 3;
    // gc unchanged — winner concedes 0
    hd.gd  = (hd.gd   || 0) + 3;

    ad.p   = (ad.p   || 0) + 1;
    ad.l   = (ad.l   || 0) + 1;
    ad.gc  = (ad.gc   || 0) + 3;
    // gs unchanged — loser scores 0
    ad.gd  = (ad.gd   || 0) - 3;
  } else {
    // Normal match
    const hScore = Number(homeScore);
    const aScore = Number(awayScore);

    hd.p   = (hd.p  || 0) + 1;
    hd.gs  = (hd.gs  || 0) + hScore;
    hd.gc  = (hd.gc  || 0) + aScore;
    hd.gd  = (hd.gd  || 0) + (hScore - aScore);

    ad.p   = (ad.p  || 0) + 1;
    ad.gs  = (ad.gs  || 0) + aScore;
    ad.gc  = (ad.gc  || 0) + hScore;
    ad.gd  = (ad.gd  || 0) + (aScore - hScore);

    if (hScore > aScore) {
      hd.w   = (hd.w  || 0) + 1;
      hd.pts = (hd.pts || 0) + 3;
      ad.l   = (ad.l  || 0) + 1;
    } else if (hScore < aScore) {
      ad.w   = (ad.w  || 0) + 1;
      ad.pts = (ad.pts || 0) + 3;
      hd.l   = (hd.l  || 0) + 1;
    } else {
      hd.d   = (hd.d  || 0) + 1;
      hd.pts = (hd.pts || 0) + 1;
      ad.d   = (ad.d  || 0) + 1;
      ad.pts = (ad.pts || 0) + 1;
    }
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
    hd.p = Math.max(0, (hd.p || 0) - 1);
    hd.l = Math.max(0, (hd.l || 0) - 1);
    ad.p = Math.max(0, (ad.p || 0) - 1);
    ad.l = Math.max(0, (ad.l || 0) - 1);
  } else if (forfeitType === 'forfeit_win') {
    hd.p   = Math.max(0, (hd.p   || 0) - 1);
    hd.w   = Math.max(0, (hd.w   || 0) - 1);
    hd.pts = Math.max(0, (hd.pts  || 0) - 3);
    hd.gs  = Math.max(0, (hd.gs   || 0) - 3);
    hd.gd  = (hd.gd  || 0) - 3;

    ad.p   = Math.max(0, (ad.p   || 0) - 1);
    ad.l   = Math.max(0, (ad.l   || 0) - 1);
    ad.gc  = Math.max(0, (ad.gc   || 0) - 3);
    ad.gd  = (ad.gd  || 0) + 3;
  } else {
    const hScore = Number(homeScore);
    const aScore = Number(awayScore);

    hd.p   = Math.max(0, (hd.p  || 0) - 1);
    hd.gs  = Math.max(0, (hd.gs  || 0) - hScore);
    hd.gc  = Math.max(0, (hd.gc  || 0) - aScore);
    hd.gd  = (hd.gd  || 0) - (hScore - aScore);

    ad.p   = Math.max(0, (ad.p  || 0) - 1);
    ad.gs  = Math.max(0, (ad.gs  || 0) - aScore);
    ad.gc  = Math.max(0, (ad.gc  || 0) - hScore);
    ad.gd  = (ad.gd  || 0) - (aScore - hScore);

    if (hScore > aScore) {
      hd.w   = Math.max(0, (hd.w  || 0) - 1);
      hd.pts = Math.max(0, (hd.pts || 0) - 3);
      ad.l   = Math.max(0, (ad.l  || 0) - 1);
    } else if (hScore < aScore) {
      ad.w   = Math.max(0, (ad.w  || 0) - 1);
      ad.pts = Math.max(0, (ad.pts || 0) - 3);
      hd.l   = Math.max(0, (hd.l  || 0) - 1);
    } else {
      hd.d   = Math.max(0, (hd.d  || 0) - 1);
      hd.pts = Math.max(0, (hd.pts || 0) - 1);
      ad.d   = Math.max(0, (ad.d  || 0) - 1);
      ad.pts = Math.max(0, (ad.pts || 0) - 1);
    }
  }

  await set(ref(db, `${PATHS.table(league, season)}/${homeEntry.key}`), hd);
  await set(ref(db, `${PATHS.table(league, season)}/${awayEntry.key}`), ad);
}
