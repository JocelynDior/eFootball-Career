// ─────────────────────────────────────────────────────────────────────────
// AI Agent chat sessions — stored in this browser's localStorage only.
// ─────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "careerAiAgentSessions";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { /* storage unavailable — fail silently */ }
}

// Sessions sorted newest-active-first, for the history list.
export function loadSessions() {
  return readAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getSession(id) {
  return readAll().find(s => s.id === id) || null;
}

function nextChatNumber(sessions) {
  let max = 0;
  for (const s of sessions) {
    const m = /^Chat (\d+)$/.exec(s.title || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export function createSession() {
  const all = readAll();
  const n = nextChatNumber(all);
  const session = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: `Chat ${n}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    log: [],
  };
  all.push(session);
  writeAll(all);
  return session;
}

export function saveSessionLog(id, log) {
  const all = readAll();
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], log, updatedAt: Date.now() };
  writeAll(all);
}

export function renameSession(id, title) {
  const all = readAll();
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const clean = (title || "").trim();
  all[idx] = { ...all[idx], title: clean || all[idx].title };
  writeAll(all);
  return all[idx];
}
