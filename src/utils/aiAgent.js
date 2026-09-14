// ─────────────────────────────────────────────────────────────────────────
// AI Agent conversation engine — Groq tool-calling loop.
// Read tools run immediately. Write tools pause the loop and hand back a
// "pendingConfirmation" for the UI to show a Yes/No card before anything
// is written to Firebase.
// ─────────────────────────────────────────────────────────────────────────
import { LEAGUE_MAP, getToolSchemas, isWriteTool, runReadTool, previewWriteTool, executeWriteTool } from "./aiAgentTools";

const GROQ_API_KEY = import.meta.env.VITE_Career_Groq1;
const GROQ_MODEL = "openai/gpt-oss-120b"; // Groq's current recommended tool-use model (llama-3.3-70b-versatile was decommissioned Aug 16 2026)
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const MAX_LOOP_ITERATIONS = 8;

export const SYSTEM_PROMPT = `You are the admin assistant for an eFootball career-mode league management website. You can read the live database and, when explicitly asked, make changes to it (add/delete results, transfers, finance transactions, fixtures, club objectives).

Known leagues (name -> internal key): ${Object.entries(LEAGUE_MAP).map(([n, k]) => `"${n}"`).join(", ")}.
Seasons are simple numbers as strings, e.g. "1", "2". If you don't know the season the user means, ask, don't guess.

Rules you MUST follow:
1. If any part of the request is ambiguous or you're missing information you need (which team exactly, which season, which league, an amount, a date, etc.), STOP and ask the user a clear, specific question instead of guessing. Never invent data.
2. To answer questions, use the read tools — don't answer from memory/assumption about this league's data.
3. To make a change, call the matching write tool. The system will always show the user a confirmation before anything is actually written — you do not need to ask "are you sure" yourself, just call the tool once you have enough information.
4. If a tool returns an error (e.g. team not found, ambiguous match), relay that back to the user and ask them to clarify — don't retry blindly with guesses.
5. Keep answers concise and to the point. Use actual numbers/names from tool results, never placeholders.
6. You are only ever talking to the admin — no need to hedge about permissions.`;

async function callGroq(messages) {
  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      tools: getToolSchemas(),
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message;
}

function safeParseArgs(raw) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// Process a batch of tool_calls sequentially starting at startIndex.
// Read tools execute immediately and their results accumulate in `resolved`.
// The first write tool encountered pauses processing and is returned as pending.
async function processToolCalls(toolCalls, startIndex, resolved) {
  for (let i = startIndex; i < toolCalls.length; i++) {
    const call = toolCalls[i];
    const name = call.function.name;
    const args = safeParseArgs(call.function.arguments);

    if (isWriteTool(name)) {
      const preview = await previewWriteTool(name, args);
      if (!preview.ok) {
        // Not confirmable — feed the error straight back as a tool result and keep going.
        resolved.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: preview.error }) });
        continue;
      }
      return { done: false, index: i, pendingCall: { id: call.id, name, args, resolvedArgs: preview.resolvedArgs, summary: preview.summary }, resolved };
    } else {
      const result = await runReadTool(name, args);
      resolved.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return { done: true, resolved };
}

// Runs (or resumes) the agent loop given the current message list.
// Returns one of:
//   { status: "done", messages, reply }
//   { status: "awaiting_confirmation", messages, pendingBatch, pendingCall }
//   { status: "error", messages, error }
export async function runAgentTurn(messages, iteration = 0) {
  if (iteration >= MAX_LOOP_ITERATIONS) {
    return { status: "done", messages, reply: "I'm having trouble completing that — could you rephrase or simplify the request?" };
  }
  let assistantMessage;
  try {
    assistantMessage = await callGroq(messages);
  } catch (e) {
    return { status: "error", messages, error: e.message || String(e) };
  }

  const newMessages = [...messages, assistantMessage];

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const result = await processToolCalls(assistantMessage.tool_calls, 0, []);
    if (!result.done) {
      return {
        status: "awaiting_confirmation",
        messages: newMessages,
        pendingBatch: { toolCalls: assistantMessage.tool_calls, index: result.index, resolved: result.resolved },
        pendingCall: result.pendingCall,
      };
    }
    // all tool calls resolved (reads only, or write errors already relayed) — feed results back and continue loop
    return runAgentTurn([...newMessages, ...result.resolved], iteration + 1);
  }

  return { status: "done", messages: newMessages, reply: assistantMessage.content || "" };
}

// Called when the user confirms or cancels a pending write action.
export async function resolvePendingAction(messages, pendingBatch, pendingCall, approved, iteration = 0) {
  let content;
  if (approved) {
    content = await executeWriteTool(pendingCall.name, pendingCall.resolvedArgs);
  } else {
    content = "The user declined this action. Do not perform it. Nothing was changed.";
  }
  const resolved = [...pendingBatch.resolved, { role: "tool", tool_call_id: pendingCall.id, content: JSON.stringify({ result: content }) }];

  const next = await processToolCalls(pendingBatch.toolCalls, pendingBatch.index + 1, resolved);
  if (!next.done) {
    return {
      status: "awaiting_confirmation",
      messages,
      pendingBatch: { toolCalls: pendingBatch.toolCalls, index: next.index, resolved: next.resolved },
      pendingCall: next.pendingCall,
    };
  }
  return runAgentTurn([...messages, ...next.resolved], iteration + 1);
}
