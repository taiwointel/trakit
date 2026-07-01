import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TGAPI = (token) => `https://api.telegram.org/bot${token}`;

// This route is called by Telegram's servers, not the user.
// It has no authenticated session — we use the admin client with service role.
// The uid path param + the webhook secret header together verify legitimacy.

export async function POST(request, { params }) {
  const { uid } = params;
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");

  const db = createAdminClient();

  const { data: settings } = await db
    .from("telegram_settings")
    .select("bot_token_encrypted, chat_id, webhook_secret")
    .eq("user_id", uid)
    .maybeSingle();

  // Silently ignore unknown users
  if (!settings?.bot_token_encrypted) return NextResponse.json({ ok: true });

  // Verify the Telegram secret header
  if (settings.webhook_secret && secretHeader !== settings.webhook_secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update;
  try { update = await request.json(); } catch { return NextResponse.json({ ok: true }); }

  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text   = message.text.trim();

  // ── /start — link this chat to the user's account ────────────────────
  if (text === "/start" || text.startsWith("/start ")) {
    const { error: linkErr } = await db
      .from("telegram_settings")
      .update({ chat_id: chatId, updated_at: new Date().toISOString() })
      .eq("user_id", uid);

    if (linkErr) {
      await reply(settings.bot_token_encrypted, chatId,
        `⚠️ Telegram received your message but failed to link your account: ${linkErr.message}\n\n` +
        `Please try the *Re-register webhook* button in the Trakit7 app and send /start again.`,
      );
      return NextResponse.json({ ok: true });
    }

    await reply(settings.bot_token_encrypted, chatId,
      `👋 *Welcome to Trakit7!*\n\nYour account is now linked. Just send me a message like:\n\n` +
      `• \`3500 suya at Mallam Musa\`\n` +
      `• \`12000 rent Uba\`\n` +
      `• \`received 50000 salary\`\n` +
      `• \`2500k bolt Lagos-Ikeja\`\n\n` +
      `I'll log it to your ledger instantly and AI will categorize it.`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── /help ─────────────────────────────────────────────────────────────
  if (text === "/help") {
    await reply(settings.bot_token_encrypted, chatId,
      `*Trakit7 Bot — Quick Reference*\n\n` +
      `*Expenses (money out):*\n` +
      `\`AMOUNT DESCRIPTION\`\n` +
      `e.g. \`3500 suya\`, \`12k petrol total filling\`, \`₦4000 Bolt\`\n\n` +
      `*Income (money in):*\n` +
      `Start with \`received\`, \`got\`, \`income\`, \`salary\`, \`refund\`\n` +
      `e.g. \`received 50000 salary\`, \`got 3000 refund from konga\`\n\n` +
      `*Shortcuts:*\n` +
      `\`12k\` = ₦12,000  |  \`1.5m\` = ₦1,500,000\n\n` +
      `/start — relink this chat\n/help — show this message`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── Verify the message comes from the registered chat ────────────────
  if (settings.chat_id && settings.chat_id !== chatId) {
    await reply(settings.bot_token_encrypted, chatId,
      "❌ This chat isn't linked to your account. Send /start to link it.",
    );
    return NextResponse.json({ ok: true });
  }

  if (!settings.chat_id) {
    await reply(settings.bot_token_encrypted, chatId,
      "Send /start first to link this chat to your Trakit7 account.",
    );
    return NextResponse.json({ ok: true });
  }

  // ── Parse the expense ─────────────────────────────────────────────────
  const parsed = parseExpense(text);
  if (!parsed) {
    await reply(settings.bot_token_encrypted, chatId,
      `❓ Couldn't read that as an expense.\n\nTry: \`3500 suya\` or \`received 50000 salary\`\nSend /help for all formats.`,
    );
    return NextResponse.json({ ok: true });
  }

  // ── Write to entries ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await db.from("entries").insert({
    user_id:     uid,
    date:        today,
    desc:        parsed.description,
    amount:      parsed.amount,
    flow:        parsed.flow,
    beneficiary: null,
    status:      "pending",
  });

  if (error) {
    await reply(settings.bot_token_encrypted, chatId,
      `❌ Failed to log: ${error.message}`,
    );
    return NextResponse.json({ ok: true });
  }

  const icon   = parsed.flow === "out" ? "🔴" : "🟢";
  const dir    = parsed.flow === "out" ? "Out" : "In";
  const amount = parsed.amount.toLocaleString("en-NG");

  await reply(settings.bot_token_encrypted, chatId,
    `${icon} *${dir}: ₦${amount}*\n_${parsed.description}_\n\nLogged for ${today}. Open Trakit7 to review & categorize.`,
  );

  return NextResponse.json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function reply(token, chatId, text) {
  await fetch(`${TGAPI(token)}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

function parseExpense(text) {
  // Detect income openers
  const incomeRe  = /^(received?|got|income|credit|salary|refund|transfer ?in|paid me)\s+/i;
  const isIncome  = incomeRe.test(text);
  const remainder = text.replace(incomeRe, "").trim();

  // Strip optional ₦ prefix
  const stripped = remainder.replace(/^₦\s*/, "").trim();

  // Match: AMOUNT DESCRIPTION
  // Amount supports: 3500 | 3,500 | 3.5k | 3.5K | 1.5m | 1.5M
  const amountRe = /^([0-9][0-9,]*(?:\.[0-9]+)?(?:[kKmM])?)\s+(.+)$/;
  const match    = stripped.match(amountRe);
  if (!match) return null;

  let raw = match[1].replace(/,/g, "");
  let amount;
  if (/[kK]$/.test(raw)) amount = parseFloat(raw) * 1_000;
  else if (/[mM]$/.test(raw)) amount = parseFloat(raw) * 1_000_000;
  else amount = parseFloat(raw);

  if (!amount || amount <= 0 || !isFinite(amount)) return null;

  const description = match[2].trim();
  if (!description) return null;

  return { amount, description, flow: isIncome ? "in" : "out" };
}
