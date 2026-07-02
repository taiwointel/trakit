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
        : "") + (files.length > 0
        ? `\n\n${name} has attached ${files.length} file(s) to this message. File upload analysis is only supported when using Gemini. Ask ${name} to switch to Gemini in Settings to get AI analysis of uploaded documents and images.`
        : "");

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
        : "") + (files.length > 0
        ? `\n\n${name} has attached ${files.length} file(s). File upload analysis requires Gemini. Let ${name} know they should switch to Gemini in Settings to use this feature.`
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
      // Gemini (default) — supports multimodal via inline_data
      const key = settings?.gemini_key_encrypted;
      if (!key) throw new Error("No AI key configured. Open Settings and add one.");

      const geminiSystem = systemPrompt + (webSearch
        ? `\n\nWhen you use Google Search, always name your source explicitly and remind ${name || "the user"} that rates change — they should verify directly with the provider before acting. Never present yourself as executing a financial decision, only informing one.`
        : "") + (files.length > 0
        ? `\n\n${name} has uploaded ${files.length} file(s) for analysis. Read them carefully and give specific, detailed insights based on the actual content — amounts, dates, merchants, patterns you notice. Reference specific figures from the documents in your response.`
        : "");

      // Build Gemini contents with multimodal support for the last user message
      const geminiContents = messages.map((m, idx) => {
        const isLastUser = idx === messages.length - 1 && m.role === "user";
        const parts = [];

        if (m.content && m.content.trim()) {
          parts.push({ text: m.content });
        }

        // Attach uploaded files only to the current (last) user message
        if (isLastUser && files.length > 0) {
          for (const file of files) {
            parts.push({
              inline_data: {
                mime_type: file.mimeType,
                data: file.data,
              },
            });
          }
        }

        if (parts.length === 0) parts.push({ text: "" });

        return {
          role: m.role === "assistant" ? "model" : "user",
          parts,
        };
      });

      const geminiBody = {
        system_instruction: { parts: [{ text: geminiSystem }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
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
