"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Section({ title, color = "var(--ink-text-dim)", children }) {
  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color, fontFamily: "var(--font-sans)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--rule)", margin: "4px 0" }} />;
}

export default function SettingsDrawer({ open, onClose, onStartTour }) {
  const router   = useRouter();
  const supabase = createClient();

  // ── Profile state ──────────────────────────────────────────
  const [displayName,      setDisplayName]      = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [savingName,       setSavingName]       = useState(false);
  const [nameStatus,       setNameStatus]       = useState("");

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPass,      setSavingPass]      = useState(false);
  const [passStatus,      setPassStatus]      = useState("");

  // ── AI connection state ───────────────────────────────────
  const [key,        setKey]        = useState("");
  const [keyWarning, setKeyWarning] = useState("");
  const [hasKey,     setHasKey]     = useState(false);
  const [status,     setStatus]     = useState("");
  const [testing,    setTesting]    = useState(false);

  // ── Telegram state ────────────────────────────────────────
  const [tgToken, setTgToken] = useState("");

  // ── Account actions state ─────────────────────────────────
  const [signingOut,       setSigningOut]       = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText,       setDeleteText]       = useState("");
  const [deleting,         setDeleting]         = useState(false);
  const [deleteStatus,     setDeleteStatus]     = useState("");

  useEffect(() => {
    if (!open) return;
    setStatus(""); setKeyWarning(""); setNameStatus(""); setPassStatus("");
    setNewPassword(""); setConfirmPassword("");

    async function loadSettings() {
      // Load name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const n = user.user_metadata?.full_name || user.email || "";
        setDisplayName(n);
        setDisplayNameInput(n);
      }
      // Load AI key status
      fetch("/api/ai/settings")
        .then((r) => r.json())
        .then((d) => setHasKey(!!d.hasKey))
        .catch(() => {});
    }
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Profile handlers ───────────────────────────────────────
  async function saveName() {
    const trimmed = displayNameInput.trim();
    if (!trimmed) { setNameStatus("Name cannot be empty."); return; }
    if (trimmed === displayName) { setNameStatus("No change."); return; }
    setSavingName(true);
    setNameStatus("Saving...");
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) { setNameStatus(error.message); }
    else { setDisplayName(trimmed); setNameStatus("Name updated."); }
    setSavingName(false);
  }

  async function savePassword() {
    if (!newPassword) { setPassStatus("Enter a new password."); return; }
    if (newPassword.length < 8) { setPassStatus("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPassStatus("Passwords do not match."); return; }
    setSavingPass(true);
    setPassStatus("Saving...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPassStatus(error.message); }
    else { setPassStatus("Password changed."); setNewPassword(""); setConfirmPassword(""); }
    setSavingPass(false);
  }

  // ── AI key handlers ────────────────────────────────────────
  function handleKeyInput(value) {
    const clean = value.replace(/[^\x20-\x7E]/g, "");
    setKeyWarning(clean.length !== value.length ? "Non-ASCII characters removed. Check your key is correct." : "");
    setKey(clean);
  }

  async function saveKey() {
    const clean = key.replace(/[^\x20-\x7E]/g, "").trim();
    if (!clean) { setStatus("Paste a Groq API key first."); return; }
    setStatus("Saving...");
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "groq", key: clean }),
      });
      const data = await res.json();
      if (res.ok) { setStatus("Saved."); setHasKey(true); setKey(""); }
      else setStatus(data.error || "Save failed.");
    } catch { setStatus("Network error."); }
  }

  async function testConnection() {
    setTesting(true); setStatus("Testing...");
    try {
      const res  = await fetch("/api/ai/test-connection", { method: "POST" });
      const data = await res.json();
      setStatus(data.message || (res.ok ? "Connection OK" : "Failed."));
    } catch { setStatus("Network error."); }
    setTesting(false);
  }

  // ── Account action handlers ────────────────────────────────
  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    onClose();
    router.push("/auth");
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteStatus("Wiping your account and all data...");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteStatus(data.error || "Could not delete account. Try again.");
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } catch {
      setDeleteStatus("Network error. Try again.");
      setDeleting(false);
    }
  }

  if (!open) return null;

  const inputStyle = {
    background:  "var(--ink-3)",
    border:      "1px solid var(--rule)",
    color:       "var(--ink-text)",
    fontFamily:  "var(--font-sans)",
    outline:     "none",
  };

  const labelStyle = {
    color:      "var(--ink-text-dim)",
    fontFamily: "var(--font-sans)",
    fontSize:   12,
  };

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
          width:      "min(400px, 92vw)",
          background: "var(--ink-2)",
          borderLeft: "1px solid var(--rule)",
          animation:  "slideInRight 220ms ease forwards",
          boxShadow:  "-8px 0 40px rgba(0,0,0,0.45)",
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
          <span className="font-bold text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
            Settings
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)" }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-6 flex-1">

          {/* ── Profile ─────────────────────────────── */}
          <Section title="Your Profile" color="var(--gold)">

            {/* Display name */}
            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Display name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                  style={inputStyle}
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    background: savingName ? "var(--ink-3)" : "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                    color:      "#fff",
                    fontFamily: "var(--font-sans)",
                    opacity:    savingName ? 0.6 : 1,
                  }}
                >
                  {savingName ? "..." : "Save"}
                </button>
              </div>
              {nameStatus && (
                <p
                  className="text-xs"
                  style={{
                    color:      nameStatus.includes("updated") ? "var(--green)" : "var(--ink-text-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {nameStatus}
                </p>
              )}
            </div>

            {/* Change password */}
            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={inputStyle}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={inputStyle}
              />
              <button
                onClick={savePassword}
                disabled={savingPass || !newPassword}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  color:      newPassword ? "var(--ink-text)" : "var(--ink-text-dim)",
                  fontFamily: "var(--font-sans)",
                  opacity:    (!newPassword || savingPass) ? 0.6 : 1,
                }}
              >
                {savingPass ? "Saving..." : "Change Password"}
              </button>
              {passStatus && (
                <p
                  className="text-xs"
                  style={{
                    color:      passStatus.includes("changed") ? "var(--green)" : passStatus.includes("match") || passStatus.includes("8") ? "var(--amber)" : "var(--ink-text-dim)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {passStatus}
                </p>
              )}
            </div>
          </Section>

          <Divider />

          {/* ── AI Connection ────────────────────────── */}
          <Section title="AI Connection" color="var(--blue-accent)">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Groq (free tier)
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: hasKey ? "rgba(47,122,86,0.2)" : "rgba(184,57,43,0.15)",
                  color:      hasKey ? "var(--green)" : "var(--red)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {hasKey ? "Connected" : "Not connected"}
              </span>
            </div>

            <div
              className="px-3 py-2.5 rounded-xl flex items-start gap-2.5"
              style={{ background: "rgba(91,143,168,0.08)", border: "1px solid rgba(91,143,168,0.2)" }}
            >
              <p className="text-xs leading-relaxed" style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}>
                Get a free key at{" "}
                <a
                  href="https://console.groq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", textDecoration: "underline" }}
                >
                  console.groq.com
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>{hasKey ? "Update API Key" : "Paste your Groq API key"}</label>
              <input
                type="password"
                value={key}
                onChange={(e) => handleKeyInput(e.target.value)}
                placeholder={hasKey ? "Paste to replace..." : "gsk_..."}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
            </div>

            {keyWarning && (
              <p className="text-xs px-2 py-1.5 rounded-lg" style={{ color: "var(--amber)", background: "var(--amber-soft)", fontFamily: "var(--font-mono)" }}>
                {keyWarning}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={saveKey}
                disabled={!key.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                  color:      "#fff",
                  fontFamily: "var(--font-sans)",
                  opacity:    !key.trim() ? 0.45 : 1,
                }}
              >
                Save Key
              </button>
              <button
                onClick={testConnection}
                disabled={testing || !hasKey}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  color:      "var(--blue-accent)",
                  fontFamily: "var(--font-sans)",
                  opacity:    (!hasKey || testing) ? 0.45 : 1,
                }}
              >
                {testing ? "Testing..." : "Test"}
              </button>
            </div>

            {status && (
              <p
                className="text-xs"
                style={{
                  color:      status.includes("Saved") || status.includes("OK") ? "var(--green)" : "var(--ink-text-dim)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {status}
              </p>
            )}
          </Section>

          <Divider />

          {/* ── Help & resources ─────────────────────── */}
          <Section title="Help & resources" color="var(--blue-accent)">
            <button
              onClick={() => { onClose(); onStartTour?.(); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-left px-3"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
            >
              🗺 Take the app tour
            </button>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Telegram quick-log
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Log expenses by sending messages to your own Telegram bot. Create a bot via @BotFather, then enter your token below and send <code>/start</code> to your bot to link your account.
              </p>
              <input
                type="text"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="Telegram bot token (from @BotFather)"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 11, outline: "none" }}
              />
              <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Set webhook URL in Telegram to:{" "}
                <span
                  className="select-all"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold)" }}
                >
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/telegram/webhook
                </span>
              </p>
            </div>
          </Section>

          <Divider />

          {/* ── Account Actions ──────────────────────── */}
          <Section title="Account">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{
                background: "var(--ink-3)",
                border:     "1px solid var(--rule)",
                color:      "var(--ink-text)",
                opacity:    signingOut ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>

            {!confirmingDelete ? (
              <button
                onClick={() => { setConfirmingDelete(true); setDeleteText(""); setDeleteStatus(""); }}
                className="w-full py-2 rounded-lg text-xs font-medium"
                style={{ background: "transparent", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Delete account
              </button>
            ) : (
              <div
                className="flex flex-col gap-3 p-4 rounded-xl"
                style={{ background: "var(--red-soft)", border: "1px solid rgba(184,57,43,0.4)" }}
              >
                <p className="text-xs leading-relaxed font-semibold" style={{ color: "var(--red)", fontFamily: "var(--font-sans)" }}>
                  This permanently deletes all your entries, budgets, investments, goals, and chat history. There is no undo.
                </p>
                <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  Type <span className="font-bold" style={{ color: "var(--red)" }}>DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--ink-3)",
                    border:     "1px solid rgba(184,57,43,0.5)",
                    color:      "var(--ink-text)",
                    fontFamily: "var(--font-mono)",
                    outline:    "none",
                  }}
                />
                {deleteStatus && (
                  <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                    {deleteStatus}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: "var(--ink-3)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleting || deleteText !== "DELETE"}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{
                      background: "var(--red)",
                      color:      "#fff",
                      fontFamily: "var(--font-sans)",
                      opacity:    (deleting || deleteText !== "DELETE") ? 0.45 : 1,
                    }}
                  >
                    {deleting ? "Deleting..." : "Permanently delete"}
                  </button>
                </div>
              </div>
            )}
          </Section>

        </div>
      </div>
    </>
  );
}
