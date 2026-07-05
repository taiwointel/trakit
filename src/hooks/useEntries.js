"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fallbackCategorize } from "@/lib/categories";
import { saveMerchantRule } from "@/lib/merchantRules";

export function useEntries() {
  const [entries,  setEntries]  = useState([]);
  const [budgets,  setBudgets]  = useState({ overall: null, categories: {} });
  const [loading,  setLoading]  = useState(true);
  const [userId,   setUserId]   = useState(null);

  // Lazy — only create when env vars are present (avoids static build crash)
  const supabase = (
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) ? createClient() : null;

  // Load user + initial data
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // Supabase/PostgREST caps any single unpaginated response at 1000 rows.
    // A plain .select("*") ordered newest-first would silently truncate the
    // *oldest* rows once a user's ledger passes that count — exactly what
    // happened to a multi-month statement import (Jan/Feb vanished while
    // March onward, being newer, survived the cutoff). Page through with
    // .range() until a page comes back short, so the full ledger loads
    // regardless of size.
    const PAGE_SIZE = 1000;
    const allRows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      allRows.push(...(page || []));
      if (!page || page.length < PAGE_SIZE) break;
    }
    const { data: bud } = await supabase.from("budgets").select("*").eq("user_id", user.id).maybeSingle();

    setEntries(allRows);
    if (bud) setBudgets({ overall: bud.overall, categories: bud.category_budgets || {} });
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEntry = useCallback(async (draft) => {
    const tempId = crypto.randomUUID();
    const pending = {
      ...draft,
      id:         tempId,
      status:     "pending",
      created_at: new Date().toISOString(),
    };

    // Optimistic insert
    setEntries((prev) => [pending, ...prev]);

    // AI categorization for money-out — send only the purpose (text before " — ")
    let categorized = { ...draft, source: "manual" };
    if (draft.flow === "out") {
      const sep     = draft.desc?.indexOf(" — ");
      const purpose = sep !== -1 ? draft.desc.slice(0, sep).trim() : draft.desc;
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purpose, amount: draft.amount, beneficiary: draft.beneficiary }),
        });
        if (res.ok) {
          const ai = await res.json();
          categorized = { ...categorized, ...ai }; // ai already carries status ('done' or 'fallback')
        } else {
          throw new Error(`AI error ${res.status}`);
        }
      } catch {
        const fb = fallbackCategorize(purpose);
        categorized = { ...categorized, ...fb };
      }
    } else {
      categorized.category     = "Income";
      categorized.essentiality = "—";
      categorized.nature       = "—";
      categorized.status       = "done";
    }

    if (userId && supabase) {
      let { data, error } = await supabase
        .from("entries")
        .insert({ ...categorized, user_id: userId })
        .select()
        .single();

      // If the source column doesn't exist yet (migration pending), retry without it
      if (error?.code === "42703") {
        const { source: _s, ...withoutSource } = categorized;
        ({ data, error } = await supabase
          .from("entries")
          .insert({ ...withoutSource, user_id: userId })
          .select()
          .single());
      }

      if (!error && data) {
        setEntries((prev) => prev.map((e) => (e.id === tempId ? data : e)));
        return;
      }
    }

    // No Supabase — keep local with AI result
    setEntries((prev) =>
      prev.map((e) => (e.id === tempId ? { ...e, ...categorized } : e)),
    );
  }, [userId]);

  const updateEntry = useCallback(async (id, patch) => {
    setEntries((prev) => {
      // A manual category correction (not an AI/import result — those never
      // set just `category` in isolation) is the strongest possible training
      // signal: teach it immediately so this beneficiary/narration never
      // needs AI or the wizard again.
      if (patch.category && userId && supabase) {
        const entry = prev.find((e) => e.id === id);
        if (entry && entry.flow === "out") {
          saveMerchantRule(supabase, userId, entry.desc, entry.beneficiary, {
            category:     patch.category,
            subcategory:  entry.subcategory,
            essentiality: patch.essentiality ?? entry.essentiality,
            nature:       patch.nature ?? entry.nature,
          });
        }
      }
      return prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
    });
    if (userId && supabase) {
      await supabase.from("entries").update(patch).eq("id", id).eq("user_id", userId);
    }
  }, [userId, supabase]);

  const deleteEntry = useCallback(async (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (userId && supabase) {
      await supabase.from("entries").delete().eq("id", id).eq("user_id", userId);
    }
  }, [userId, supabase]);

  const saveBudget = useCallback(async (overall, categories) => {
    setBudgets({ overall, categories });
    if (userId && supabase) {
      await supabase.from("budgets").upsert(
        { user_id: userId, overall, category_budgets: categories },
        { onConflict: "user_id" },
      );
    }
  }, [userId, supabase]);

  const deleteEntries = useCallback(async (ids) => {
    if (!ids?.length) return;
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    if (userId && supabase) {
      await supabase.from("entries").delete().in("id", ids).eq("user_id", userId);
    }
  }, [userId, supabase]);

  const clearAllEntries = useCallback(async () => {
    setEntries([]);
    if (userId && supabase) {
      await supabase.from("entries").delete().eq("user_id", userId);
    }
  }, [userId, supabase]);

  return { entries, budgets, loading, addEntry, updateEntry, deleteEntry, deleteEntries, saveBudget, clearAllEntries, refetch: load };
}
