import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const TGAPI = (token) => `https://api.telegram.org/bot${token}`;

function appUrl() {
  // NEXT_PUBLIC_APP_URL should be your canonical production domain.
  // Falls back to the Vercel deployment URL, then localhost for dev.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// GET — return current connection status (never return the raw token)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("telegram_settings")
    .select("bot_token_encrypted, bot_username, chat_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected:   !!data?.bot_token_encrypted,
    botUsername: data?.bot_username || null,
    chatLinked:  !!data?.chat_id,
  });
}

// POST { token } — validate token, auto-set webhook, save
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json();
  if (!token?.trim()) return NextResponse.json({ error: "Token is required." }, { status: 400 });

  // 1. Validate token by calling getMe
  const meRes  = await fetch(`${TGAPI(token)}/getMe`);
  const meData = await meRes.json();
  if (!meData.ok) {
    return NextResponse.json(
      { error: `Invalid bot token: ${meData.description}` },
      { status: 400 },
    );
  }
  const botUsername = meData.result.username;

  // 2. Generate a per-user webhook secret
  const webhookSecret = crypto.randomBytes(32).toString("hex");

  // 3. Register the webhook with Telegram
  const webhookUrl = `${appUrl()}/api/telegram/webhook/${user.id}`;
  const setRes  = await fetch(`${TGAPI(token)}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url:             webhookUrl,
      secret_token:    webhookSecret,
      allowed_updates: ["message"],
    }),
  });
  const setData = await setRes.json();
  if (!setData.ok) {
    return NextResponse.json(
      { error: `Could not set webhook: ${setData.description}` },
      { status: 400 },
    );
  }

  // 4. Persist
  const { error } = await supabase
    .from("telegram_settings")
    .upsert({
      user_id:             user.id,
      bot_token_encrypted: token.trim(),
      bot_username:        botUsername,
      webhook_secret:      webhookSecret,
      chat_id:             null,
      updated_at:          new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, botUsername, webhookUrl });
}

// DELETE — remove webhook and clear settings
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("telegram_settings")
    .select("bot_token_encrypted")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data?.bot_token_encrypted) {
    await fetch(`${TGAPI(data.bot_token_encrypted)}/deleteWebhook`).catch(() => {});
  }

  await supabase.from("telegram_settings").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
