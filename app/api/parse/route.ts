import { NextRequest, NextResponse } from "next/server";

// Server-side only: the Gemini API key never reaches the browser.
// If GEMINI_API_KEY isn't set, we respond 501 and the client falls back
// to the local heuristic parser automatically (see lib/quickadd.ts).
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 501 }
    );
  }

  const { text, subjects, today: clientToday } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing 'text'." }, { status: 400 });
  }

  // Prefer the client's local calendar date over the server's own clock —
  // the server runs in UTC on Vercel regardless of where the user actually
  // is, so relative dates ("tomorrow") must resolve against the user's day,
  // not the server's. Validated as YYYY-MM-DD before trusting it in the
  // prompt; falls back to the server's UTC date only if a caller doesn't
  // supply one (or supplies something malformed).
  const today = typeof clientToday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
    ? clientToday
    : new Date().toISOString().slice(0, 10);
  const prompt = `You convert a short natural-language personal-productivity note into structured JSON for a life-tracking app. Today's date is ${today}. Known academic subjects: ${(subjects || []).join(", ")}.

Note: "${text}"

Respond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:
{"type":"task|study|health|habit|goal|assignment","fields":{...}}

Field shapes by type:
task: {"title":string,"due":"YYYY-MM-DD"|null,"priority":"low|med|high"}
study: {"subject":string,"topic":string,"duration":number,"date":"YYYY-MM-DD"}
health: {"metric":string,"value":string,"date":"YYYY-MM-DD"}
habit: {"name":string,"date":"YYYY-MM-DD"}
goal: {"title":string,"deadline":"YYYY-MM-DD"|null}
assignment: {"title":string,"subject":string,"due":"YYYY-MM-DD"|null}

Resolve relative dates ("tomorrow", "next friday") against today's date. Pick the single best-fitting type.`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 300,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!upstream.ok) {
      const errBody = await upstream.text();
      console.error("Gemini upstream error:", upstream.status, errBody);
      return NextResponse.json({ error: `Upstream error ${upstream.status}` }, { status: 502 });
    }

    const data = await upstream.json();
    const textBlock: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = textBlock.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed?.type || !parsed?.fields) {
      return NextResponse.json({ error: "Malformed model response." }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Parse route error:", err);
    return NextResponse.json({ error: "Failed to parse note." }, { status: 500 });
  }
}