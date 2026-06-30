"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useChatMessages() {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [userId,   setUserId]   = useState(null);

  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? createClient()
    : null;

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          setMessages(data || []);
          setLoading(false);
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = useCallback(async (role, content) => {
    const temp = { id: `temp-${Date.now()}-${Math.random()}`, role, content, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);

    if (!supabase || !userId) return;
    const { data } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role, content })
      .select()
      .single();
    if (data) {
      setMessages((prev) => prev.map((m) => m.id === temp.id ? data : m));
    }
  }, [supabase, userId]);

  const clearHistory = useCallback(async () => {
    setMessages([]);
    if (!supabase || !userId) return;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
  }, [supabase, userId]);

  return { messages, loading, addMessage, clearHistory };
}
