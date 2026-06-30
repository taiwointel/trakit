"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useEmergencyFund() {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [userId,       setUserId]       = useState(null);

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
        .from("emergency_fund_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setTransactions(data || []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTransaction = useCallback(async ({ type, amount, date, note }) => {
    const row = { type, amount: Number(amount), date, note: note || null };
    const optimistic = { ...row, id: `opt-${Date.now()}` };
    setTransactions((prev) => [optimistic, ...prev]);
    if (userId && supabase) {
      const { data } = await supabase
        .from("emergency_fund_transactions")
        .insert({ user_id: userId, ...row })
        .select()
        .single();
      if (data) setTransactions((prev) => prev.map((t) => t.id === optimistic.id ? data : t));
    }
  }, [userId, supabase]);

  const deleteTransaction = useCallback(async (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (supabase) await supabase.from("emergency_fund_transactions").delete().eq("id", id);
  }, [supabase]);

  const balance = transactions.reduce(
    (s, t) => t.type === "deposit" ? s + Number(t.amount) : s - Number(t.amount),
    0,
  );

  return { transactions, balance, loading, addTransaction, deleteTransaction };
}
