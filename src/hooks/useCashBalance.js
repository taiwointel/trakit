"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";

export function useCashBalance() {
  const [anchor,  setAnchor]  = useState({ anchor_date: null, anchor_amount: 0 });
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
      const { data } = await supabase.from("cash_balance").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setAnchor({ anchor_date: data.anchor_date, anchor_amount: Number(data.anchor_amount) });
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAnchor = useCallback(async (date, amount) => {
    const a = { anchor_date: date, anchor_amount: Number(amount) };
    setAnchor(a);
    if (userId && supabase) {
      await supabase.from("cash_balance").upsert({ user_id: userId, ...a }, { onConflict: "user_id" });
    }
  }, [userId, supabase]);

  // Clears a bad anchor (e.g. saved with the wrong amount, or an
  // accidental re-anchor) back to unset, returning the user to the
  // first-time setup form instead of leaving every day's balance computed
  // off a wrong number with no way to undo it short of guessing the
  // original values back into the same form.
  const clearAnchor = useCallback(async () => {
    setAnchor({ anchor_date: null, anchor_amount: 0 });
    if (userId && supabase) {
      await supabase.from("cash_balance").delete().eq("user_id", userId);
    }
  }, [userId, supabase]);

  return { anchor, loading, saveAnchor, clearAnchor };
}
