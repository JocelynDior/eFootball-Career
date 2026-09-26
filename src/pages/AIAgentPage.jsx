import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { runAgentTurn, resolvePendingAction, SYSTEM_PROMPT } from "../utils/aiAgent";
import { loadSessions, createSession, deleteSession, saveSessionLog, saveSessionMessages, renameSession } from "../utils/aiAgentSessions";
import { requestTurn } from "../utils/aiAgentQueue";

const DESKTOP_BREAKPOINT = 900;

// A stable per-browser id so the shared queue can space out one device's own
// burst of messages without also throttling a different admin's device.
function getDeviceId() {
  try {
    let id = localStorage.getItem("careerAiDeviceId");
    if (!id) {
      id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
      localStorage.setItem("careerAiDeviceId", id);
    }
    return id;
  } catch {
    return "dev_fallback";
  }
}

export default function AIAgentPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    function onResize() { setVw(window.innerWidth); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = vw >= DESKTOP_BREAKPOINT;
  const deviceId = useRef(getDeviceId()).current;

  const sessionRef = useRef({ id: null, log: [] });
  const [, rerender] = useState(0);
  const bump = () => rerender((n) => n + 1);

  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [messages, setMessages] = useState([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { batch, call }
  const [queuePosition, setQueuePosition] = useState(null); // null = not queued/running now; n = spots ahead
  const [outbox, setOutbox] = useState([]); // messages the user sent while a turn was already running

  const activeTurnRef = useRef(null); // { promise } — the in-flight requestTurn(), cancellable on unmount

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  });

  useEffect(() => {
    if (sessionRef.current.id) return;
    const all = loadSessions();
    const active = all[0] || createSession();
    sessionRef.current = { id: active.id, log: active.log || [] };
    const saved = active.messages && active.messages.length > 1 ? active.messages : [{ role: "system", content: SYSTEM_PROMPT }];
    setMessages(saved);
    bump();
  }, []);

  useEffect(() => {
    return () => {
      if (activeTurnRef.current && typeof activeTurnRef.current.cancel === "function") {
        activeTurnRef.current.cancel();
      }
    };
  }, []);

  if (!isAdmin) return null;

  function persist(log) {
    sessionRef.current = { ...sessionRef.current, log };
    saveSessionLog(sessionRef.current.id, log);
    bump();
  }

  function appendLog(entry) {
    persist([...sessionRef.current.log, entry]);
  }

  function openHistory() {
    setSessions(loadSessions());
    setShowHistory(true);
  }

  function handleNewChat() {
    const s = createSession();
    sessionRef.current = { id: s.id, log: [] };
    setMessages([{ role: "system", content: SYSTEM_PROMPT }]);
    setShowHistory(false);
    bump();
  }

  function selectSession(id) {
    const all = loadSessions();
    const s = all.find((x) => x.id === id);
    if (!s) return;
    sessionRef.current = { id: s.id, log: s.log || [] };
    const saved = s.messages && s.messages.length > 1 ? s.messages : [{ role: "system", content: SYSTEM_PROMPT }];
    setMessages(saved);
    setShowHistory(false);
    bump();
  }

  function handleDeleteSession(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this chat permanently? This can't be undone.")) return;
    const remaining = deleteSession(id);
    setSessions(remaining);
    if (id === sessionRef.current.id) {
      const next = remaining[0] || createSession();
      sessionRef.current = { id: next.id, log: next.log || [] };
      const saved = next.messages && next.messages.length > 1 ? next.messages : [{ role: "system", content: SYSTEM_PROMPT }];
      setMessages(saved);
      setSessions(loadSessions());
    }
    bump();
  }

  function startEditTitle(s) {
    setEditingId(s.id);
    setEditingTitle(s.title);
  }

  function commitEditTitle() {
    if (editingId) renameSession(editingId, editingTitle);
    setEditingId(null);
    setSessions(loadSessions());
  }

  async function runTurn(text) {
    appendLog({ role: "user", text });
    setBusy(true);
    setQueuePosition(1);

    const turn = requestTurn(deviceId, (pos) => setQueuePosition(pos > 0 ? pos : null));
    activeTurnRef.current = turn;
    let release = async () => {};
    try {
      const claimed = await turn;
      release = claimed.release;
    } catch {
      // Queue itself failed (e.g. offline) — fall through and try the call anyway.
    }
    setQueuePosition(0);

    try {
      const log = sessionRef.current.log;
      const historyLines = log
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n");
      const textWithHistory = historyLines
        ? `This is our conversation history so far:\n${historyLines}\n\nUser's new message: ${text}`
        : text;

      const updatedMessages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: textWithHistory }];
      setMessages(updatedMessages);
      const result = await runAgentTurn(updatedMessages);
      handleResult(result, text);
    } finally {
      await release();
      activeTurnRef.current = null;
      setQueuePosition(null);
    }
  }

  function handleResult(result, originalText) {
    if (result.status === "error") {
      appendLog({ role: "system-note", text: `Error: ${result.error}`, isError: true, retryText: originalText });
      setBusy(false);
      dispatchNextQueued();
      return;
    }
    setMessages(result.messages);
    saveSessionMessages(sessionRef.current.id, result.messages);
    if (result.status === "awaiting_confirmation") {
      setPending({ batch: result.pendingBatch, call: result.pendingCall, originalText });
      setBusy(false);
      return;
    }
    if (result.reply) appendLog({ role: "assistant", text: result.reply });
    setPending(null);
    setBusy(false);
    dispatchNextQueued();
  }

  // If the user sent more messages while a turn was running, send the next
  // queued one automatically once we're free.
  function dispatchNextQueued() {
    setOutbox((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setTimeout(() => runTurn(next), 0);
      return rest;
    });
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !sessionRef.current.id) return;
    setInput("");
    if (busy || pending) {
      setOutbox((prev) => [...prev, text]);
      return;
    }
    runTurn(text);
  }

  function handleRetry(originalText) {
    const s = createSession();
    sessionRef.current = { id: s.id, log: [] };
    setMessages([{ role: "system", content: SYSTEM_PROMPT }]);
    bump();
    runTurn(originalText);
  }

  async function respondToPending(approved) {
    if (!pending) return;
    setBusy(true);
    setQueuePosition(1);
    appendLog({ role: "system-note", text: approved ? `✅ Confirmed: ${pending.call.summary}` : `❌ Cancelled: ${pending.call.summary}` });
    const originalText = pending.originalText;

    const turn = requestTurn(deviceId, (pos) => setQueuePosition(pos > 0 ? pos : null));
    activeTurnRef.current = turn;
    let release = async () => {};
    try {
      const claimed = await turn;
      release = claimed.release;
    } catch {}
    setQueuePosition(0);

    try {
      const result = await resolvePendingAction(messages, pending.batch, pending.call, approved);
      setPending(null);
      handleResult(result, originalText);
    } finally {
      await release();
      activeTurnRef.current = null;
      setQueuePosition(null);
    }
  }

  function removeFromOutbox(idx) {
    setOutbox((prev) => prev.filter((_, i) => i !== idx));
  }

  const thinkingLabel =
    queuePosition > 0 ? `Queued — ${queuePosition} ahead of you…` : busy ? "Thinking…" : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(6,6,16,0.98)", display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        padding: isDesktop ? "28px 40px" : "20px 20px", borderBottom: "1px solid rgba(255,20,147,0.25)",
        display: "flex", alignItems: "center", gap: 24, flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} title="Back" style={iconBtnStyle}>←</button>
        <button onClick={openHistory} title="Previous chats" style={iconBtnStyle}>☰</button>
        <span style={{ fontSize: isDesktop ? 72 : 56 }}>🤖</span>
        <span style={{ flex: 1, color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: isDesktop ? "4.4rem" : "3.2rem", letterSpacing: 3 }}>ADMIN AI ASSISTANT</span>
        <button onClick={handleNewChat} title="New chat" style={{ ...iconBtnStyle, width: "auto", padding: "0 28px", background: "#FF1493", fontSize: isDesktop ? "1.8rem" : "1.5rem", fontWeight: 700 }}>+ New Chat</button>
      </div>

      {showHistory ? (
        <div style={{ flex: 1, overflowY: "auto", padding: isDesktop ? "32px 40px" : 20, maxWidth: 900, width: "100%", margin: "0 auto" }}>
          {sessions.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2rem", textAlign: "center", marginTop: 60 }}>No previous chats yet.</div>
          )}
          {sessions.map((s) => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 20, padding: "28px 32px", marginBottom: 16,
              background: s.id === sessionRef.current.id ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18,
            }}>
              {editingId === s.id ? (
                <input
                  autoFocus value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={commitEditTitle} onKeyDown={(e) => { if (e.key === "Enter") commitEditTitle(); }}
                  style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 10, color: "#fff", padding: "12px 16px", fontSize: "1.8rem" }}
                />
              ) : (
                <span onClick={() => selectSession(s.id)} style={{ flex: 1, color: "#fff", cursor: "pointer", fontSize: "2rem" }}>{s.title}</span>
              )}
              <button onClick={() => startEditTitle(s)} title="Rename" style={{ ...iconBtnStyle, fontSize: "1.7rem" }}>✏️</button>
              <button onClick={(e) => handleDeleteSession(e, s.id)} title="Delete chat" style={{ ...iconBtnStyle, fontSize: "1.7rem", background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.4)", color: "#ff6b6b" }}>🗑️</button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: isDesktop ? "40px" : "20px", maxWidth: 1100, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
            {sessionRef.current.log.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "2.2rem", textAlign: "center", marginTop: 60 }}>
                Ask me things like "how many goals did Man City score in season 1" or "add recurring expense for Man City, 200 million at 2 million per day".
              </div>
            )}
            {sessionRef.current.log.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: isDesktop ? "70%" : "90%", padding: "28px 32px", borderRadius: 22,
                background: m.role === "user" ? "#FF1493" : m.role === "system-note" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                border: m.role === "system-note" ? "1px solid rgba(255,255,255,0.15)" : "none",
                color: m.role === "system-note" ? "rgba(255,255,255,0.6)" : "#fff",
                fontSize: m.role === "system-note" ? "1.6rem" : "2rem",
                whiteSpace: "pre-wrap", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 14,
              }}>
                <span>{m.text}</span>
                {m.isError && (
                  <button onClick={() => handleRetry(m.retryText)} title="Retry as new session" style={{ ...iconBtnStyle, fontSize: "1.4rem" }}>↻</button>
                )}
              </div>
            ))}

            {pending && (
              <div style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: 20, padding: 28 }}>
                <div style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.7rem", textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Confirm action</div>
                <div style={{ color: "#fff", fontSize: "1.9rem", marginBottom: 24, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{pending.call.summary}</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <button onClick={() => respondToPending(true)} disabled={busy} style={{ flex: 1, padding: "24px", background: "#22c55e", border: "none", borderRadius: 18, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontSize: "1.7rem" }}>Yes, do it</button>
                  <button onClick={() => respondToPending(false)} disabled={busy} style={{ flex: 1, padding: "24px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 18, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontSize: "1.7rem" }}>Cancel</button>
                </div>
              </div>
            )}

            {thinkingLabel && (
              <div style={{ alignSelf: "flex-start", color: "rgba(255,255,255,0.45)", fontSize: "1.9rem" }}>{thinkingLabel}</div>
            )}

            {outbox.length > 0 && (
              <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", gap: 10, maxWidth: isDesktop ? "70%" : "90%" }}>
                {outbox.map((text, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderRadius: 16, background: "rgba(255,20,147,0.15)", border: "1px dashed rgba(255,20,147,0.4)", color: "rgba(255,255,255,0.6)", fontSize: "1.6rem" }}>
                    <span style={{ flex: 1 }}>{text}</span>
                    <span style={{ fontSize: "1.3rem" }}>queued</span>
                    <button onClick={() => removeFromOutbox(i)} title="Remove" style={{ ...iconBtnStyle, width: 44, height: 44, fontSize: "1.2rem" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: isDesktop ? "28px 40px" : "18px 20px", borderTop: "1px solid rgba(255,20,147,0.25)", display: "flex", gap: 18, flexShrink: 0, maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder={pending ? "Respond to the confirmation above first, or your message will queue…" : "Ask or tell me something…"}
              style={{
                flex: 1, padding: "26px 30px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,20,147,0.35)", borderRadius: 20, color: "#fff",
                fontFamily: "inherit", fontSize: "2rem", outline: "none",
              }}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{
              padding: "26px 40px", background: "#FF1493", border: "none", borderRadius: 20,
              color: "#fff", fontWeight: 700, fontSize: "2rem", cursor: !input.trim() ? "not-allowed" : "pointer", opacity: !input.trim() ? 0.6 : 1,
            }}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

const iconBtnStyle = {
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16,
  color: "#fff", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: "2.2rem", flexShrink: 0,
};
