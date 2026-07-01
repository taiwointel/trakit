import { NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checks = [];

  // 1. SUPABASE_SERVICE_ROLE_KEY present?
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.push({
    name: "SUPABASE_SERVICE_ROLE_KEY env var",
    ok: hasServiceKey,
    detail: hasServiceKey
      ? "Configured"
      : "Not set — the Telegram webhook cannot write to Supabase without this. Add it in Vercel → Settings → Environment Variables (copy the service_role key from Supabase dashboard → Project Settings → API).",
  });

  // 2. NEXT_PUBLIC_APP_URL present?
  const url = appUrl();
  const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL;
  checks.push({
    name: "NEXT_PUBLIC_APP_URL env var",
    ok: hasAppUrl,
    detail: hasAppUrl
      ? `${process.env.NEXT_PUBLIC_APP_URL}`
      : url
        ? `Falling back to VERCEL_URL: ${url}. This changes every deployment, so webhook URLs may go stale. Set NEXT_PUBLIC_APP_URL to your canonical domain (e.g. https://trakit-seven.vercel.app).`
        : "Neither NEXT_PUBLIC_APP_URL nor VERCEL_URL is set — webhook URL cannot be built.",
  });

  // 3. Admin client can query telegram_settings?
  let adminOk = false;
  let adminDetail = "Not tested";
  try {
    const db = createAdminClient();
    const { error } = await db
      .from("telegram_settings")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    adminOk = !error;
    adminDetail = error ? `Error: ${error.message}` : "Query succeeded";
  } catch (e) {
    adminDetail = `Exception: ${e.message}`;
  }
  checks.push({
    name: "Admin client DB access (needed by webhook)",
    ok: adminOk,
    detail: adminDetail,
  });

  // 4. telegram_settings row exists?
  const { data: settings } = await supabase
    .from("telegram_settings")
    .select("bot_token_encrypted, bot_username, chat_id, webhook_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasSettings = !!settings?.bot_token_encrypted;
  checks.push({
    name: "telegram_settings row",
    ok: hasSettings,
    detail: hasSettings
      ? `Bot: @${settings.bot_username} | Chat linked: ${settings.chat_id ? "Yes ✓" : "No — need to send /start"}`
      : "No row — connect a bot token first",
  });

  // 5. Webhook URL registered in Telegram?
  if (hasSettings) {
    try {
      const wRes  = await fetch(`https://api.telegram.org/bot${settings.bot_token_encrypted}/getWebhookInfo`);
      const wData = await wRes.json();
      if (wData.ok) {
        const expected = url ? `${url}/api/telegram/webhook/${user.id}` : null;
        const actual   = wData.result.url || "(none registered)";
        const urlOk    = expected ? actual === expected : false;
        checks.push({
          name: "Telegram webhook URL",
          ok: urlOk,
          detail: expected
            ? (urlOk
                ? `Correct: ${actual}`
                : `Mismatch — Telegram is calling the wrong URL.\nExpected: ${expected}\nActual:   ${actual}\n→ Click "Re-register webhook" in the app to fix this.`)
            : `Cannot verify (no app URL env var). Actual registered: ${actual}`,
          webhookLastError: wData.result.last_error_message || null,
        });
        if (wData.result.last_error_message) {
          checks.push({
            name: "Last webhook delivery error from Telegram",
            ok: false,
            detail: `${wData.result.last_error_message} (at ${wData.result.last_error_date ? new Date(wData.result.last_error_date * 1000).toISOString() : "unknown time"})`,
          });
        }
      }
    } catch (e) {
      checks.push({ name: "Telegram webhook URL", ok: false, detail: `Could not fetch from Telegram API: ${e.message}` });
    }
  }

  return NextResponse.json({ checks });
}
