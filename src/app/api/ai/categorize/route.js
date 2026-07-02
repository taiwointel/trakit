import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_NAMES, fallbackCategorize } from "@/lib/categories";
import { callGemini } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are an expense categorizer for a Nigerian personal finance app.
Given a transaction description and amount, classify it into exactly one category from this list:
${CATEGORY_NAMES.join(", ")}

Return ONLY raw JSON (no markdown fences) in this exact shape:
{
  "category": "<one of the categories above>",
  "subcategory": "<short free-text subcategory>",
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
