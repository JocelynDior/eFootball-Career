// ─────────────────────────────────────────────────────────────────────────────
// Stage handling for Champions League / Europa League / Conference League.
//
//  • League Phase (default): results use calendar fixtures and update the table.
//  • Knockout:  results are saved with a `stage` tag (taken from the calendar) and
//    do NOT touch the table, Auto Calculate, or table form. Goals and assists
//    still count towards Top Scorers / Top Assists.
//
// The mode (and the stage image) live at  career_<league>_settings/uefaStage
//   { mode: "league" | "knockout", imageUrl: "" }
// ─────────────────────────────────────────────────────────────────────────────

// Same wording as the calendar's Stage dropdown (no Round of 16 for these competitions).
export const UEFA_STAGES = [
  "Play-off 1st Leg",
  "Play-off 2nd Leg",
  "Quarter Final 1st Leg",
  "Quarter Final 2nd Leg",
  "Semi Final 1st Leg",
  "Semi Final 2nd Leg",
  "Final",
];

// The five domestic cups share the knockout flow. They have NO league phase — only
// Quarter Final → Final — so they are always in Knockout mode and have no table.
export const CUP_LEAGUE_KEYS = new Set(["facup", "copadelrey", "coppaitalia", "dfbpokal", "coupesdefrance"]);
export const isDomesticCup = (league) => CUP_LEAGUE_KEYS.has(league);

export const CUP_STAGES_FALLBACK = [
  "Quarter Final 1st Leg",
  "Quarter Final 2nd Leg",
  "Semi Final 1st Leg",
  "Semi Final 2nd Leg",
  "Final",
];

/** Stages offered when the calendar has none set for the previous / current matchday. */
export const fallbackStages = (league) => (isDomesticCup(league) ? CUP_STAGES_FALLBACK : UEFA_STAGES);

export const stagePath = (league) => `career_${league}_settings/uefaStage`;

/** A result saved in the knockout stage carries a non-empty `stage`. */
export const isKnockoutResult = (result) =>
  typeof result?.stage === "string" && result.stage.trim() !== "";

// Stage names are compared ignoring capitals, dashes and spacing, so the cups' older
// wording ("Quarter-Final – 1st Leg") and the calendar's ("Quarter Final 1st Leg")
// are the same stage.
export const normStage = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const sameStage = (a, b) => normStage(a) === normStage(b);
