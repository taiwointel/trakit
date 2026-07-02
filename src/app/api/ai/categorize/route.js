import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_NAMES, fallbackCategorize } from "@/lib/categories";
import { callGemini } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are an expense categorizer for a Nigerian personal finance app called Trakit7.
Given a transaction description and amount in Naira, classify it into exactly one of these 11 categories.

CATEGORIES — what belongs in each:
- Housing & Utilities: rent, electricity (NEPA/PHCN), water bill, generator fuel/diesel, internet/WiFi, DSTV/cable TV, estate dues, mobile data bundles, airtime top-ups, phone recharge
- Transportation: Uber, Bolt, fuel/petrol, bus/keke/okada fare, flight tickets, car maintenance
- Food & Groceries: market shopping, supermarket, raw foodstuff, noodles (Indomie etc.), eggs, bread, rice, beans, yam, pasta, tomatoes, pepper, onion, fish, chicken, meat, vegetables, cooking ingredients, provisions — anything bought raw or for home cooking
- Dining & Lifestyle: restaurants, bukas, suya spots, fast food, takeout, food delivery apps (Chowdeck/Glovo), cafes, coffee, soft drinks at a bar/restaurant, beer, wine, malt, lounges, clubs, nightlife, snacks eaten out or at entertainment venues
- Healthcare: hospital bills, clinic visits, pharmacy, drugs/medications, lab tests, health insurance premiums
- Family & Dependents: school fees, children's upkeep, allowance or upkeep for partner/girlfriend/boyfriend, remittance to parents or siblings, money sent to relatives, dependant support
- Debt Service: loan repayment, credit card payment, BNPL repayment, debt settlement
- Savings & Investment: savings deposit, investment purchase, mutual fund, stocks, treasury bills, fixed deposit, target savings contribution
- Personal Care: salon, barbershop, spa, gym membership, clothes, shoes, bags, skincare, cosmetics, personal shopping
- Betting: bet9ja, sportybet, nairabet, 1xbet, betway, betking, sportybet, betting deposits, wagers, sports betting
- Miscellaneous: bank charges (Stamp Duty, EMTL, USSD fees), transactions that genuinely don't fit any category above — use this as a last resort only

DECISION RULES:
- "Noodles", "eggs", "bread", or food items from a shop/market → Food & Groceries
- "Soft drink", "beer", "malt" at a bar/restaurant/lounge → Dining & Lifestyle; bought from a shop/supermarket → Food & Groceries
- "Upkeep", "allowance to girlfriend/wife/partner", "money for [person]" → Family & Dependents
- "Data bundle", "airtime", "recharge" → Housing & Utilities
- Nigerian bank charges (Stamp Duty, Electronic Money Transfer Levy, USSD Charge) → Miscellaneous
- When torn between Food & Groceries and Dining & Lifestyle: if eaten out or delivered → Dining; if cooked at home → Groceries

Return ONLY raw JSON (no markdown fences) in this exact shape:
{
  "category": "<one of the 11 categories above>",
  "subcategory": "<short descriptive label, e.g. 'Noodles and eggs' or 'Girlfriend upkeep'>",
  "essentiality": "<Essential | Discretionary>",
  "nature": "<Fixed | Variable>",
  "confidence": <0.0 to 1.0>,
  "note": "<≤10-word rationale>"
}`;

export async function POST(request) {
  const { description, amount } = await request.json();

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

  const userPrompt = `Description: "${description}"\nAmount: ₦${amount}`;

  try {
    let text = "";

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
          max_tokens: 200,
          temperature: 0.1,
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
          max_tokens: 200,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      text = data.content?.[0]?.text || "";

    } else {
      // Default: Gemini — with automatic fallback to gemini-1.5-flash on quota errors
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No Gemini key");
      text = await callGemini(key, {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
      });
    }

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const result = JSON.parse(cleaned);
    return NextResponse.json({ ...result, status: "done" });

  } catch {
    return NextResponse.json({ ...fallbackCategorize(description), status: "fallback" });
  }
}
