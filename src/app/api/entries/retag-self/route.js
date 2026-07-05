import { createClient } from "@/lib/supabase/server";
import { isSelfTransfer, internalTransferFields } from "@/lib/selfTransfer";
import { NextResponse } from "next/server";

// One-time (repeatable) sweep over already-imported entries: catches
// self-transfers that slipped through at import time because the display
// name hadn't been set yet, or the statement being imported didn't carry a
// recognizable "Account Name:" line for extractAccountHolderName to use.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fullName = user.user_metadata?.full_name;
  if (!fullName) {
    return NextResponse.json(
      { error: "Set your display name in Settings first — matching needs it to compare against beneficiaries." },
      { status: 400 },
    );
  }

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, beneficiary, category")
    .eq("user_id", user.id)
    .neq("category", "Self");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toUpdate = (entries || []).filter((e) => isSelfTransfer(e.beneficiary, fullName));
  if (!toUpdate.length) return NextResponse.json({ retagged: 0 });

  const { error: updErr } = await supabase
    .from("entries")
    .update(internalTransferFields())
    .in("id", toUpdate.map((e) => e.id));
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ retagged: toUpdate.length });
}
