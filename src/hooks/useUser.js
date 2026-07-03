"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUser() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? createClient()
    : null;

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const name = fullName.split(" ")[0];

  return { user, name, loading };
}
