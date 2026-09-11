import { isoOf, todayISO } from "./date";
import type { LifeOSState, QuickAddResult } from "./types";

// Offline-safe fallback. Runs entirely client-side, no network required, so
// Quick Add still works if there's no GEMINI_API_KEY configured or the
// request fails.
export function heuristicParse(text: string, state: LifeOSState): QuickAddResult {
  const lower = text.toLowerCase();
  const minMatch = lower.match(/(\d+)\s*(min|minute|mins|minutes)/);
  const duration = minMatch ? parseInt(minMatch[1], 10) : null;
  const isTomorrow = /tomorrow/.test(lower);
  const due = isTomorrow ? isoOf(1) : todayISO();

  const subject = state.subjects.find((s) => lower.includes(s.name.toLowerCase().split(" ")[0]));

  if (/study|studied|revise|revision/.test(lower) && duration) {
    return {
      type: "study",
      fields: {
        subjectId: subject?.id || state.subjects[0]?.id || "",
        topic: text.replace(/study|for \d+\s*(min|minute)s?|tomorrow/gi, "").trim() || "General review",
        duration,
        date: due,
      },
    };
  }
  if (/log|drank|slept|steps|weigh|water/.test(lower)) {
    return { type: "health", fields: { note: text, date: todayISO() } };
  }
  return {
    type: "task",
    fields: { title: text.replace(/tomorrow/gi, "").trim(), due, priority: "med" },
  };
}

// Calls our own server route (/api/parse), which holds the Gemini API key
// server-side. Never call generativelanguage.googleapis.com directly from
// the browser — that would require shipping a secret key to the client.
export async function parseWithAI(text: string, state: LifeOSState): Promise<QuickAddResult> {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, subjects: state.subjects.map((s) => s.name) }),
  });
  if (!res.ok) throw new Error(`Parse API error ${res.status}`);
  const data = await res.json();
  if (!data?.type || !data?.fields) throw new Error("Malformed parse response");
  return data as QuickAddResult;
}
