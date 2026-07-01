"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useBills() {
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [billsRes, paymentsRes] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
      supabase.from("bill_payments").select("*").eq("user_id", user.id).order("created_at"),
    ]);

    if (billsRes.error?.code === "42P01" || paymentsRes.error?.code === "42P01") {
      setBills([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    setBills(billsRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBill = useCallback(async (bill) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("bills").insert({ ...bill, user_id: user.id });
    await load();
  }, [load]);

  const deleteBill = useCallback(async (id) => {
    await supabase.from("bills").update({ is_active: false }).eq("id", id);
    await load();
  }, [load]);

  const markPaid = useCallback(async (billId, dueMonth, amount, paidAt) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("bill_payments").insert({
      user_id: user.id,
      bill_id: billId,
      due_month: dueMonth,
      amount,
      paid_at: paidAt,
    });
    await load();
  }, [load]);

  const paymentsFor = useCallback(
    (billId) => payments.filter((p) => p.bill_id === billId),
    [payments],
  );

  return { bills, payments, loading, addBill, deleteBill, markPaid, paymentsFor };
}
