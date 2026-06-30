import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const USER_TABLES = [
  "entries",
  "budgets",
  "cash_balance",
  "investment_transactions",
  "investments",
  "goals",
  "emergency_fund_transactions",
  "custom_goals",
  "user_ai_settings",
  "coach_sessions",
  "chat_messages",
];

export async function POST(request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { confirm } = await request.json().catch(() => ({}));
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text did not match." }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Account deletion isn't configured yet. Ask the app owner to set SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // investment_transactions has no user_id of its own — it's keyed off investment_id,
  // so delete it via the investments owned by this user first.
  const { data: ownInvestments } = await admin
    .from("investments")
    .select("id")
    .eq("user_id", user.id);
  const investmentIds = (ownInvestments || []).map((i) => i.id);
  if (investmentIds.length) {
    await admin.from("investment_transactions").delete().in("investment_id", investmentIds);
  }

  for (const table of USER_TABLES) {
    if (table === "investment_transactions") continue;
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error && error.code !== "42P01") {
      // 42P01 = table doesn't exist yet (migration not run) — safe to ignore, nothing to clean up
      return NextResponse.json({ error: `Failed clearing ${table}: ${error.message}` }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
