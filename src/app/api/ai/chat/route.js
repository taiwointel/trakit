import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function buildPersona(name) {
  const n = name || "you";
  return `You are Coach RBC — a sharp, witty, warm-hearted personal finance coach with a genuine sense of humor. Your client is ${n}. You have deep knowledge of Nigerian financial products and the lived realities of managing money in Nigeria: naira volatility that would make a cardiologist nervous, PFAs that feel like a mystery box, NEPA bills arriving like unwanted relatives, T-Bills that finally click once you're past the FOMO, fixed deposit rates that almost beat inflation (almost), and the very specific grief of checking your balance on a Wednesday afternoon.

Your humor is your secret weapon — a well-placed quip lands harder than a lecture ever could. You roast bad financial habits gently but pointedly: "That's three consecutive weeks of ₦18k on food delivery, ${n}. The restaurant knows your face better than your savings account does." You celebrate wins with genuine energy. You call out patterns with a raised eyebrow, not a wagging finger.

You are direct, funny, and actionable. Never preachy, never generic, never boring. You speak like a brilliant friend who happens to know ${n}'s numbers better than they do — and isn't afraid to say what they see. Always address ${n} by name. Keep responses clear and punchy — typically 2–4 paragraphs unless a detailed breakdown genuinely adds value.`;
}

export async function POST(request) {
  const body = await request.json();
  const { messages, webSearch, snapshot, files = [] } = body;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const snapshotText = snapshot
    ? `\n\n${name}'s current financial snapshot (computed live from their ledger):\n${JSON.stringify(snapshot, null, 2)}`
    : "";

  const systemPrompt = buildPersona(name) + snapshotText;

  const hasFiles = files.length > 0;

  try {
    let reply = "";

    if (settings?.provider === "claude" && settings.claude_key_encrypted) {
      const claudeSystem = systemPrompt + (webSearch
        ? `\n\nWhen you use web search, always name your source explicitly and remind ${name || "the user"} that rates change — they should verify directly with the provider before acting. Never present yourself as executing a financial decision, only informing one.`
        : "") + (hasFiles
        ? `\n\n${name} has attached ${files.length} file(s). File upload analysis isn't available on Claude in this app yet — let ${name} know they should switch to Groq in Settings to use this feature.`
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
      const textBlocks = data.content?.filter((b) => b.type === "text") || [];
      reply = textBlocks.map((b) => b.text).join("") || "";

    } else {
      // Groq (default)
      const key = settings?.groq_key_encrypted;
      if (!key) throw new Error("No AI key configured. Open Settings and add one.");

      if (hasFiles) {
        // Vision path — qwen/qwen3.6-27b reads images directly via an
        // OpenAI-compatible image_url data URI. Attached only to the
        // current (last) user message, same as every provider before this.
        const groqSystem = systemPrompt + `\n\n${name} has uploaded ${files.length} file(s) for analysis. Read them carefully and give specific, detailed insights based on the actual content — amounts, dates, merchants, patterns you notice. Reference specific figures from the documents in your response.`;

        const groqMessages = messages.map((m, idx) => {
          const isLastUser = idx === messages.length - 1 && m.role === "user";
          if (!isLastUser) return m;
          const content = [];
          if (m.content && m.content.trim()) content.push({ type: "text", text: m.content });
          for (const file of files) {
            content.push({ type: "image_url", image_url: { url: `data:${file.mimeType};base64,${file.data}` } });
          }
          return { role: m.role, content };
        });

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: "qwen/qwen3.6-27b",
            messages: [{ role: "system", content: groqSystem }, ...groqMessages],
            max_completion_tokens: 1200,
            temperature: 0.7,
            // qwen3.6-27b is a "thinking" model — without this it emits its
            // chain-of-thought as visible <think>...</think> text ahead of
            // the actual reply. "none" gives a plain answer, same as every
            // other model in this app.
            reasoning_effort: "none",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Groq vision error");
        // Defensive strip in case a <think> block still slips through.
        reply = (data.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();

      } else {
        const groqSystem = systemPrompt + (webSearch
          ? `\n\n${name || "The user"} has turned on web research. Use it to ground your answer in current information. When you cite something you found, name the source plainly. Rates, fees, and product terms change — always tell ${name || "them"} to verify the exact figure directly with the provider before acting on it. Never present yourself as executing a financial decision, only informing one.`
          : "");

        const groqModel = webSearch ? "groq/compound" : "llama-3.3-70b-versatile";

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "system", content: groqSystem }, ...messages],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });
        let data = await res.json();
        if (!res.ok && webSearch) {
          const fallbackRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
