import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function buildPersona(name) {
  const n = name || "the user";
  return `You are Coach RBC — a sharp, witty, warm-hearted personal finance coach with a genuine sense of humor. Your client is ${n}. You know Nigerian financial life cold: naira volatility that would make a cardiologist nervous, PFAs that feel like a mystery box, NEPA bills arriving like unwanted relatives, T-Bills that finally make sense once you're past the FOMO, and the very specific grief of watching your balance on a Wednesday.

Your humor is the secret weapon. You use it to make advice stick — a well-placed quip lands harder than a lecture. You'll say things like "${n}, ₦15k on Bolt in one week — did the car have wings? Or were you the pilot?" or "Suya is load-bearing infrastructure for your social life. Understood. We still need to budget it." You roast gently, never cruelly. You call out patterns with a raised eyebrow, not a wagging finger. When the numbers are genuinely good, you celebrate like it matters — because it does.

You are direct, funny, and actionable. Never preachy, never generic, never boring. Every analysis has a punchline or a sharp observation. You speak like a brilliant friend who happens to know ${n}'s financial numbers better than they do — and isn't afraid to say what they see. Always address ${n} by name.`;
}

function buildSchema(name) {
  const n = name || "the user";
  return `Return ONLY raw JSON (no markdown fences, no prose outside the JSON) in this exact shape:
{
  "opener": "<2-3 sentence personal greeting addressing ${n} by name, acknowledging the period and overall situation>",
  "headlines": [{"title": "<short title>", "body": "<3-5 sentence analysis>"}],
  "redFlags": [{"title": "<short title>", "body": "<specific concern>", "amount": <number>}],
  "cutList": [{"action": "<concrete action>", "category": "<category name>", "targetSaving": <number>}],
  "closer": "<2-3 sentence motivating close, addressing ${n} by name>"
}`;
}

export async function POST(request) {
  const body = await request.json();
  const { from, to, context } = body;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Check cache
  const { data: cached } = await supabase
    .from("coach_sessions")
    .select("data")
    .eq("user_id", user.id)
    .eq("from_date", from)
    .eq("to_date", to)
    .maybeSingle();

  if (cached?.data) return NextResponse.json(cached.data);

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, gemini_key_encrypted, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const PERSONA = buildPersona(name);
  const SCHEMA  = buildSchema(name);

  const contextStr = JSON.stringify(context, null, 2);
  const userPrompt = `Analyse ${name || "the user"}'s finances for the period ${from} to ${to}.\n\nContext:\n${contextStr}\n\n${SCHEMA}`;

  try {
    let text = "";

    if (settings?.provider === "groq" && settings.groq_key_encrypted) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.groq_key_encrypted}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: PERSONA }, { role: "user", content: userPrompt }],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      text = data.choices?.[0]?.message?.content || "";

    } else if (settings?.provider === "claude" && settings.claude_key_encrypted) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.claude_key_encrypted,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system: PERSONA,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      text = data.content?.[0]?.text || "";

    } else {
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No AI key configured. Add one in Settings.");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: PERSONA }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Strip any accidental markdown fences
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const result = JSON.parse(text);

    // Cache
    await supabase.from("coach_sessions").upsert(
      { user_id: user.id, from_date: from, to_date: to, data: result },
      { onConflict: "user_id,from_date,to_date" },
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
