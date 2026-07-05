import { createClient } from "@/lib/supabase/server";
import { fallbackCategorize } from "@/lib/categories";
import { lookupMerchantRules, normalizeMerchantKey } from "@/lib/merchantRules";
import { isSelfTransfer, isSelfTransferInText, internalTransferFields } from "@/lib/selfTransfer";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Learned rules first: a beneficiary/narration categorized before (via AI
  // or a manual correction) is applied instantly here, before AI ever runs —
  // this is what lets repeat imports (recurring transfers, the same
  // landlord/vendor/family member) skip categorization entirely.
  const learnedMap = await lookupMerchantRules(supabase, user.id, rows);
  // Prefer the name printed on the statement itself (it's what will actually
  // match beneficiaries in *this* statement); fall back to the Settings
  // profile name if the statement didn't carry a recognizable holder line.
  const fullName   = body?.accountHolderName || user.user_metadata?.full_name || null;

  const toInsert = rows.map((row) => {
    // A transfer to/from the account holder's own name (any word order), or
    // one the user explicitly tagged via the labeling wizard's "Self
    // transfer" chip, is cash moving between the user's own accounts, not
    // real income or spend — tag it distinctly regardless of flow direction.
    if (
      row.forceInternalTransfer ||
      (fullName && isSelfTransfer(row.beneficiary, fullName)) ||
      (fullName && !row.beneficiary && isSelfTransferInText(row.desc, fullName))
    ) {
      return {
        user_id: user.id, date: row.date, desc: row.desc || "", amount: Number(row.amount) || 0,
        flow: row.flow || "out", beneficiary: row.beneficiary || null, source: "import",
        ...internalTransferFields(),
        status: "done",
      };
    }
    if (row.flow !== "out") {
      return {
        user_id: user.id, date: row.date, desc: row.desc || "", amount: Number(row.amount) || 0,
        flow: row.flow || "out", beneficiary: row.beneficiary || null, source: "import",
        category: "Income", essentiality: "—", nature: "—", confidence: 1, subcategory: "", note: "Income",
        status: "done",
      };
    }
    const key     = normalizeMerchantKey(row.desc, row.beneficiary);
    const learned = key ? learnedMap.get(key) : null;
    const cats    = learned
      ? { ...learned, confidence: 0.95, note: "Learned from a previous correction" }
      : fallbackCategorize(row.desc || "");
    return {
      user_id:      user.id,
      date:         row.date,
      desc:         row.desc || "",
      amount:       Number(row.amount) || 0,
      flow:         row.flow || "out",
      beneficiary:  row.beneficiary || null,
      source:       "import",
      category:     cats.category,
      essentiality: cats.essentiality,
      nature:       cats.nature,
      confidence:   cats.confidence,
      subcategory:  cats.subcategory,
      note:         cats.note,
      // entries.status has a DB check constraint allowing only
      // 'pending' | 'done' | 'fallback' — a learned-rule match is
      // represented as 'done' (fully resolved, no AI needed), which is
      // unambiguous here since bulk import never calls AI itself: an
      // "out" row from this route is either learned ('done') or
      // keyword-matched ('fallback').
      status:       learned ? "done" : "fallback",
    };
  });

  let { data, error } = await supabase.from("entries").insert(toInsert).select("id, desc, amount, flow, beneficiary, status");

  // If source column doesn't exist yet (migration pending), retry without it
  if (error?.code === "42703") {
    const withoutSource = toInsert.map(({ source: _s, ...r }) => r);
    ({ data, error } = await supabase.from("entries").insert(withoutSource).select("id, desc, amount, flow, beneficiary, status"));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: (data || []).length, rows: data || [] });
}
