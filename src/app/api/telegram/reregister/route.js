import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TGAPI = (token) => `https://api.telegram.org/bot${token}`;

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// POST — re-register the webhook URL without requiring the user to re-enter their token.
// Useful when NEXT_PUBLIC_APP_URL was missing at the time of initial setup and the
// webhook was registered against a stale Vercel deployment URL.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase
    .from("telegram_settings")
    .select("bot_token_encrypted, webhook_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.bot_token_encrypted) {
    return NextResponse.json({ error: "No bot connected." }, { status: 400 });
  }

  const webhookUrl = `${appUrl()}/api/telegram/webhook/${user.id}`;

  const setRes  = await fetch(`${TGAPI(settings.bot_token_encrypted)}/setWebhook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      url:             webhookUrl,
      secret_token:    settings.webhook_secret,
      allowed_updates: ["message"],
    }),
  });
  const setData = await setRes.json();

  if (!setData.ok) {
    return NextResponse.json(
      { error: `Could not re-register webhook: ${setData.description}` },
      { status: 400 },
    );
  }

  // Clear any stale chat_id so the user must send /start again to re-link
  await supabase
    .from("telegram_settings")
    .update({ chat_id: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, webhookUrl });
}
