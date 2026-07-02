import { createClient } from "@/lib/supabase/server";
import { fallbackCategorize } from "@/lib/categories";
import { NextResponse } from "next/server";

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

  const toInsert = rows.map((row) => {
    const cats = row.flow === "out"
      ? fallbackCategorize(row.desc || "")
      : { category: "Income", essentiality: "—", nature: "—", confidence: 1, subcategory: "", note: "Income", status: "fallback" };
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
      status:       "fallback",
    };
  });

  let { data, error } = await supabase.from("entries").insert(toInsert).select("id, desc, amount, flow");

  // If source column doesn't exist yet (migration pending), retry without it
  if (error?.code === "42703") {
    const withoutSource = toInsert.map(({ source: _s, ...r }) => r);
    ({ data, error } = await supabase.from("entries").insert(withoutSource).select("id, desc, amount, flow"));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: (data || []).length, rows: data || [] });
}
