// ─────────────────────────────────────────────────────────────────────────
// AI Agent conversation engine — tool-calling loop, Gemini primary / Groq
// fallback. Read tools run immediately. Write tools pause the loop and hand
// back a "pendingConfirmation" for the UI to show a Yes/No card before
// anything is written to Firebase.
// ─────────────────────────────────────────────────────────────────────────
import { LEAGUE_MAP, getToolSchemas, isWriteTool, runReadTool, previewWriteTool, executeWriteTool } from "./aiAgentTools";

const GEMINI_API_KEYS = [
  { name: "VITE_Gemini1", key: import.meta.env.VITE_Gemini1 },
  { name: "VITE_Gemini2", key: import.meta.env.VITE_Gemini2 },
  { name: "VITE_Gemini3", key: import.meta.env.VITE_Gemini3 },
].filter((entry) => entry.key);

const GROQ_API_KEYS = [
  { name: "VITE_CareerMode1", key: import.meta.env.VITE_CareerMode1 },
  { name: "VITE_CareerMode2", key: import.meta.env.VITE_CareerMode2 },
  { name: "VITE_CareerMode3", key: import.meta.env.VITE_CareerMode3 },
].filter((entry) => entry.key);

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const GROQ_MODEL = "openai/gpt-oss-120b"; // Groq's current recommended tool-use model (llama-3.3-70b-versatile was decommissioned Aug 16 2026)
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Gemini keys are tried first (primary). Groq keys are only reached once
// every Gemini key has failed (fallback).
const AI_PROVIDERS = [
  ...GEMINI_API_KEYS.map((e) => ({ ...e, provider: "Gemini", endpoint: GEMINI_ENDPOINT, model: GEMINI_MODEL })),
  ...GROQ_API_KEYS.map((e) => ({ ...e, provider: "Groq", endpoint: GROQ_ENDPOINT, model: GROQ_MODEL })),
];

const MAX_LOOP_ITERATIONS = 8;

export const SYSTEM_PROMPT = `Admin assistant for an eFootball career-mode site. You read the live database and, when asked, change it.

Leagues: ${Object.entries(LEAGUE_MAP).map(([n]) => n).join(", ")}. Seasons are numbers as strings ("1", "2").

Rules:
1. If anything is ambiguous or missing (team, season, league, amount, date), ASK — never guess.
READ tools: get_league_seasons, get_teams_in_league, get_league_table, get_team_season_stats, get_results, get_top_scorers, get_top_assistants, get_fixtures_by_date, get_team_finance, get_transfer_market, get_club_info, get_managers, get_stadium_info, get_squad, get_manager_rankings, get_pending_results, get_manager_history, get_global_settings, get_league_settings.

WRITE tools (all need user confirmation): add_result, delete_result, add_finance_transaction, add_recurring_finance, add_recurring_kit_sales, add_fixture, delete_transfer_entry, update_club_objectives, update_stadium, update_manager_ranking, approve_pending_result.

2. Always use read tools to answer questions; never rely on memory for live data.
3. Call the matching write tool once you have enough info — the system shows the user a confirmation before anything is written, so you don't need to ask "are you sure" yourself.
4. If a tool errors (team not found, ambiguous match), relay it and ask the user to clarify.
5. Be concise. Use real numbers/names from tool results, never placeholders.`;

async function callAI(messages) {
  const failures = [];

  for (const { name, key, provider, endpoint, model } of AI_PROVIDERS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          tools: getToolSchemas(),
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 700, // Groq's TPM limit is checked against this declared value, not actual usage — keep it tight
          ...(provider === "Gemini" ? { reasoning_effort: "low" } : {}), // Gemini "thinking" is on by default and eats into max_tokens otherwise
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error || {};
        const detail = [
          `HTTP ${res.status} ${res.statusText}`,
          err.type ? `Type: ${err.type}` : null,
          err.code ? `Code: ${err.code}` : null,
          err.message ? `Message: ${err.message}` : null,
          err.param ? `Param: ${err.param}` : null,
        ].filter(Boolean).join(" | ");
        failures.push({ name: `${provider}/${name}`, detail });
        continue;
      }
      return data.choices[0].message;
    } catch (err) {
      failures.push({ name: `${provider}/${name}`, detail: `Network/Parse Error: ${err.message || "Unknown error"}` });
    }
  }

  const errorReport = failures
    .map((f, i) => `Key ${i + 1} [${f.name}]:\n  → ${f.detail}`)
    .join("\n\n");
  throw new Error(`All API keys failed:\n\n${errorReport}`);
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
    assistantMessage = await callAI(messages);
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
