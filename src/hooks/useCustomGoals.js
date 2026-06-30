"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCustomGoals() {
  const [goals,   setGoals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState(null);

  const supabase = (
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) ? createClient() : null;

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("custom_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("target_date", { ascending: true });
      setGoals(data || []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGoal = useCallback(async ({ name, target_amount, target_date }) => {
    const row = { name, target_amount: Number(target_amount), target_date, saved_so_far: 0 };
    if (userId && supabase) {
      const { data } = await supabase
        .from("custom_goals")
        .insert({ user_id: userId, ...row })
        .select()
        .single();
      if (data) {
        setGoals((prev) =>
          [...prev, data].sort((a, b) => (a.target_date || "").localeCompare(b.target_date || "")),
        );
      }
    } else {
      setGoals((prev) => [...prev, { ...row, id: `opt-${Date.now()}` }]);
    }
  }, [userId, supabase]);

  const updateSavedSoFar = useCallback(async (id, amount) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, saved_so_far: Number(amount) } : g));
    if (supabase) await supabase.from("custom_goals").update({ saved_so_far: Number(amount) }).eq("id", id);
  }, [supabase]);

  const deleteGoal = useCallback(async (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (supabase) await supabase.from("custom_goals").delete().eq("id", id);
  }, [supabase]);

  return { goals, loading, addGoal, updateSavedSoFar, deleteGoal };
}
