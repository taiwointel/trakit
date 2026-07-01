"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fallbackCategorize } from "@/lib/categories";

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
  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [{ data: rows }, { data: bud }] = await Promise.all([
        supabase.from("entries").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("budgets").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      setEntries(rows || []);
      if (bud) setBudgets({ overall: bud.overall, categories: bud.category_budgets || {} });
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // AI categorization for money-out
    let categorized = { ...draft, source: "manual" };
    if (draft.flow === "out") {
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: draft.desc, amount: draft.amount }),
        });
        if (res.ok) {
          const ai = await res.json();
          categorized = { ...categorized, ...ai }; // ai already carries status ('done' or 'fallback')
        } else {
          throw new Error(`AI error ${res.status}`);
        }
      } catch {
        const fb = fallbackCategorize(draft.desc);
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
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
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

  return { entries, budgets, loading, addEntry, updateEntry, deleteEntry, saveBudget };
}
