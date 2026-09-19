// LEAGUE keys (as used in each page's `const LEAGUE = "..."`) that use the
// knockout-style Submit Result flow: free opponent pick + stage instead of
// a scheduled-fixture pick + matchday number.
export const CUP_LEAGUES = new Set([
  "facup", "copadelrey", "coppaitalia", "dfbpokal", "coupesdefrance",
  "clubworldcup", "champions", "europa",
]);

// The 5 domestic leagues whose rosters make up the opponent pool for cups.
export const DOMESTIC_LEAGUE_KEYS = ["premier", "laliga", "seriea", "bundesliga", "ligue1"];

// Every leg treated as its own separate stage option.
export const CUP_STAGES = [
  "Group Stage",
  "League Phase",
  "Round of 32 – 1st Leg",
  "Round of 32 – 2nd Leg",
  "Round of 16 – 1st Leg",
  "Round of 16 – 2nd Leg",
  "Quarter-Final – 1st Leg",
  "Quarter-Final – 2nd Leg",
  "Semi-Final – 1st Leg",
  "Semi-Final – 2nd Leg",
  "Play-off – 1st Leg",
  "Play-off – 2nd Leg",
  "Final",
];
