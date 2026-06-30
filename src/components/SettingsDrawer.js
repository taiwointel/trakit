"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PROVIDERS = [
  { id: "gemini", label: "Gemini" },
  { id: "groq",   label: "Groq" },
  { id: "claude", label: "Claude" },
];

export default function SettingsDrawer({ open, onClose }) {
  const router   = useRouter();
  const supabase = createClient();

  const [provider, setProvider] = useState("gemini");
  const [keys, setKeys]         = useState({ gemini: "", groq: "", claude: "" });
  const [keyWarning, setKeyWarning] = useState("");
  const [status, setStatus]     = useState("");
  const [testing, setTesting]   = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function handleKeyInput(value) {
    // Strip any character outside printable ASCII — catches em dashes, smart quotes,
    // and other characters that OS autocorrect silently inserts into pasted text
    const clean = value.replace(/[^\x20-\x7E]/g, "");
    setKeyWarning(clean.length !== value.length
      ? "Non-ASCII characters were removed — check your key is correct."
      : "");
    setKeys((k) => ({ ...k, [provider]: clean }));
  }

  // Load the currently active provider whenever the drawer opens
  useEffect(() => {
    if (!open) return;
    setStatus("");
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => { if (d.provider) setProvider(d.provider); })
      .catch(() => {});
  }, [open]);

  async function saveKey() {
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: keys[provider] }),
      });
      const data = await res.json();
      setStatus(res.ok ? "Saved." : data.error || "Save failed.");
    } catch {
      setStatus("Network error.");
    }
  }

  async function testConnection() {
    setTesting(true);
    setStatus("Testing…");
    try {
      const res = await fetch("/api/ai/test-connection", { method: "POST" });
      const data = await res.json();
      setStatus(data.message || (res.ok ? "ok" : "Failed."));
    } catch {
      setStatus("Network error.");
    }
    setTesting(false);
  }

  function clearKey() {
    setKeys((k) => ({ ...k, [provider]: "" }));
    setStatus("Key cleared locally. Save to persist.");
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
        style={{ background: "rgba(0,0,0,0.5)" }}
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
          <span
            className="font-semibold text-sm uppercase tracking-widest"
            style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}
          >
            Settings
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--ink-text-dim)" }}
          >
            ✕
          </button>
        </div>

        {/* Connection panel */}
        <div className="px-5 py-5 flex flex-col gap-4 flex-1">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--ink-text-dim)" }}
          >
            AI Provider
          </p>

          {/* Provider tri-state toggle */}
          <div
            className="flex rounded overflow-hidden border"
            style={{ borderColor: "var(--rule)" }}
          >
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{
                  background:  provider === p.id ? "var(--gold)" : "var(--ink-3)",
                  color:       provider === p.id ? "#fff" : "var(--ink-text-dim)",
                  fontFamily:  "var(--font-sans)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Key input */}
          <div className="flex flex-col gap-1">
            <label
              className="text-xs"
              style={{ color: "var(--ink-text-dim)" }}
            >
              API Key ({PROVIDERS.find((p) => p.id === provider)?.label})
            </label>
            <input
              type="password"
              value={keys[provider]}
              onChange={(e) => handleKeyInput(e.target.value)}
              placeholder="Paste your key…"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{
                background:  "var(--ink-3)",
                border:      "1px solid var(--rule)",
                color:       "var(--ink-text)",
                fontFamily:  "var(--font-mono)",
              }}
            />
          </div>

          {keyWarning && (
            <p className="text-xs px-2 py-1.5 rounded" style={{ color: "var(--amber)", background: "var(--amber-soft)", fontFamily: "var(--font-mono)" }}>
              {keyWarning}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={saveKey}
              className="flex-1 py-2 rounded text-sm font-medium transition-opacity"
              style={{ background: "var(--gold)", color: "#fff" }}
            >
              Save
            </button>
            <button
              onClick={clearKey}
              className="px-4 py-2 rounded text-sm font-medium"
              style={{
                background: "var(--ink-3)",
                color:      "var(--ink-text-dim)",
                border:     "1px solid var(--rule)",
              }}
            >
              Clear
            </button>
          </div>

          {/* Test connection */}
          <button
            onClick={testConnection}
            disabled={testing}
            className="w-full py-2 rounded text-sm font-medium transition-opacity"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--blue-accent)",
            }}
          >
            {testing ? "Testing…" : "Test connection"}
          </button>

          {/* Status line */}
          {status && (
            <p
              className="text-xs"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
            >
              {status}
            </p>
          )}
        </div>

        {/* Sign out */}
        <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--rule)" }}>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="w-full py-2 rounded text-sm font-medium transition-opacity"
            style={{
              background: "var(--ink-3)",
              border:     "1px solid var(--rule)",
              color:      "var(--red)",
              opacity:    signingOut ? 0.6 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );
}
