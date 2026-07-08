import { createClient } from "@/lib/supabase/server";
import { isSelfTransfer, isSelfTransferInText, isGenericSelfFundingNarration, internalTransferFields } from "@/lib/selfTransfer";
import { NextResponse } from "next/server";

// One-time (repeatable) sweep over already-imported entries: catches
// self-transfers that slipped through at import time because the display
// name hadn't been set yet, or the statement being imported didn't carry a
// recognizable "Account Name:" line for extractAccountHolderName to use.
// The generic-narration check (e.g. "Interbank transfer") needs no name at
// all, so it still runs even without a display name set — only the two
// name-matching passes require one.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fullName = user.user_metadata?.full_name;

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, desc, beneficiary, category")
    .eq("user_id", user.id)
    .neq("category", "Self");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Three passes: rows where beneficiary was populated but didn't match yet
  // (e.g. display name set after import), rows where beneficiary was never
  // extracted at all (a parser gap) — caught by scanning the raw
  // description text — and rows with no counterparty name at all, just a
  // generic system narration for the user's own wallet funding.
  const toUpdate = (entries || []).filter(
    (e) => (fullName && isSelfTransfer(e.beneficiary, fullName)) ||
      (fullName && !e.beneficiary && isSelfTransferInText(e.desc, fullName)) ||
      isGenericSelfFundingNarration(e.beneficiary, e.desc),
  );
  if (!toUpdate.length) return NextResponse.json({ retagged: 0 });

  const { error: updErr } = await supabase
    .from("entries")
    .update(internalTransferFields())
    .in("id", toUpdate.map((e) => e.id));
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ retagged: toUpdate.length });
}
