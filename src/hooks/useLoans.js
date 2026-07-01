"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at");

    if (error?.code === "42P01") {
      setLoans([]);
      setLoading(false);
      return;
    }

    setLoans(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addLoan = useCallback(async (loan) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("loans").insert({ ...loan, user_id: user.id });
    await load();
  }, [load]);

  const deleteLoan = useCallback(async (id) => {
    await supabase.from("loans").delete().eq("id", id);
    await load();
  }, [load]);

  return { loans, loading, addLoan, deleteLoan };
}
