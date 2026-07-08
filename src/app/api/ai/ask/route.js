import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqKey } from "@/lib/groqKey";

const INTERPRET_PROMPT = `You are a filter interpreter for a personal finance app.
Given a natural-language question and today's date, return a JSON filter object (no markdown fences) with these optional fields:
{
  "category": "<category name or null>",
  "textContains": "<substring to match in description or null>",
  "beneficiary": "<name or null>",
  "from": "<YYYY-MM-DD or null>",
  "to": "<YYYY-MM-DD or null>",
  "flow": "<in | out | null>",
  "essentiality": "<Essential | Discretionary | null>"
}
Resolve relative dates (last month, this week, yesterday) against today's date.`;

const NARRATE_PROMPT = `You are Coach RBC — a sharp, warm finance coach for Taiwo, a Nigerian credit risk analyst.
Given a question and computed results, narrate the answer in 2-3 sentences in your voice. Be specific, cite the numbers. No markdown.`;

async function callAI(settings, systemPrompt, userPrompt, maxTokens = 300) {
  const provider = settings?.provider;

  if (provider === "claude" && settings.claude_key_encrypted) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.claude_key_encrypted, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    return data.content?.[0]?.text || "";
  }

  // Groq (default, system-wide key)
  const key = getGroqKey();
  if (!key) throw new Error("No Groq key configured on the server.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message);
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request) {
  const { question, entries } = await request.json();
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    // Step 1: Interpret question into filter
    const filterText = await callAI(
      settings,
      INTERPRET_PROMPT,
      `Today is ${today}.\nQuestion: "${question}"`,
      200,
    );
    const filter = JSON.parse(filterText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim());

    // Step 2: Apply filter deterministically in code
    const matches = (entries || []).filter((e) => {
      if (filter.flow        && e.flow        !== filter.flow)        return false;
      if (filter.from        && e.date        <  filter.from)         return false;
      if (filter.to          && e.date        >  filter.to)           return false;
      if (filter.category    && e.category !== filter.category)       return false;
      if (filter.essentiality && e.essentiality !== filter.essentiality) return false;
      if (filter.beneficiary && !e.beneficiary?.toLowerCase().includes(filter.beneficiary.toLowerCase())) return false;
      if (filter.textContains && !e.desc?.toLowerCase().includes(filter.textContains.toLowerCase())) return false;
      return true;
    });

    const total = matches.reduce((s, e) => s + (e.flow === "in" ? Number(e.amount) : Number(e.amount)), 0);

    // Step 3: Narrate
    const narrative = await callAI(
      settings,
      NARRATE_PROMPT,
      `Question: "${question}"\nTotal: ₦${total.toLocaleString()}\nMatches: ${matches.length} transaction(s)\nFilter applied: ${JSON.stringify(filter)}`,
      200,
    );

    return NextResponse.json({ total, matches, narrative, filter });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
