import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fallbackCategorize } from "@/lib/categories";
import { lookupMerchantRules, saveMerchantRule, normalizeMerchantKey } from "@/lib/merchantRules";

const SYSTEM_PROMPT = `You are an expense categorizer for a Nigerian personal finance app called Trakit7.
Given a numbered list of transactions, classify each into exactly one of these 11 categories.

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
- Charges: ONLY for Nigerian bank-generated charges — Stamp Duty, EMTL, USSD Charge, SMS alert fee, account/card maintenance fee, COT, Commission (including "Commission Mobile Trf", transfer commission), VAT on bank charges. Do NOT use for regular transactions you are unsure about.

DECISION RULES:
- "Noodles", "eggs", "bread", or food items from a shop/market → Food & Groceries
- "Soft drink", "beer", "malt" at a bar/restaurant/lounge → Dining & Lifestyle; bought from a shop/supermarket → Food & Groceries
- "Upkeep", "allowance to girlfriend/wife/partner", "money for [person]" → Family & Dependents
- "Data bundle", "airtime", "recharge" → Housing & Utilities
- Nigerian bank charges (Stamp Duty, EMTL, USSD Charge, SMS alert fee, maintenance fee, COT, VAT on charges) → Charges, subcategory MUST be "Bank charges"
- Transfers to a named person with no other context → Family & Dependents (most personal transfers in Nigeria are support payments)
- When torn between Food & Groceries and Dining & Lifestyle: if eaten out or delivered → Dining; if cooked at home → Groceries
- When genuinely unsure, pick the closest specific category — Charges is NOT a catch-all

Return ONLY a raw JSON array of exactly N objects in the same order as the input. No markdown, no explanation, no extra text — just the array:
[{"category":"...","subcategory":"...","essentiality":"Essential|Discretionary","nature":"Fixed|Variable","confidence":0.9,"note":"..."},...]`;

export const maxDuration = 60;

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

  // Learned rules first: any entry whose beneficiary/narration has been
  // categorized before (by AI or a manual correction) is resolved instantly
  // with no AI call. Only genuinely unrecognized entries go to the model.
  const learnedMap = user ? await lookupMerchantRules(supabase, user.id, entries) : new Map();
  const results = new Array(entries.length).fill(null);
  const pending = []; // { entry, originalIndex }

  entries.forEach((e, i) => {
    const key = learnedMap.size ? normalizeMerchantKey(e.description, e.beneficiary) : null;
    const learned = key ? learnedMap.get(key) : null;
    if (learned) {
      results[i] = { ...learned, confidence: 0.95, status: "done" };
    } else {
      pending.push({ entry: e, originalIndex: i });
    }
  });

  if (pending.length === 0) {
    return NextResponse.json({ results });
  }

  const listText = pending.map(({ entry: e }, i) => `${i + 1}. "${e.description}" ₦${e.amount}`).join("\n");
  const userPrompt = `Categorize these ${pending.length} transactions:\n${listText}`;
  const maxTokens = Math.min(24000, pending.length * 160 + 400);

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

    // Map results back into the sparse `results` array (learned entries were
    // already filled in above); fill gaps with keyword fallback, and teach
    // the merchant_rules table so the same beneficiary/narration never needs
    // AI again.
    if (user) {
      await Promise.all(pending.map(({ entry: e, originalIndex: i }) => {
        const r = parsed[i];
        if (r && r.category && r.essentiality && r.nature) {
          results[i] = { ...r, status: "done" };
          return saveMerchantRule(supabase, user.id, e.description, e.beneficiary, r);
        }
        results[i] = { ...fallbackCategorize(e.description), status: "fallback" };
        return null;
      }));
    } else {
      pending.forEach(({ entry: e, originalIndex: i }) => {
        const r = parsed[i];
        results[i] = (r && r.category && r.essentiality && r.nature)
          ? { ...r, status: "done" }
          : { ...fallbackCategorize(e.description), status: "fallback" };
      });
    }

    return NextResponse.json({ results });

  } catch {
    // Full fallback: keyword-categorize every still-pending entry
    pending.forEach(({ entry: e, originalIndex: i }) => {
      results[i] = { ...fallbackCategorize(e.description), status: "fallback" };
    });
    return NextResponse.json({ results });
  }
}
