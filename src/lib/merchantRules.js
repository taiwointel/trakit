// Learned categorization rules: once a beneficiary (or narration) has been
// categorized once — by AI or by the user manually correcting a category —
// remember it, keyed off a normalized signature. Future transactions from
// the same beneficiary/narration are categorized instantly from this table,
// with no AI call needed. Beneficiary is preferred as the key because it's
// stable across statements even when the surrounding narration text (ref
// numbers, dates, bank-specific wording) changes; narration is the fallback
// for entries with no beneficiary.

export function normalizeMerchantKey(desc, beneficiary) {
  if (beneficiary && beneficiary.trim()) {
    const b = beneficiary.trim().toLowerCase().replace(/\s+/g, " ");
    return b.length >= 2 ? `b:${b}` : null;
  }
  let d = (desc || "").toLowerCase();
  d = d.replace(/\d[\d,./-]*\d|\b\d+\b/g, " "); // strip ref numbers, dates, amounts
  d = d.replace(/[^a-z\s]/g, " ");
  d = d.replace(/\s+/g, " ").trim();
  return d.length >= 4 ? `n:${d}` : null;
}

export async function lookupMerchantRule(supabase, userId, desc, beneficiary) {
  const key = normalizeMerchantKey(desc, beneficiary);
  if (!key || !userId) return null;
  const { data } = await supabase
    .from("merchant_rules")
    .select("category, subcategory, essentiality, nature")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  return data || null;
}

// entries: [{ desc | description, beneficiary }] — batched lookup to avoid
// one round trip per row. Callers use either field name (bulk-import rows
// carry `desc`, the AI batch endpoint carries `description`), so accept both.
export async function lookupMerchantRules(supabase, userId, entries) {
  if (!userId) return new Map();
  const keys = [...new Set(entries.map((e) => normalizeMerchantKey(e.desc ?? e.description, e.beneficiary)).filter(Boolean))];
  if (!keys.length) return new Map();
  const { data } = await supabase
    .from("merchant_rules")
    .select("key, category, subcategory, essentiality, nature")
    .eq("user_id", userId)
    .in("key", keys);
  const map = new Map();
  (data || []).forEach((r) => map.set(r.key, r));
  return map;
}

export async function saveMerchantRule(supabase, userId, desc, beneficiary, fields) {
  const key = normalizeMerchantKey(desc, beneficiary);
  if (!key || !userId || !fields?.category) return;
  await supabase.from("merchant_rules").upsert(
    {
      user_id:      userId,
      key,
      category:     fields.category,
      subcategory:  fields.subcategory || "",
      essentiality: fields.essentiality,
      nature:       fields.nature,
      updated_at:   new Date().toISOString(),
    },
    { onConflict: "user_id,key" },
  );
}
