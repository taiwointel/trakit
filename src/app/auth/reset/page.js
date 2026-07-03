"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const iStyle = {
  padding: "12px 14px", borderRadius: 12, fontSize: 14,
  outline: "none", width: "100%", boxSizing: "border-box",
  background: "var(--ink-3)", border: "1px solid var(--rule)",
  color: "var(--ink-text)", fontFamily: "var(--font-mono)",
};

const labelStyle = {
  fontSize: 11, color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
  textTransform: "uppercase", letterSpacing: "0.06em",
};

export default function ResetPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [ready,    setReady]    = useState(false);
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [msg,      setMsg]      = useState({ text: "", ok: false });
  const [loading,  setLoading]  = useState(false);

  // Supabase fires PASSWORD_RECOVERY when the user arrives via a reset link.
  // This establishes the session so updateUser() can run.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleReset(e) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ text: "Passwords do not match.", ok: false });
      return;
    }
    if (password.length < 8) {
      setMsg({ text: "Password must be at least 8 characters.", ok: false });
      return;
    }
    setLoading(true);
    setMsg({ text: "", ok: false });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({ text: error.message, ok: false });
    } else {
      setMsg({ text: "Password updated! Signing you in...", ok: true });
      setTimeout(() => { router.push("/summary"); router.refresh(); }, 1500);
    }
    setLoading(false);
  }

  return (
    <div style={{
      width: "100%", height: "100dvh", background: "var(--ink)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "var(--ink-2)", border: "1px solid var(--rule)",
        borderRadius: 24, padding: "36px 32px",
        display: "flex", flexDirection: "column", gap: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="var(--gold)" />
              <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700, color: "var(--ink-text)", letterSpacing: -0.5 }}>
              Trakit7
            </span>
          </div>
          <div style={{ color: "var(--ink-text)", fontSize: 20, fontFamily: "var(--font-serif)", fontWeight: 600 }}>
            Set a new password
          </div>
          <div style={{ color: "var(--ink-text-dim)", fontSize: 13, fontFamily: "var(--font-sans)", marginTop: 6 }}>
            Choose something secure you will remember.
          </div>
        </div>

        {!ready ? (
          <p style={{ textAlign: "center", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6 }}>
            Verifying your reset link... If nothing happens after a few seconds, the link may have expired. Request a new one from the sign-in page.
          </p>
        ) : (
          <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={labelStyle}>New password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="min. 8 characters"
                  required
                  autoComplete="new-password"
                  autoFocus
                  style={{ ...iStyle, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-text-dim)", fontSize: 15, padding: 0, lineHeight: 1 }}
                  aria-label={showPwd ? "Hide password" : "Show password"}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={labelStyle}>Confirm password</label>
              <input
                type={showPwd ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                required
                autoComplete="new-password"
                style={iStyle}
              />
            </div>

            {msg.text && (
              <p style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12.5, margin: 0, fontFamily: "var(--font-sans)", lineHeight: 1.55, color: msg.ok ? "var(--green)" : "var(--red)", background: msg.ok ? "var(--green-soft)" : "var(--red-soft)" }}>
                {msg.text}
              </p>
            )}

            <button type="submit" disabled={loading} style={{ marginTop: 2, padding: "14px", borderRadius: 14, fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff", fontFamily: "var(--font-sans)", opacity: loading ? 0.72 : 1, boxShadow: "0 4px 20px rgba(169,133,79,0.4)" }}>
              {loading ? "Saving…" : "Set new password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
