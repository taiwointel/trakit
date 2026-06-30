"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useGoals() {
  const [goals,   setGoals]   = useState({ salary: null, payday_day: 22, emergency_fund_target_override: null });
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
      const { data } = await supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setGoals({ salary: data.salary, payday_day: data.payday_day ?? 22, emergency_fund_target_override: data.emergency_fund_target_override });
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGoals = useCallback(async (patch) => {
    const updated = { ...goals, ...patch };
    setGoals(updated);
    if (userId && supabase) {
      await supabase.from("goals").upsert({ user_id: userId, ...updated }, { onConflict: "user_id" });
    }
  }, [goals, userId, supabase]);

  return { goals, loading, saveGoals };
}
