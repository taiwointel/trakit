"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [mode,     setMode]     = useState("signin"); // "signin" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setError("Check your email for a confirmation link, then sign in.");
        setMode("signin");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/summary");
        router.refresh();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--ink)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8 flex flex-col gap-6"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
          >
            Ledger
          </span>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
          >
            Daily Expense Tracker
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
          >
            {mode === "signin" ? "Welcome back, Taiwo." : "Create your account."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="px-3 py-2.5 rounded text-sm outline-none"
              style={{
                background:  "var(--ink-3)",
                border:      "1px solid var(--rule)",
                color:       "var(--ink-text)",
                fontFamily:  "var(--font-mono)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              className="text-xs"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="px-3 py-2.5 rounded text-sm outline-none"
              style={{
                background:  "var(--ink-3)",
                border:      "1px solid var(--rule)",
                color:       "var(--ink-text)",
                fontFamily:  "var(--font-mono)",
              }}
            />
          </div>

          {error && (
            <p
              className="text-xs px-3 py-2 rounded"
              style={{
                color:      error.startsWith("Check") ? "var(--green)" : "var(--red)",
                background: error.startsWith("Check") ? "var(--green-soft)" : "var(--red-soft)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded text-sm font-semibold mt-1 transition-opacity"
            style={{
              background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color:      "#fff",
              opacity:    loading ? 0.7 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p
          className="text-xs text-center"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          {mode === "signin" ? "No account yet? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            className="underline"
            style={{ color: "var(--gold)" }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
