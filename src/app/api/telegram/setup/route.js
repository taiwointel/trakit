import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botToken, chatId } = await request.json();
  if (!botToken || !chatId) return NextResponse.json({ error: "Missing botToken or chatId" }, { status: 400 });

  try {
    await supabase.from("user_ai_settings").upsert({
      user_id:             user.id,
      telegram_bot_token:  botToken,
      telegram_chat_id:    String(chatId),
    }, { onConflict: "user_id" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Could not save. Run the migration first." }, { status: 500 });
  }
}
