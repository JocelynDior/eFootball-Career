import { useState, useRef, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { runAgentTurn, resolvePendingAction, SYSTEM_PROMPT } from "../utils/aiAgent";

export default function AIAgentWidget() {
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const [chatLog, setChatLog] = useState([]); // [{role:'user'|'assistant'|'system-note', text}]
  const [messages, setMessages] = useState([{ role: "system", content: SYSTEM_PROMPT }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { batch, call }
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatLog, pending, busy]);

  if (!isAdmin) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setChatLog(prev => [...prev, { role: "user", text }]);
    setBusy(true);
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    const result = await runAgentTurn(nextMessages);
    handleResult(result);
  }

  function handleResult(result) {
    if (result.status === "error") {
      setChatLog(prev => [...prev, { role: "system-note", text: `Error: ${result.error}` }]);
      setBusy(false);
      return;
    }
    setMessages(result.messages);
    if (result.status === "awaiting_confirmation") {
      setPending({ batch: result.pendingBatch, call: result.pendingCall });
      setBusy(false);
      return;
    }
    if (result.reply) setChatLog(prev => [...prev, { role: "assistant", text: result.reply }]);
    setPending(null);
    setBusy(false);
  }

  async function respondToPending(approved) {
    if (!pending) return;
    setBusy(true);
    setChatLog(prev => [...prev, { role: "system-note", text: approved ? `✅ Confirmed: ${pending.call.summary}` : `❌ Cancelled: ${pending.call.summary}` }]);
    const result = await resolvePendingAction(messages, pending.batch, pending.call, approved);
    setPending(null);
    handleResult(result);
  }

  return (
    <>
      {/* Floating toggle bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 84, right: 18, zIndex: 9998,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #FF1493, #FF69B4)",
          border: "none", boxShadow: "0 4px 18px rgba(255,20,147,0.5)",
          color: "#fff", fontSize: 24, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Admin AI Assistant"
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 150, right: 18, zIndex: 9998,
          width: "min(380px, calc(100vw - 36px))", height: "min(560px, calc(100vh - 220px))",
          background: "rgba(10,10,20,0.97)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,20,147,0.35)", borderRadius: 18,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,20,147,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: 1 }}>ADMIN AI ASSISTANT</span>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatLog.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", textAlign: "center", marginTop: 30 }}>
                Ask me things like "how many goals did Man City score in season 1" or "add recurring expense for Man City, 200 million at 2 million per day".
              </div>
            )}
            {chatLog.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
                background: m.role === "user" ? "#FF1493" : m.role === "system-note" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)",
                border: m.role === "system-note" ? "1px solid rgba(255,255,255,0.15)" : "none",
                color: m.role === "system-note" ? "rgba(255,255,255,0.6)" : "#fff",
                fontSize: m.role === "system-note" ? "0.78rem" : "0.9rem",
                whiteSpace: "pre-wrap", lineHeight: 1.4,
              }}>
                {m.text}
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

          <div style={{ padding: 12, borderTop: "1px solid rgba(255,20,147,0.25)", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder={pending ? "Respond to the confirmation above first…" : "Ask or tell me something…"}
              disabled={busy || !!pending}
              style={{
                flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,20,147,0.35)", borderRadius: 12, color: "#fff",
                fontFamily: "inherit", fontSize: "0.88rem", outline: "none",
              }}
            />
            <button onClick={send} disabled={busy || !!pending || !input.trim()} style={{
              padding: "10px 16px", background: "#FF1493", border: "none", borderRadius: 12,
              color: "#fff", fontWeight: 700, cursor: (busy || !!pending) ? "not-allowed" : "pointer", opacity: (busy || !!pending) ? 0.6 : 1,
            }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
