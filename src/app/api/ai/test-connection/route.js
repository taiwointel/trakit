import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, gemini_key_encrypted, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .single();

  if (!settings) {
    return NextResponse.json({ message: "No AI settings found. Add a key first." }, { status: 400 });
  }

  const { provider } = settings;

  try {
    if (provider === "gemini") {
      const key = settings.gemini_key_encrypted;
      if (!key) return NextResponse.json({ message: "No Gemini key saved." }, { status: 400 });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with exactly one lowercase word: ok" }] }] }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Gemini error");
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return NextResponse.json({ message: `Gemini: ${text}` });
    }

    if (provider === "groq") {
      const key = settings.groq_key_encrypted;
      if (!key) return NextResponse.json({ message: "No Groq key saved." }, { status: 400 });

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Reply with exactly one lowercase word: ok" }],
          max_tokens: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Groq error");
      const text = data.choices?.[0]?.message?.content?.trim();
      return NextResponse.json({ message: `Groq: ${text}` });
    }

    if (provider === "claude") {
      const key = settings.claude_key_encrypted;
      if (!key) return NextResponse.json({ message: "No Claude key saved." }, { status: 400 });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 5,
          messages: [{ role: "user", content: "Reply with exactly one lowercase word: ok" }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Claude error");
      const text = data.content?.[0]?.text?.trim();
      return NextResponse.json({ message: `Claude: ${text}` });
    }

    return NextResponse.json({ message: "Unknown provider." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
