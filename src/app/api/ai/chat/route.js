import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function buildPersona(name) {
  const n = name || "you";
  return `You are Coach RBC — a sharp, warm, no-nonsense personal finance coach. Your client's name is ${n}. You have deep knowledge of Nigerian financial products and context: naira volatility, high cost of essentials, PFAs, treasury bills, commercial papers, fixed deposit rates, equity markets, and the day-to-day realities of managing money in Nigeria. You are direct, encouraging, and never preachy. You give concrete, actionable advice. Always address ${n} by name. Keep responses clear and concise — typically 2–4 paragraphs unless a detailed breakdown adds real value.`;
}

export async function POST(request) {
  const body = await request.json();
  const { messages, webSearch, snapshot } = body;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, gemini_key_encrypted, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const snapshotText = snapshot
    ? `\n\n${name}'s current financial snapshot (computed live from their ledger):\n${JSON.stringify(snapshot, null, 2)}`
    : "";

  const systemPrompt = buildPersona(name) + snapshotText;

  try {
    let reply = "";

    if (settings?.provider === "groq" && settings.groq_key_encrypted) {
      const groqSystem = systemPrompt + (webSearch
        ? `\n\n${name || "The user"} has turned on web research. Use it to ground your answer in current information. When you cite something you found, name the source plainly. Rates, fees, and product terms change — always tell ${name || "them"} to verify the exact figure directly with the provider before acting on it. Never present yourself as executing a financial decision, only informing one.`
        : "");

      // "groq/compound" runs Groq's agentic system with built-in real-time web search.
      // Fall back to the plain chat model when search is off, since it's faster and cheaper.
      const groqModel = webSearch ? "groq/compound" : "llama-3.3-70b-versatile";

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.groq_key_encrypted}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "system", content: groqSystem }, ...messages],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
      let data = await res.json();
      if (!res.ok && webSearch) {
        // Compound model unavailable on this account/tier — retry on the standard model
        // without ever telling the user search failed; just answer from training knowledge.
        const fallbackRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.groq_key_encrypted}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: groqSystem }, ...messages],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });
        data = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(data.error?.message || "Groq error");
      } else if (!res.ok) {
        throw new Error(data.error?.message || "Groq error");
      }
      reply = data.choices?.[0]?.message?.content || "";

    } else if (settings?.provider === "claude" && settings.claude_key_encrypted) {
      const claudeSystem = systemPrompt + (webSearch
        ? `\n\nWhen you use web search, always name your source explicitly and remind ${name || "the user"} that rates change — they should verify directly with the provider before acting. Never present yourself as executing a financial decision, only informing one.`
        : "");

      const claudeHeaders = {
        "Content-Type": "application/json",
        "x-api-key": settings.claude_key_encrypted,
        "anthropic-version": "2023-06-01",
      };
      if (webSearch) claudeHeaders["anthropic-beta"] = "web-search-2025-03-05";

      const claudeBody = {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: claudeSystem,
        messages,
      };
      if (webSearch) {
        claudeBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: claudeHeaders,
        body: JSON.stringify(claudeBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Claude error");
      // Collect all text blocks (search may interleave tool_use + text blocks)
      const textBlocks = data.content?.filter((b) => b.type === "text") || [];
      reply = textBlocks.map((b) => b.text).join("") || "";

    } else {
      // Gemini (default)
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No AI key configured. Open Settings and add one.");

      const geminiSystem = systemPrompt + (webSearch
        ? `\n\nWhen you use Google Search, always name your source explicitly and remind ${name || "the user"} that rates change — they should verify directly with the provider before acting. Never present yourself as executing a financial decision, only informing one.`
        : "");

      const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const geminiBody = {
        system_instruction: { parts: [{ text: geminiSystem }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      };
      if (webSearch) {
        geminiBody.tools = [{ google_search: {} }];
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini error");
      reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    }

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
