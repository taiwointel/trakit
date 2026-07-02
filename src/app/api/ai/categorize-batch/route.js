import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fallbackCategorize } from "@/lib/categories";

const SYSTEM_PROMPT = `You are an expense categorizer for a Nigerian personal finance app called Trakit7.
Given a numbered list of transactions, classify each into exactly one of these 11 categories.

CATEGORIES:
- Housing & Utilities: rent, electricity (NEPA/PHCN), water, generator/diesel, internet/WiFi, DSTV, estate dues, airtime, data bundles
- Transportation: Uber, Bolt, fuel/petrol, bus/keke/okada fare, flights, car maintenance
- Food & Groceries: market, supermarket, raw foodstuff, noodles, eggs, bread, rice, beans, vegetables, cooking ingredients — anything bought to cook at home
- Dining & Lifestyle: restaurants, bukas, suya, fast food, takeout, delivery apps, cafes, coffee, bars, lounges, clubs, nightlife, snacks eaten out
- Healthcare: hospital, clinic, pharmacy, drugs/medications, lab tests, health insurance
- Family & Dependents: school fees, children's upkeep, allowance to partner/girlfriend/boyfriend, remittance to parents/siblings, dependant support
- Debt Service: loan repayment, credit card payment, BNPL, debt settlement
- Savings & Investment: savings deposit, investment, mutual fund, stocks, treasury bills, fixed deposit
- Personal Care: salon, barbershop, spa, gym, clothes, shoes, skincare, cosmetics, shopping
- Betting: bet9ja, sportybet, nairabet, 1xbet, betway, betking, betting deposits, wagers
- Miscellaneous: bank charges (Stamp Duty, EMTL, USSD fees), anything that genuinely fits nothing above — last resort only

RULES:
- Airtime/data/recharge → Housing & Utilities
- Nigerian bank charges (Stamp Duty, Electronic Money Transfer Levy, USSD Charge) → Miscellaneous
- "Upkeep", "allowance to girlfriend/wife" → Family & Dependents
- Food bought from a shop/market to cook → Food & Groceries; eaten out or delivered → Dining & Lifestyle

Return ONLY a raw JSON array of exactly N objects in the same order as the input. No markdown, no explanation, no extra text — just the array:
[{"category":"...","subcategory":"...","essentiality":"Essential|Discretionary","nature":"Fixed|Variable","confidence":0.9,"note":"..."},...]`;

export async function POST(request) {
  const { entries } = await request.json();
  if (!entries?.length) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let settings = null;
  if (user) {
    const { data } = await supabase
      .from("user_ai_settings")
      .select("provider, gemini_key_encrypted, groq_key_encrypted, claude_key_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();
    settings = data;
  }

  const listText = entries.map((e, i) => `${i + 1}. "${e.description}" ₦${e.amount}`).join("\n");
  const userPrompt = `Categorize these ${entries.length} transactions:\n${listText}`;
  const maxTokens = Math.min(6000, entries.length * 160 + 400);

  let rawText = "";

  try {
    if (settings?.provider === "groq" && settings.groq_key_encrypted) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.groq_key_encrypted}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      rawText = data.choices?.[0]?.message?.content || "";

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
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      rawText = data.content?.[0]?.text || "";

    } else {
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No AI key configured.");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      rawText = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    }

    // Parse — strip markdown fences if the model included them
    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const parsed  = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error("Response is not an array");

    // Map results back; fill gaps with keyword fallback
    const results = entries.map((e, i) => {
      const r = parsed[i];
      if (r && r.category && r.essentiality && r.nature) {
        return { ...r, status: "done" };
      }
      return { ...fallbackCategorize(e.description), status: "fallback" };
    });

    return NextResponse.json({ results });

  } catch {
    // Full fallback: keyword-categorize every entry
    const results = entries.map((e) => ({ ...fallbackCategorize(e.description), status: "fallback" }));
    return NextResponse.json({ results });
  }
}
