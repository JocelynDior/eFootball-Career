// ─────────────────────────────────────────────────────────────────────────
// AI Agent request queue — shared in Firebase so every admin's browser sees
// the same line. Whoever asks first is served first; only one full agent
// turn (which may itself make several Groq calls while it works through
// tool calls) runs against the API at a time.
// ─────────────────────────────────────────────────────────────────────────
import { db, ref, push, set, update, remove, get } from "../firebase";
import { onValue } from "firebase/database";

const QUEUE_PATH = "career_ai_agent_queue";
const LAST_TURN_PATH = "career_ai_agent_last_turn";

const LEASE_MS = 30_000;   // an "active" turn with no heartbeat this long is treated as abandoned
const HEARTBEAT_MS = 8_000; // how often the active turn renews its lease
const MIN_GAP_MS = 3_000;   // minimum spacing between two turns from the same admin

// Joins the shared queue and resolves once it's this caller's turn.
// onPosition(n) fires whenever the caller's place in line changes
// (0 = running now, 1+ = number of people ahead).
// Resolves to { release() } — call release() when the turn (including any
// confirmation round-trip) is fully done, success or failure.
export function requestTurn(uid, onPosition) {
  const who = uid || "admin";
  let entryId = null;
  let unsub = null;
  let heartbeatTimer = null;
  let settled = false;

  const cleanup = () => {
    if (unsub) { unsub(); unsub = null; }
  };

  const promise = new Promise((resolve, reject) => {
    push(ref(db, QUEUE_PATH), { uid: who, createdAt: Date.now(), status: "waiting" })
      .then((pushedRef) => {
        entryId = pushedRef.key;

        unsub = onValue(ref(db, QUEUE_PATH), (snap) => {
          if (settled) return;
          const data = snap.val() || {};
          const now = Date.now();

          const entries = Object.entries(data)
            .map(([id, e]) => ({ id, ...e }))
            .filter((e) => e.status !== "active" || now - (e.leaseAt || e.createdAt || 0) < LEASE_MS)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

          const mine = entries.find((e) => e.id === entryId);
          if (!mine) return; // our own push hasn't shown up in this snapshot yet

          const active = entries.find((e) => e.status === "active");
          const waiting = entries.filter((e) => e.status === "waiting");
          const myWaitIndex = waiting.findIndex((e) => e.id === entryId);

          if (onPosition) onPosition(active && active.id === entryId ? 0 : myWaitIndex + 1);

          if (active && active.id !== entryId) return; // someone else is running right now
          if (active && active.id === entryId) return; // we're already marked active, just waiting for our own claim below to land
          if (waiting[0]?.id !== entryId) return; // not our turn yet

          // We're next. Respect this admin's own minimum gap before claiming.
          get(ref(db, `${LAST_TURN_PATH}/${who}`))
            .then((lastSnap) => {
              if (settled) return;
              const lastAt = Number(lastSnap.val()) || 0;
              const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastAt));
              setTimeout(() => {
                if (settled) return;
                update(ref(db, `${QUEUE_PATH}/${entryId}`), { status: "active", leaseAt: Date.now() })
                  .then(() => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    heartbeatTimer = setInterval(() => {
                      update(ref(db, `${QUEUE_PATH}/${entryId}`), { leaseAt: Date.now() }).catch(() => {});
                    }, HEARTBEAT_MS);
                    resolve({
                      release: async () => {
                        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
                        try { await set(ref(db, `${LAST_TURN_PATH}/${who}`), Date.now()); } catch {}
                        try { await remove(ref(db, `${QUEUE_PATH}/${entryId}`)); } catch {}
                      },
                    });
                  })
                  .catch(() => {}); // another client may have grabbed it first — next snapshot will re-evaluate
              }, wait);
            })
            .catch(() => {});
        });
      })
      .catch(reject);
  });

  // Best-effort cleanup if the caller abandons the wait entirely (e.g. navigates away).
  promise.cancel = async () => {
    if (settled) return;
    settled = true;
    cleanup();
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (entryId) { try { await remove(ref(db, `${QUEUE_PATH}/${entryId}`)); } catch {} }
  };

  return promise;
}
