// ─────────────────────────────────────────────────────────────────────────────
// UEFA team linking (Champions League, Europa League, Conference League only)
//
// A table team can be linked to ONE OR MORE other teams.
//   { "Barcelona": ["Real Madrid", "PSG"] }
// The table team then takes its stats from the results of ALL its linked teams,
// added together. Capitals never matter: "REAL MADRID" and "Real Madrid" are the
// same team. A table team with no links uses its own results, as normal.
//
// Stored at  career_<league>_settings/uefaTeamLinks  — a separate path, so the
// original teamLinks data and the code that reads it are not affected.
// ─────────────────────────────────────────────────────────────────────────────

export const UEFA_LEAGUES = new Set(["champions", "europa", "conference"]);
export const isUefaLeague = (league) => UEFA_LEAGUES.has(league);

// Same comparison the original table logic uses: ignore capitals and extra spaces.
export const normName = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

export const linksPath = (league) => `career_${league}_settings/uefaTeamLinks`;

// ── Firebase-safe keys ───────────────────────────────────────────────────────
// Realtime Database keys can't contain  .  $  #  [  ]  /   (e.g. "St. Pauli").
// The table team's name is a key, so it is escaped when written and unescaped
// when read. Linked team names are values, so they are stored as typed.
const ESCAPES = { ".": "%2E", "$": "%24", "#": "%23", "[": "%5B", "]": "%5D", "/": "%2F", "%": "%25" };
export const encodeLinkKey = (s) => String(s ?? "").replace(/[.$#[\]/%]/g, (c) => ESCAPES[c]);
export const decodeLinkKey = (s) =>
  String(s ?? "").replace(/%(2E|24|23|5B|5D|2F|25)/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// Removes blanks and repeats (case-insensitive), keeps the first spelling.
function cleanNames(list) {
  const seen = new Set(), out = [];
  for (const n of list) {
    if (typeof n !== "string" || !n.trim()) continue;
    const k = normName(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

/** Raw Firebase value → { tableTeam: [linkedTeam, ...] }  (keys unescaped, empties dropped). */
export function decodeUefaLinks(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const list = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : typeof v === "string" ? [v] : [];
    const names = cleanNames(list);
    if (names.length) out[decodeLinkKey(k)] = names;
  }
  return out;
}

/** { tableTeam: [linkedTeam, ...] } → object that is safe to write to Firebase. */
export function encodeUefaLinks(links) {
  const out = {};
  for (const [k, v] of Object.entries(links || {})) {
    const names = cleanNames(Array.isArray(v) ? v : []);
    if (names.length) out[encodeLinkKey(k)] = names;
  }
  return out;
}

/** The teams linked to `team` (case-insensitive lookup). Empty array = no links. */
export function linkedNamesFor(team, links) {
  const n = normName(team);
  if (!n) return [];
  for (const [k, v] of Object.entries(links || {})) {
    if (normName(k) === n) return Array.isArray(v) ? v : [];
  }
  return [];
}
