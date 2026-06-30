"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { INVESTMENT_TYPE_TO_GROUP, pensionAccrualMonths } from "@/lib/investments";

export function useInvestments() {
  const [investments,  setInvestments]  = useState([]);
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

      const [{ data: invData }, { data: txnData }] = await Promise.all([
        supabase.from("investments").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("investment_transactions").select("*").eq("user_id", user.id).order("date"),
      ]);

      const invList = invData || [];
      let   txnList = [...(txnData || [])];
      const updatedInvs = [...invList];

      // Auto-accrue pension months on load
      for (let i = 0; i < updatedInvs.length; i++) {
        const inv = updatedInvs[i];
        if (inv.group !== "pension" || !inv.last_accrual_month) continue;
        const toAccrue = pensionAccrualMonths(inv.last_accrual_month);
        if (toAccrue.length === 0) continue;

        const contribution = Number(inv.monthly_contribution || 0);
        let balance = Number(inv.balance || 0);
        const rows = toAccrue.map((month) => {
          balance += contribution;
          return { investment_id: inv.id, user_id: user.id, date: month + "-01", type: "accrual", amount: contribution, month };
        });
        const lastMonth = toAccrue[toAccrue.length - 1];

        const { data: inserted } = await supabase.from("investment_transactions").insert(rows).select();
        if (inserted) txnList = [...txnList, ...inserted];
        await supabase.from("investments").update({ balance, last_accrual_month: lastMonth }).eq("id", inv.id);
        updatedInvs[i] = { ...inv, balance, last_accrual_month: lastMonth };
      }

      setInvestments(updatedInvs);
      setTransactions(txnList);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addInvestment = useCallback(async (data) => {
    const group = INVESTMENT_TYPE_TO_GROUP[data.type] || "balance";
    const row   = { ...data, group };

    // Pension: seed last_accrual_month from start_month so first load accrues correctly
    if (group === "pension" && data.start_month) {
      const [sy, sm] = data.start_month.split("-").map(Number);
      const prevM = sm - 1;
      row.last_accrual_month = prevM === 0
        ? `${sy - 1}-12`
        : `${sy}-${String(prevM).padStart(2, "0")}`;
      delete row.start_month;
    }
    // Balance from opening balance field
    if (group === "pension" && data.opening_balance) {
      row.balance = Number(data.opening_balance);
      delete row.opening_balance;
    }

    if (!userId || !supabase) {
      setInvestments((prev) => [...prev, { ...row, id: `opt-${Date.now()}` }]);
      return;
    }
    const { data: inserted } = await supabase.from("investments")
      .insert({ ...row, user_id: userId }).select().single();
    if (inserted) setInvestments((prev) => [...prev, inserted]);
  }, [userId, supabase]);

  const updateInvestment = useCallback(async (id, patch) => {
    setInvestments((prev) => prev.map((inv) => inv.id === id ? { ...inv, ...patch } : inv));
    if (supabase) await supabase.from("investments").update(patch).eq("id", id);
  }, [supabase]);

  const deleteInvestment = useCallback(async (id) => {
    setInvestments((prev) => prev.filter((inv) => inv.id !== id));
    setTransactions((prev) => prev.filter((t) => t.investment_id !== id));
    if (supabase) {
      await supabase.from("investment_transactions").delete().eq("investment_id", id);
      await supabase.from("investments").delete().eq("id", id);
    }
  }, [supabase]);

  const addTransaction = useCallback(async (invId, txnData) => {
    const row = { investment_id: invId, user_id: userId, ...txnData };
    const opt = { ...row, id: `opt-${Date.now()}` };
    setTransactions((prev) => [...prev, opt]);

    if (userId && supabase) {
      const { data } = await supabase.from("investment_transactions").insert(row).select().single();
      if (data) setTransactions((prev) => prev.map((t) => t.id === opt.id ? data : t));

      // For balance-group: keep investment balance in sync (optional, pension only needed for auto-accrual)
      // For pension adjustments, update balance field
      if (txnData.type === "adjustment") {
        setInvestments((prev) => prev.map((inv) => {
          if (inv.id !== invId) return inv;
          const newBal = Number(inv.balance || 0) + Number(txnData.amount);
          supabase.from("investments").update({ balance: newBal }).eq("id", invId);
          return { ...inv, balance: newBal };
        }));
      }
    }
  }, [userId, supabase]);

  const bulkAddTransactions = useCallback(async (invId, txnDataArray) => {
    const rows = txnDataArray.map((t) => ({ investment_id: invId, user_id: userId, ...t }));
    const opts = rows.map((r, i) => ({ ...r, id: `opt-${Date.now()}-${i}` }));
    setTransactions((prev) => [...prev, ...opts]);
    if (userId && supabase) {
      const { data } = await supabase.from("investment_transactions").insert(rows).select();
      if (data) {
        const ids = new Set(opts.map((o) => o.id));
        setTransactions((prev) => [...prev.filter((t) => !ids.has(t.id)), ...data]);
      }
    }
  }, [userId, supabase]);

  const txnsFor = useCallback(
    (invId) => transactions.filter((t) => t.investment_id === invId),
    [transactions],
  );

  return {
    investments,
    transactions,
    loading,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addTransaction,
    bulkAddTransactions,
    txnsFor,
  };
}
