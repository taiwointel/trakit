import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Finds entries that are exact duplicates of each other (same date, desc,
// amount, flow) — the signature of a statement being imported twice (e.g.
// two uploads with an overlapping date range). Groups by that signature and
// flags any group with more than one row.
function groupKey(e) {
  return `${e.date}|${(e.desc || "").trim().toLowerCase()}|${e.amount}|${e.flow}`;
}

async function findDuplicateGroups(supabase, userId) {
  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, date, desc, amount, flow, category, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const groups = new Map();
  for (const e of entries || []) {
    const key = groupKey(e);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const dupeGroups = [...groups.values()].filter((g) => g.length > 1);
  return dupeGroups;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dupeGroups = await findDuplicateGroups(supabase, user.id);
    const extraCount = dupeGroups.reduce((s, g) => s + (g.length - 1), 0);
    const inflowExtra = dupeGroups.reduce(
      (s, g) => (g[0].flow === "in" ? s + Number(g[0].amount) * (g.length - 1) : s),
      0,
    );
    const outflowExtra = dupeGroups.reduce(
      (s, g) => (g[0].flow === "out" ? s + Number(g[0].amount) * (g.length - 1) : s),
      0,
    );
    return NextResponse.json({
      groups: dupeGroups.length,
      extraRows: extraCount,
      inflowExtra,
      outflowExtra,
      sample: dupeGroups.slice(0, 20).map((g) => ({
        date: g[0].date, desc: g[0].desc, amount: g[0].amount, flow: g[0].flow, count: g.length,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keeps the earliest-inserted row in each duplicate group and deletes the
// rest — this is the destructive counterpart to GET, only run when the user
// explicitly confirms after reviewing the GET summary.
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dupeGroups = await findDuplicateGroups(supabase, user.id);
    const idsToDelete = dupeGroups.flatMap((g) => g.slice(1).map((e) => e.id));
    if (!idsToDelete.length) return NextResponse.json({ deleted: 0 });

    const { error } = await supabase.from("entries").delete().in("id", idsToDelete);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ deleted: idsToDelete.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
