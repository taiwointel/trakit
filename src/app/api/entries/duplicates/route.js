import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Finds entries that share the same date, desc, amount and flow. This alone
// is NOT proof of a duplicate import — the `date` column has no time-of-day,
// so genuinely receiving the same amount from the same narration twice in
// one day (e.g. two identical P2P transfers) looks byte-identical to a true
// duplicate. To tell them apart we look at `created_at`: rows inserted
// together in the same import batch (created_at within a couple minutes of
// each other) are ambiguous and must be reviewed by the user; rows inserted
// in two clearly separate sessions (minutes/hours/days apart) are the actual
// signature of a statement being uploaded twice and are much safer to
// pre-select for deletion.
const CROSS_IMPORT_GAP_MS = 2 * 60 * 1000;

function groupKey(e) {
  return `${e.date}|${(e.desc || "").trim().toLowerCase()}|${e.amount}|${e.flow}`;
}

async function findDuplicateGroups(supabase, userId) {
  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, date, desc, amount, flow, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const groups = new Map();
  for (const e of entries || []) {
    const key = groupKey(e);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const times = g.map((e) => new Date(e.created_at).getTime());
      const maxGap = Math.max(...times) - Math.min(...times);
      return { rows: g, likelyDuplicate: maxGap > CROSS_IMPORT_GAP_MS };
    });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groups = await findDuplicateGroups(supabase, user.id);
    const toGroupPayload = (g) => ({
      date: g.rows[0].date,
      desc: g.rows[0].desc,
      amount: g.rows[0].amount,
      flow: g.rows[0].flow,
      count: g.rows.length,
      // keep the earliest row, offer the rest as deletable extras
      extraIds: g.rows.slice(1).map((e) => e.id),
    });

    const likely   = groups.filter((g) => g.likelyDuplicate).map(toGroupPayload);
    const ambiguous = groups.filter((g) => !g.likelyDuplicate).map(toGroupPayload);

    return NextResponse.json({
      likely,
      ambiguous,
      likelyExtraRows: likely.reduce((s, g) => s + g.extraIds.length, 0),
      ambiguousExtraRows: ambiguous.reduce((s, g) => s + g.extraIds.length, 0),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Deletes only the specific entry ids the user selected after reviewing the
// GET results — no blind "delete all matches" path, since same-day
// legitimate repeat transactions are indistinguishable from true duplicates
// without a human looking at them.
export async function DELETE(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ error: "No entry ids provided." }, { status: 400 });

  const { error, count } = await supabase
    .from("entries")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: count ?? ids.length });
}
