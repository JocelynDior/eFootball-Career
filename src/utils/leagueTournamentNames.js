// Maps each page's LEAGUE key to the lowercase tournament name used in the
// calendar (career_calendarEvents → tournaments[].name). Names come from the
// TOURNAMENT_OPTIONS list in AdminCalendarPage, matched with .includes().
export const LEAGUE_TOURNAMENT_NAMES = {
  premier:        "premier league",
  laliga:         "la liga",
  seriea:         "serie a",
  bundesliga:     "bundesliga",
  ligue1:         "ligue 1",
  champions:      "champions league",
  europa:         "europa league",
  clubworldcup:   "club world cup",
  facup:          "fa cup",
  copadelrey:     "copa del rey",
  coppaitalia:    "coppa italia",
  dfbpokal:       "dfb pokal",
  coupesdefrance: "coupe de france",
};

// Falls back to the key with underscores turned into spaces (e.g. "premier_league")
export function getTournamentKey(league) {
  return LEAGUE_TOURNAMENT_NAMES[league] || String(league || "").replace(/_/g, " ");
}
