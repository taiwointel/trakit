"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsDrawer({ open, onClose }) {
  const router   = useRouter();
  const supabase = createClient();

  const [key,        setKey]        = useState("");
  const [keyWarning, setKeyWarning] = useState("");
  const [hasKey,     setHasKey]     = useState(false);
  const [status,     setStatus]     = useState("");
  const [testing,    setTesting]    = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleKeyInput(value) {
    const clean = value.replace(/[^\x20-\x7E]/g, "");
    setKeyWarning(clean.length !== value.length
      ? "Non-ASCII characters were removed — check your key is correct."
      : "");
    setKey(clean);
  }

  useEffect(() => {
    if (!open) return;
    setStatus("");
    setKeyWarning("");
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => { setHasKey(!!d.hasKey); })
      .catch(() => {});
  }, [open]);

  async function saveKey() {
    const clean = key.replace(/[^\x20-\x7E]/g, "").trim();
    if (!clean) { setStatus("Paste a Groq API key first."); return; }
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "groq", key: clean }),
      });
      const data = await res.json();
      if (res.ok) { setStatus("Saved."); setHasKey(true); setKey(""); }
      else setStatus(data.error || "Save failed.");
    } catch {
      setStatus("Network error.");
    }
  }

  async function testConnection() {
    setTesting(true);
    setStatus("Testing…");
    try {
      const res  = await fetch("/api/ai/test-connection", { method: "POST" });
      const data = await res.json();
      setStatus(data.message || (res.ok ? "Connection OK ✓" : "Failed."));
    } catch {
      setStatus("Network error.");
    }
    setTesting(false);
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    onClose();
    router.push("/auth");
    router.refresh();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{
          width: "min(380px, 88vw)",
          background: "var(--ink-2)",
          borderLeft: "1px solid var(--rule)",
          animation: "slideInRight 220ms ease forwards",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--rule)" }}
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="font-semibold text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
              Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)" }}
          >
            ✕
          </button>
        </div>

        {/* AI Connection */}
        <div className="px-5 py-5 flex flex-col gap-4 flex-1">

          {/* Groq label + status badge */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              AI Connection · Groq
            </p>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: hasKey ? "rgba(47,122,86,0.2)" : "rgba(184,57,43,0.15)",
                color:      hasKey ? "var(--green)" : "var(--red)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {hasKey ? "● Connected" : "○ Not connected"}
            </span>
          </div>

          {/* Info box */}
          <div
            className="px-4 py-3 rounded-xl flex items-start gap-3"
            style={{ background: "rgba(91,143,168,0.1)", border: "1px solid rgba(91,143,168,0.25)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-accent)" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}>
              Trackit uses Groq for AI features (free tier available).{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--gold)", textDecoration: "underline" }}
              >
                Get a free key at console.groq.com ↗
              </a>
            </p>
          </div>

          {/* Key input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              {hasKey ? "Update API Key" : "Paste your Groq API key"}
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => handleKeyInput(e.target.value)}
              placeholder={hasKey ? "Paste to replace current key…" : "gsk_..."}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background:  "var(--ink-3)",
                border:      "1px solid var(--rule)",
                color:       "var(--ink-text)",
                fontFamily:  "var(--font-mono)",
              }}
            />
          </div>

          {keyWarning && (
            <p className="text-xs px-2 py-1.5 rounded-lg" style={{ color: "var(--amber)", background: "var(--amber-soft)", fontFamily: "var(--font-mono)" }}>
              {keyWarning}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={saveKey}
              disabled={!key.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
              style={{
                background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                color:      "#fff",
                fontFamily: "var(--font-sans)",
                opacity:    !key.trim() ? 0.5 : 1,
              }}
            >
              Save Key
            </button>
            <button
              onClick={testConnection}
              disabled={testing || !hasKey}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity"
              style={{
                background: "var(--ink-3)",
                border:     "1px solid var(--rule)",
                color:      "var(--blue-accent)",
                fontFamily: "var(--font-sans)",
                opacity:    (!hasKey || testing) ? 0.5 : 1,
              }}
            >
              {testing ? "Testing…" : "Test"}
            </button>
          </div>

          {status && (
            <p
              className="text-xs px-1"
              style={{
                color:      status.startsWith("Saved") || status.includes("OK") ? "var(--green)" : "var(--ink-text-dim)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {status}
            </p>
          )}

          <div className="mt-auto" />

          {/* Divider */}
          <div style={{ height: 1, background: "var(--rule)" }} />

          {/* Sign out */}
          <button
            onClick={signOut}
            disabled={signingOut}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity flex items-center justify-center gap-2"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--red)",
              opacity:    signingOut ? 0.6 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );
}
