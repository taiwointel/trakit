import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("gemini_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const key = settings?.gemini_key_encrypted;
  if (!key) return NextResponse.json({ error: "No Gemini key configured in Settings." }, { status: 400 });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message || "Gemini error" }, { status: 500 });

  const models = (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => ({
      id:          m.name.replace("models/", ""),
      displayName: m.displayName,
      description: m.description,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return NextResponse.json({ models });
}
