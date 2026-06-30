import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const USER_TABLES = [
  "entries",
  "budgets",
  "cash_balance",
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

  // Step 1: delete investment_transactions (keyed off investment_id, not user_id directly).
  // Fetch owned investment IDs first, then bulk-delete child rows.
  const { data: ownInvestments } = await supabase
    .from("investments")
    .select("id")
    .eq("user_id", user.id);
  const investmentIds = (ownInvestments || []).map((i) => i.id);
  if (investmentIds.length) {
    await supabase.from("investment_transactions").delete().in("investment_id", investmentIds);
  }

  // Step 2: delete all user-owned tables via the regular server client.
  // RLS (DELETE policy: user_id = auth.uid()) handles authorization — no service role needed.
  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error && error.code !== "42P01") {
      // 42P01 = table doesn't exist yet; safe to skip. Any other error is unexpected.
      console.error(`Delete from ${table} failed:`, error.message);
    }
  }

  // Step 3: if service role key is configured, permanently delete the auth.users record too.
  // Without it the data is wiped and the user is signed out — effectively deleted from their POV.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Auth user deletion failed:", deleteError.message);
      // Data is already wiped — proceed with sign-out anyway
    }
  }

  return NextResponse.json({ ok: true });
}
