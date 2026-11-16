import { normName } from "./uefaLinks";

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

export const stagePath = (league) => `career_${league}_settings/uefaStage`;

/** A result saved in the knockout stage carries a non-empty `stage`. */
export const isKnockoutResult = (result) =>
  typeof result?.stage === "string" && result.stage.trim() !== "";

export const sameStage = (a, b) => normName(a) === normName(b);
