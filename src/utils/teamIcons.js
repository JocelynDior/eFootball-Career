// ─── Hardcoded local team icon mappings ───────────────────────────────────────
// All lookups are case-insensitive. Aliases are included for common variations.

const TEAM_ICONS = {
  // ── Premier League ──────────────────────────────────────────────────────────
  "manchester city":    "/images/teams/premierleague/IMG-20260830-022118.png",
  "man city":           "/images/teams/premierleague/IMG-20260830-022118.png",

  "chelsea":            "/images/teams/premierleague/IMG-20260830-022433.png",

  "everton":            "/images/teams/premierleague/IMG-20260830-022701.png",

  "manchester united":  "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",
  "man united":         "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",
  "man utd":            "/images/teams/premierleague/images-2026-08-30-T021642-259-removebg-preview.png",

  "arsenal":            "/images/teams/premierleague/images-2026-08-30-T021741-471-removebg-preview-edit-217721579762608.png",

  "liverpool":          "/images/teams/premierleague/images-2026-08-30-T022220-427-removebg-preview.png",

  "newcastle":          "/images/teams/premierleague/images-2026-08-30-T022319-663-removebg-preview.png",
  "newcastle united":   "/images/teams/premierleague/images-2026-08-30-T022319-663-removebg-preview.png",

  "brighton":           "/images/teams/premierleague/images-2026-08-30-T022902-880-removebg-preview-edit-218356746144282.png",
  "brighton & hove albion": "/images/teams/premierleague/images-2026-08-30-T022902-880-removebg-preview-edit-218356746144282.png",

  "aston villa":        "/images/teams/premierleague/images-2026-08-30-T022949-458-removebg-preview.png",

  "tottenham hotspurs": "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "tottenham hotspur":  "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "tottenham":          "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",
  "spurs":              "/images/teams/premierleague/images-2026-08-30-T023258-977-removebg-preview-edit-218536483394776.png",

  // ── La Liga ─────────────────────────────────────────────────────────────────
  "real madrid":        "/images/teams/laliga/IMG-20260830-025531-removebg-preview.png",

  "atletico madrid":    "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",
  "atlético madrid":    "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",
  "atletico":           "/images/teams/laliga/images-2026-08-29-T011255-180-removebg-preview.png",

  "real sociedad":      "/images/teams/laliga/images-2026-08-30-T025758-363-removebg-preview.png",

  "valencia":           "/images/teams/laliga/images-2026-08-30-T025815-617-removebg-preview.png",

  "athletic club":      "/images/teams/laliga/images-2026-08-30-T030227-753-removebg-preview.png",
  "athletic bilbao":    "/images/teams/laliga/images-2026-08-30-T030227-753-removebg-preview.png",

  "villarreal":         "/images/teams/laliga/images-2026-08-30-T030245-701-removebg-preview.png",

  "real betis":         "/images/teams/laliga/images-2026-08-30-T030303-244-removebg-preview-edit-220485449764270.png",

  "barcelona":          "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",
  "fc barcelona":       "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",
  "barca":              "/images/teams/laliga/images-2026-08-30-T030727-157-removebg-preview-edit-220649258206953.png",

  "celta vigo":         "/images/teams/laliga/images-2026-08-30-T030757-223-removebg-preview.png",
  "celta de vigo":      "/images/teams/laliga/images-2026-08-30-T030757-223-removebg-preview.png",

  "sevilla":            "/images/teams/laliga/images-2026-08-30-T030819-910-removebg-preview.png",
  "sevilla fc":         "/images/teams/laliga/images-2026-08-30-T030819-910-removebg-preview.png",

  // ── Serie A ──────────────────────────────────────────────────────────────────
  "atalanta":           "/images/teams/seriaa/hd-atalanta-bc-official-logo-transparent-background-701751712234879oi9o3dtpeo_edit_16725871760987-removebg-preview.png",
  "atalanta bc":        "/images/teams/seriaa/hd-atalanta-bc-official-logo-transparent-background-701751712234879oi9o3dtpeo_edit_16725871760987-removebg-preview.png",

  "juventus":           "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",
  "juventus fc":        "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",
  "juve":               "/images/teams/seriaa/images_-_2026-09-04T145755.021-removebg-preview_edit_16453440944362.png",

  "inter milan":        "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "inter":              "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "internazionale":     "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "fc internazionale":  "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",
  "fc internazionale milano": "/images/teams/seriaa/images_-_2026-09-04T145851.064-removebg-preview.png",

  "napoli":             "/images/teams/seriaa/images_-_2026-09-04T150010.376-removebg-preview_edit_16464264371965.png",
  "ssc napoli":         "/images/teams/seriaa/images_-_2026-09-04T150010.376-removebg-preview_edit_16464264371965.png",

  "as roma":            "/images/teams/seriaa/images_-_2026-09-04T150023.812-removebg-preview.png",
  "roma":               "/images/teams/seriaa/images_-_2026-09-04T150023.812-removebg-preview.png",

  "como 1907":          "/images/teams/seriaa/images_-_2026-09-04T150038.595-removebg-preview.png",
  "como":               "/images/teams/seriaa/images_-_2026-09-04T150038.595-removebg-preview.png",

  "fiorentina":         "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",
  "acf fiorentina":     "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",
  "florentino":         "/images/teams/seriaa/images_-_2026-09-04T150400.224-removebg-preview_edit_16528300870392.png",

  "lazio":              "/images/teams/seriaa/images_-_2026-09-04T150416.234-removebg-preview.png",
  "ss lazio":           "/images/teams/seriaa/images_-_2026-09-04T150416.234-removebg-preview.png",

  "torino":             "/images/teams/seriaa/images_-_2026-09-04T150430.736-removebg-preview_edit_16485126994878.png",
  "torino fc":          "/images/teams/seriaa/images_-_2026-09-04T150430.736-removebg-preview_edit_16485126994878.png",

  "ac milan":           "/images/teams/seriaa/logo-acmilan-removebg-preview_edit_16475068739151.png",
  "milan":              "/images/teams/seriaa/logo-acmilan-removebg-preview_edit_16475068739151.png",
};

/**
 * Returns the local icon path for a team name, or null if not found.
 * Lookup is fully case-insensitive.
 */
export function getTeamIcon(teamName) {
  if (!teamName) return null;
  return TEAM_ICONS[teamName.toLowerCase()] || null;
}
