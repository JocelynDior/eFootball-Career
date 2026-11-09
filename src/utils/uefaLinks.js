// ─────────────────────────────────────────────────────────────────────────────
// UEFA team linking (Champions League, Europa League, Conference League only)
//
// A link means:  "this TABLE team takes its stats from THAT team's results".
//   Link format:  { "<table team name>": "<team whose results it uses>" }
//   e.g.  { "Barcelona": "Real Madrid" }
//         → the Barcelona row is built from Real Madrid's results only.
//         → a Barcelona manager submits results AS Real Madrid.
//
// A table team with no link simply uses its own name, like every other league.
// ─────────────────────────────────────────────────────────────────────────────

export const UEFA_LEAGUES = new Set(["champions", "europa", "conference"]);
export const isUefaLeague = (league) => UEFA_LEAGUES.has(league);

// Same comparison the original table logic uses: ignore capitals and extra spaces.
export const normName = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

export const linksPath = (league) => `career_${league}_settings/teamLinks`;

// ── Firebase-safe keys ───────────────────────────────────────────────────────
// Realtime Database keys can't contain  .  $  #  [  ]  /   — a team called
// "St. Pauli" used to make the whole links save fail. Keys are escaped when
// written and unescaped when read. Names without those characters are stored
// exactly as before.
const ESCAPES = { ".": "%2E", "$": "%24", "#": "%23", "[": "%5B", "]": "%5D", "/": "%2F", "%": "%25" };
export const encodeLinkKey = (s) => String(s ?? "").replace(/[.$#[\]/%]/g, (c) => ESCAPES[c]);
export const decodeLinkKey = (s) =>
  String(s ?? "").replace(/%(2E|24|23|5B|5D|2F|25)/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Raw Firebase value → { tableTeam: linkedTeam }  (keys unescaped, blanks dropped). */
export function decodeUefaLinks(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (typeof v !== "string" || !v.trim()) continue;
    out[decodeLinkKey(k)] = v;
  }
  return out;
}

/** { tableTeam: linkedTeam } → object that is safe to write to Firebase. */
export function encodeUefaLinks(links) {
  const out = {};
  for (const [k, v] of Object.entries(links || {})) {
    if (typeof v !== "string" || !v.trim()) continue;
    out[encodeLinkKey(k)] = v;
  }
  return out;
}

/**
 * The name whose results this team uses.
 * Linked team → the team it's linked to.  No link → its own name.
 */
export function effectiveTeamName(team, links) {
  const n = normName(team);
  if (!n) return team || "";
  for (const [k, v] of Object.entries(links || {})) {
    if (v && normName(k) === n) return v;
  }
  return team;
}
