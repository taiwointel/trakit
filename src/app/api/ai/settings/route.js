import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data } = await supabase
    .from("user_ai_settings")
    .select("provider, groq_key_encrypted, claude_key_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasGroqKey   = !!(data?.groq_key_encrypted);
  const hasClaudeKey = !!(data?.claude_key_encrypted);

  return NextResponse.json({
    provider:      data?.provider || "groq",
    hasKey:        hasGroqKey || hasClaudeKey,
    hasGroqKey,
    hasClaudeKey,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { provider, key } = await request.json();
  if (!["groq", "claude"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const keyColumn = `${provider}_key_encrypted`;
  const { error } = await supabase
    .from("user_ai_settings")
    .upsert(
      { user_id: user.id, provider, [keyColumn]: key },
      { onConflict: "user_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
