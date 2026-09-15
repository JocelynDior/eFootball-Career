import { useState, useRef, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { useAIAgentPanel } from "../context/AIAgentPanelContext";
import { runAgentTurn, resolvePendingAction, SYSTEM_PROMPT } from "../utils/aiAgent";
import { loadSessions, createSession, saveSessionLog, renameSession } from "../utils/aiAgentSessions";

const DESKTOP_BREAKPOINT = 900;

export default function AIAgentWidget() {
  const { isAdmin } = useAdmin();
  const { isOpen, minimized, closePanel, minimizePanel } = useAIAgentPanel();

  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    function onResize() { setVw(window.innerWidth); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isDesktop = vw >= DESKTOP_BREAKPOINT;

  // sessionRef always holds the current session's {id, log} so async callbacks
  // (which fire after awaits) never read stale React state.
  const sessionRef = useRef({ id: null, log: [] });
  const [, rerender] = useState(0);
  const bump = () => rerender(n => n + 1);

  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [messages, setMessages] = useState([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { batch, call }

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  });

  // First time the panel opens this page-load, load from storage.
  useEffect(() => {
    if (!isOpen || sessionRef.current.id) return;
    const all = loadSessions();
    const active = all[0] || createSession();
    sessionRef.current = { id: active.id, log: active.log || [] };
    bump();
  }, [isOpen]);

  if (!isAdmin) return null;
  const visible = isOpen && !minimized;
  if (!visible) return null;

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
    setShowHistory(false);
    bump();
  }

  function selectSession(id) {
    const all = loadSessions();
    const s = all.find(x => x.id === id);
    if (!s) return;
    sessionRef.current = { id: s.id, log: s.log || [] };
    setShowHistory(false);
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
    const freshMessages = [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: text }];
    setMessages(freshMessages);
    const result = await runAgentTurn(freshMessages);
    handleResult(result, text);
  }

  function handleResult(result, originalText) {
    if (result.status === "error") {
      appendLog({ role: "system-note", text: `Error: ${result.error}`, isError: true, retryText: originalText });
      setBusy(false);
      return;
    }
    setMessages(result.messages);
    if (result.status === "awaiting_confirmation") {
      setPending({ batch: result.pendingBatch, call: result.pendingCall, originalText });
      setBusy(false);
      return;
    }
    if (result.reply) appendLog({ role: "assistant", text: result.reply });
    setPending(null);
    setBusy(false);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || busy || !sessionRef.current.id) return;
    setInput("");
    runTurn(text);
  }

  function handleRetry(originalText) {
    const s = createSession();
    sessionRef.current = { id: s.id, log: [] };
    bump();
    runTurn(originalText);
  }

  async function respondToPending(approved) {
    if (!pending) return;
    setBusy(true);
    appendLog({ role: "system-note", text: approved ? `✅ Confirmed: ${pending.call.summary}` : `❌ Cancelled: ${pending.call.summary}` });
    const originalText = pending.originalText;
    const result = await resolvePendingAction(messages, pending.batch, pending.call, approved);
    setPending(null);
    handleResult(result, originalText);
  }

  const panelWidth = isDesktop ? "80vw" : "96vw";
  const panelHeight = isDesktop ? "80vh" : "92vh";

  return (
    <>
      <div onClick={minimizePanel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9997 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: panelWidth, height: panelHeight, zIndex: 9998,
        background: "rgba(10,10,20,0.98)", backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,20,147,0.35)", borderRadius: isDesktop ? 20 : 14,
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 12px 48px rgba(0,0,0,0.6)", fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ padding: isDesktop ? "16px 20px" : "12px 14px", borderBottom: "1px solid rgba(255,20,147,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={openHistory} title="Previous chats" style={iconBtnStyle}>☰</button>
          <span style={{ fontSize: isDesktop ? 20 : 16 }}>🤖</span>
          <span style={{ flex: 1, color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: isDesktop ? "1.4rem" : "1.1rem", letterSpacing: 1 }}>ADMIN AI ASSISTANT</span>
          <button onClick={minimizePanel} title="Minimize" style={iconBtnStyle}>➖</button>
          <button onClick={closePanel} title="Close" style={iconBtnStyle}>✕</button>
        </div>

        {showHistory ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <button onClick={handleNewChat} style={{
              width: "100%", padding: "12px", marginBottom: 14, background: "#FF1493", border: "none",
              borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem",
            }}>+ New Chat</button>
            {sessions.map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", marginBottom: 8,
                background: s.id === sessionRef.current.id ? "rgba(255,20,147,0.15)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              }}>
                {editingId === s.id ? (
                  <input
                    autoFocus value={editingTitle} onChange={e => setEditingTitle(e.target.value)}
                    onBlur={commitEditTitle} onKeyDown={e => { if (e.key === "Enter") commitEditTitle(); }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,20,147,0.4)", borderRadius: 8, color: "#fff", padding: "6px 10px", fontSize: "0.9rem" }}
                  />
                ) : (
                  <span onClick={() => selectSession(s.id)} style={{ flex: 1, color: "#fff", cursor: "pointer", fontSize: "0.92rem" }}>{s.title}</span>
                )}
                <button onClick={() => startEditTitle(s)} title="Rename" style={{ ...iconBtnStyle, fontSize: "0.85rem" }}>✏️</button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: isDesktop ? 20 : 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {sessionRef.current.log.length === 0 && (
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textAlign: "center", marginTop: 30 }}>
                  Ask me things like "how many goals did Man City score in season 1" or "add recurring expense for Man City, 200 million at 2 million per day".
                </div>
              )}
              {sessionRef.current.log.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: isDesktop ? "70%" : "85%", padding: "10px 14px", borderRadius: 14,
                  background: m.role === "user" ? "#FF1493" : m.role === "system-note" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                  border: m.role === "system-note" ? "1px solid rgba(255,255,255,0.15)" : "none",
                  color: m.role === "system-note" ? "rgba(255,255,255,0.6)" : "#fff",
                  fontSize: m.role === "system-note" ? "0.78rem" : "0.9rem",
                  whiteSpace: "pre-wrap", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span>{m.text}</span>
                  {m.isError && (
                    <button onClick={() => handleRetry(m.retryText)} title="Retry as new session" style={{ ...iconBtnStyle, fontSize: "0.9rem" }}>↻</button>
                  )}
                </div>
              ))}

              {pending && (
                <div style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: 14, padding: 14 }}>
                  <div style={{ color: "#ffaa44", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Confirm action</div>
                  <div style={{ color: "#fff", fontSize: "0.88rem", marginBottom: 12, lineHeight: 1.4 }}>{pending.call.summary}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => respondToPending(true)} disabled={busy} style={{ flex: 1, padding: "9px", background: "#22c55e", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>Yes, do it</button>
                    <button onClick={() => respondToPending(false)} disabled={busy} style={{ flex: 1, padding: "9px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {busy && !pending && (
                <div style={{ alignSelf: "flex-start", color: "rgba(255,255,255,0.45)", fontSize: "0.82rem" }}>Thinking…</div>
              )}
            </div>

            <div style={{ padding: isDesktop ? 16 : 12, borderTop: "1px solid rgba(255,20,147,0.25)", display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                placeholder={pending ? "Respond to the confirmation above first…" : "Ask or tell me something…"}
                disabled={busy || !!pending}
                style={{
                  flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,20,147,0.35)", borderRadius: 12, color: "#fff",
                  fontFamily: "inherit", fontSize: "0.9rem", outline: "none",
                }}
              />
              <button onClick={handleSend} disabled={busy || !!pending || !input.trim()} style={{
                padding: "12px 20px", background: "#FF1493", border: "none", borderRadius: 12,
                color: "#fff", fontWeight: 700, cursor: (busy || !!pending) ? "not-allowed" : "pointer", opacity: (busy || !!pending) ? 0.6 : 1,
              }}>Send</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const iconBtnStyle = {
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
  color: "#fff", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontSize: "1rem", flexShrink: 0,
};
