import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fallbackCategorize } from "@/lib/categories";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.message) return NextResponse.json({ ok: true });

  const chatId = body.message.chat?.id;
  const text   = (body.message.text || "").trim();
  if (!text || !chatId) return NextResponse.json({ ok: true });

  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("user_id, telegram_chat_id, telegram_bot_token")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseMessage(text);
  if (!parsed) return NextResponse.json({ ok: true });

  const cats  = fallbackCategorize(parsed.desc);
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("entries").insert({
    user_id:      settings.user_id,
    date:         today,
    desc:         parsed.desc,
    amount:       parsed.amount,
    flow:         parsed.flow,
    beneficiary:  null,
    category:     cats.category,
    essentiality: cats.essentiality,
    nature:       cats.nature,
    confidence:   cats.confidence,
    subcategory:  cats.subcategory,
    note:         "Via Telegram",
    status:       "fallback",
  });

  return NextResponse.json({ ok: true, logged: parsed });
}

function parseMessage(text) {
  const t    = text.toLowerCase().trim();
  const flow = t.includes(" in") || t.startsWith("in ") || t.endsWith(" in") ? "in" : "out";

  const amtMatch = text.match(/(\d[\d,]*\.?\d*)\s*([km])?/i);
  if (!amtMatch) return null;

  let amount = parseFloat(amtMatch[1].replace(/,/g, ""));
  const multiplier = amtMatch[2]?.toLowerCase();
  if (multiplier === "k") amount *= 1000;
  if (multiplier === "m") amount *= 1000000;
  if (isNaN(amount) || amount <= 0) return null;

  const beforeNum = text.slice(0, text.search(/\d/)).trim();
  const desc = beforeNum.replace(/^(in|out)\s+/i, "").trim() || "Telegram entry";

  return { desc: desc.charAt(0).toUpperCase() + desc.slice(1), amount, flow };
}
