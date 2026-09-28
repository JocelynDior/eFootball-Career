import { PATHS } from "../firebase";

// Builds the multi-path update that moves a manager to `newTeam` (null = no team) and
// records the stint they are leaving, so the history is complete no matter which
// screen the change is made from.
//   • nothing is written if the team isn't actually changing
//   • the old stint is stored with its real start (teamAssignedAt), or null if it was never
//     recorded — never a made-up date
//   • teamAssignedAt is set to `now` for the new team and cleared when there is no team
export function teamMoveUpdates(uid, acc, newTeam, now = Date.now()) {
  const updates = {};
  const base = `${PATHS.accounts}/${uid}`;
  const oldTeam = acc?.team || null;
  const target = newTeam || null;
  if (oldTeam === target) return updates;

  if (oldTeam) {
    updates[`${base}/teamHistory/${now}`] = {
      team: oldTeam,
      assignedAt: Number(acc.teamAssignedAt) || null,
      removedAt: now,
    };
  }
  updates[`${base}/team`] = target;
  updates[`${base}/teamAssignedAt`] = target ? now : null;
  return updates;
}
