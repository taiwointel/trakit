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

function CollapsibleSection({ title, color = "var(--ink-text-dim)", defaultOpen = false, onOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  }
  return (
    <div className="flex flex-col gap-0">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full py-1"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color, fontFamily: "var(--font-sans)" }}>
          {title}
        </p>
        <span style={{ color: "var(--ink-text-dim)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div className="flex flex-col gap-3 pt-3">{children}</div>}
    </div>
  );
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
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [key,              setKey]              = useState("");
  const [keyWarning,       setKeyWarning]       = useState("");
  const [hasGroqKey,       setHasGroqKey]       = useState(false);
  const [hasGeminiKey,     setHasGeminiKey]     = useState(false);
  const [aiStatus,         setAiStatus]         = useState("");
  const [testing,          setTesting]          = useState(false);

  // ── Data & Privacy state ──────────────────────────────────
  const [clearChatStatus,  setClearChatStatus]  = useState("");
  const [clearingChat,     setClearingChat]     = useState(false);
  const [exportStatus,     setExportStatus]     = useState("");

  // ── Backup state ──────────────────────────────────────────
  const [backups,          setBackups]          = useState([]);
  const [backupsLoaded,    setBackupsLoaded]    = useState(false);
  const [needsMigration,   setNeedsMigration]   = useState(false);
  const [backingUp,        setBackingUp]        = useState(false);
  const [backupStatus,     setBackupStatus]     = useState("");
  const [restoringId,      setRestoringId]      = useState(null);

  // ── Account actions state ─────────────────────────────────
  const [signingOut,       setSigningOut]       = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText,       setDeleteText]       = useState("");
  const [deleting,         setDeleting]         = useState(false);
  const [deleteStatus,     setDeleteStatus]     = useState("");

  useEffect(() => {
    if (!open) return;
    setAiStatus(""); setKeyWarning(""); setNameStatus(""); setPassStatus("");
    setNewPassword(""); setConfirmPassword(""); setClearChatStatus(""); setExportStatus("");
    setBackupStatus(""); setBackupsLoaded(false);

    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const n = user.user_metadata?.full_name || user.email || "";
        setDisplayName(n);
        setDisplayNameInput(n);
      }
      fetch("/api/ai/settings")
        .then((r) => r.json())
        .then((d) => {
          setHasGroqKey(!!d.hasGroqKey);
          setHasGeminiKey(!!d.hasGeminiKey);
          setSelectedProvider(d.provider || "groq");
        })
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
    setSavingName(true); setNameStatus("Saving...");
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) setNameStatus(error.message);
    else { setDisplayName(trimmed); setNameStatus("Name updated."); }
    setSavingName(false);
  }

  async function savePassword() {
    if (!newPassword) { setPassStatus("Enter a new password."); return; }
    if (newPassword.length < 8) { setPassStatus("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPassStatus("Passwords do not match."); return; }
    setSavingPass(true); setPassStatus("Saving...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPassStatus(error.message);
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
    if (!clean) { setAiStatus(`Paste a ${selectedProvider === "gemini" ? "Gemini" : "Groq"} API key first.`); return; }
    setAiStatus("Saving...");
    try {
      const res  = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, key: clean }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiStatus("Saved.");
        if (selectedProvider === "groq")   setHasGroqKey(true);
        if (selectedProvider === "gemini") setHasGeminiKey(true);
        setKey("");
      } else {
        setAiStatus(data.error || "Save failed.");
      }
    } catch { setAiStatus("Network error."); }
  }

  async function testConnection() {
    setTesting(true); setAiStatus("Testing...");
    try {
      const res  = await fetch("/api/ai/test-connection", { method: "POST" });
      const data = await res.json();
      setAiStatus(data.message || (res.ok ? "Connection OK" : "Failed."));
    } catch { setAiStatus("Network error."); }
    setTesting(false);
  }

  // ── Data & Privacy handlers ────────────────────────────────
  async function clearChatHistory() {
    setClearingChat(true); setClearChatStatus("Clearing...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setClearChatStatus("Not authenticated."); setClearingChat(false); return; }
      await supabase.from("chat_messages").delete().eq("user_id", user.id);
      setClearChatStatus("Chat history cleared.");
    } catch { setClearChatStatus("Error — try again."); }
    setClearingChat(false);
  }

  async function exportEntriesCSV() {
    setExportStatus("Exporting...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setExportStatus("Not authenticated."); return; }
      const { data: entries, error } = await supabase
        .from("entries")
        .select("date, desc, amount, flow, beneficiary, category, subcategory, essentiality, nature")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;

      const headers = ["Date", "Description", "Amount", "Flow", "Beneficiary", "Category", "Subcategory", "Essentiality", "Nature"];
      const rows = entries.map((e) =>
        [e.date, `"${(e.desc || "").replace(/"/g, '""')}"`, e.amount, e.flow, e.beneficiary || "", e.category || "", e.subcategory || "", e.essentiality || "", e.nature || ""].join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `trakit7-entries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Exported ${entries.length} transactions.`);
    } catch (err) {
      setExportStatus(err.message || "Export failed.");
    }
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
    setDeleting(true); setDeleteStatus("Wiping your account and all data...");
    try {
      const res  = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteText }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteStatus(data.error || "Could not delete account. Try again."); setDeleting(false); return; }
      await supabase.auth.signOut();
      router.push("/auth");
      router.refresh();
    } catch { setDeleteStatus("Network error. Try again."); setDeleting(false); }
  }

  // ── Backup handlers ────────────────────────────────────────
  async function loadBackups() {
    if (backupsLoaded) return;
    try {
      const res = await fetch("/api/backups");
      const d   = await res.json();
      setBackups(d.backups || []);
      setNeedsMigration(!!d.needsMigration);
      setBackupsLoaded(true);
    } catch { setBackupStatus("Could not load backups."); }
  }

  async function createBackup() {
    setBackingUp(true); setBackupStatus("Creating backup…");
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: `Manual backup — ${new Date().toLocaleString("en-NG")}` }),
      });
      const d = await res.json();
      if (!res.ok) { setBackupStatus(d.error || "Backup failed."); }
      else {
        setBackups((prev) => [d.backup, ...prev]);
        setBackupStatus(`Backed up ${d.backup.entry_count} entries.`);
      }
    } catch { setBackupStatus("Network error."); }
    setBackingUp(false);
  }

  async function restoreBackup(id, label) {
    if (!confirm(`Restore "${label}"?\n\nThis will REPLACE all your current ledger entries with those in this backup. Your current data will be lost unless you create a backup first.`)) return;
    setRestoringId(id); setBackupStatus("Restoring…");
    try {
      const res = await fetch(`/api/backups/${id}/restore`, { method: "POST" });
      const d   = await res.json();
      if (!res.ok) { setBackupStatus(d.error || "Restore failed."); }
      else { setBackupStatus(`Restored ${d.restored} entries. Reload the page to see them.`); }
    } catch { setBackupStatus("Network error."); }
    setRestoringId(null);
  }

  if (!open) return null;

  const inputStyle = {
    background: "var(--ink-3)",
    border:     "1px solid var(--rule)",
    color:      "var(--ink-text)",
    fontFamily: "var(--font-sans)",
    outline:    "none",
  };
  const labelStyle = { color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12 };
  const isAiConnected = hasGroqKey || hasGeminiKey;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-y-auto"
        style={{
          width:      "min(420px, 92vw)",
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
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--rule)" }}>
          <span className="font-bold text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
            Settings
          </span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)" }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-6 flex-1">

          {/* ── Profile ─────────────────────────────── */}
          <Section title="Your Profile" color="var(--gold)">
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
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    opacity: savingName ? 0.6 : 1,
                  }}
                >
                  {savingName ? "..." : "Save"}
                </button>
              </div>
              {nameStatus && (
                <p className="text-xs" style={{ color: nameStatus.includes("updated") ? "var(--green)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {nameStatus}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-3 py-2.5 rounded-lg text-sm" style={inputStyle} />
              <button
                onClick={savePassword}
                disabled={savingPass || !newPassword}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: newPassword ? "var(--ink-text)" : "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: (!newPassword || savingPass) ? 0.6 : 1 }}
              >
                {savingPass ? "Saving..." : "Change Password"}
              </button>
              {passStatus && (
                <p className="text-xs" style={{ color: passStatus.includes("changed") ? "var(--green)" : passStatus.includes("match") || passStatus.includes("8") ? "var(--amber)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {passStatus}
                </p>
              )}
            </div>
          </Section>

          <Divider />

          {/* ── AI Connection (collapsible) ──────────── */}
          <CollapsibleSection
            title={`AI Connection${isAiConnected ? " · Connected" : " · Not set up"}`}
            color="var(--blue-accent)"
            defaultOpen={false}
          >
            {/* Provider toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--rule)", background: "var(--ink-3)" }}>
              {[
                { id: "groq",   label: "Groq",   hasKey: hasGroqKey },
                { id: "gemini", label: "Gemini", hasKey: hasGeminiKey },
              ].map(({ id, label, hasKey }) => (
                <button
                  key={id}
                  onClick={() => { setSelectedProvider(id); setKey(""); setAiStatus(""); setKeyWarning(""); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
                  style={{
                    background:  selectedProvider === id ? "var(--ink-2)" : "transparent",
                    color:       selectedProvider === id ? "var(--ink-text)" : "var(--ink-text-dim)",
                    fontFamily:  "var(--font-sans)",
                    borderRight: id === "groq" ? "1px solid var(--rule)" : "none",
                  }}
                >
                  {label}
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: hasKey ? "var(--green)" : "var(--ink-text-dim)", opacity: hasKey ? 1 : 0.4, display: "inline-block" }} />
                </button>
              ))}
            </div>

            <div className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(91,143,168,0.08)", border: "1px solid rgba(91,143,168,0.2)" }}>
              {selectedProvider === "groq" ? (
                <p className="text-xs leading-relaxed" style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}>
                  Free key at{" "}
                  <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>console.groq.com</a>
                  {" "}→ API Keys → Create. Key starts with{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>gsk_</span>.
                </p>
              ) : (
                <p className="text-xs leading-relaxed" style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}>
                  Free key at{" "}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "underline" }}>aistudio.google.com/apikey</a>
                  {" "}→ Create API key. Key starts with{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>AIza</span>.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                {selectedProvider === "groq" ? "Groq" : "Gemini"} key
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                background: (selectedProvider === "groq" ? hasGroqKey : hasGeminiKey) ? "rgba(47,122,86,0.2)" : "rgba(184,57,43,0.15)",
                color: (selectedProvider === "groq" ? hasGroqKey : hasGeminiKey) ? "var(--green)" : "var(--red)",
                fontFamily: "var(--font-sans)",
              }}>
                {(selectedProvider === "groq" ? hasGroqKey : hasGeminiKey) ? "Connected" : "Not connected"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>
                {(selectedProvider === "groq" ? hasGroqKey : hasGeminiKey) ? "Update API key" : `Paste your ${selectedProvider === "gemini" ? "Gemini" : "Groq"} API key`}
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => handleKeyInput(e.target.value)}
                placeholder={(selectedProvider === "groq" ? hasGroqKey : hasGeminiKey) ? "Paste to replace..." : selectedProvider === "groq" ? "gsk_..." : "AIza..."}
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
              <button onClick={saveKey} disabled={!key.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff", fontFamily: "var(--font-sans)", opacity: !key.trim() ? 0.45 : 1 }}>
                Save Key
              </button>
              <button onClick={testConnection} disabled={testing || !isAiConnected} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--blue-accent)", fontFamily: "var(--font-sans)", opacity: (testing || !isAiConnected) ? 0.45 : 1 }}>
                {testing ? "Testing..." : "Test"}
              </button>
            </div>

            {aiStatus && (
              <p className="text-xs" style={{ color: aiStatus.includes("Saved") || aiStatus.includes("OK") || aiStatus.includes("ok") || aiStatus.includes("Groq:") || aiStatus.includes("Gemini:") ? "var(--green)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                {aiStatus}
              </p>
            )}
          </CollapsibleSection>

          <Divider />

          {/* ── Notifications ────────────────────────── */}
          <CollapsibleSection title="Notifications" color="var(--teal)">
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Payday reminder", desc: "Alert 2 days before your next payday" },
                { label: "Budget breach alert", desc: "When a category exceeds its cap" },
                { label: "Weekly spend digest", desc: "Sunday summary of the week's transactions" },
                { label: "Large transaction alert", desc: "When a single expense exceeds ₦50,000" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>{desc}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ background: "var(--ink-3)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", border: "1px solid var(--rule)" }}>
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <Divider />

          {/* ── Ledger Backups ──────────────────────── */}
          <CollapsibleSection title="Ledger Backups" color="var(--green)" defaultOpen={false} onOpen={loadBackups}>
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Save a snapshot of all your ledger entries at any point in time. Backups are stored in your account and can be restored if you accidentally clear your data. A backup is also created automatically before any bulk delete.
              </p>

              {needsMigration ? (
                <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--amber-soft)", border: "1px solid rgba(200,134,46,0.3)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--amber)", fontFamily: "var(--font-sans)" }}>Database migration required</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                    Run this SQL in your Supabase SQL editor to enable backups:
                  </p>
                  <pre className="text-xs mt-2 p-2 rounded overflow-x-auto" style={{ background: "var(--ink-3)", color: "var(--ink-text)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", fontSize: 10 }}>
{`CREATE TABLE IF NOT EXISTS entry_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  label text NOT NULL DEFAULT 'Manual backup',
  entry_count integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '[]'
);
ALTER TABLE entry_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_backups" ON entry_backups
  FOR ALL USING (auth.uid() = user_id);`}
                  </pre>
                </div>
              ) : (
                <>
                  <button
                    onClick={createBackup}
                    disabled={backingUp}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold"
                    style={{
                      background: backingUp ? "var(--ink-3)" : "linear-gradient(135deg, var(--green), #3a9967)",
                      color: "#fff", fontFamily: "var(--font-sans)",
                      opacity: backingUp ? 0.6 : 1,
                    }}
                  >
                    {backingUp ? "Backing up…" : "Back up ledger now"}
                  </button>

                  {backupStatus && (
                    <p className="text-xs" style={{
                      color: backupStatus.includes("Backed up") || backupStatus.includes("Restored") ? "var(--green)" : "var(--amber)",
                      fontFamily: "var(--font-mono)",
                    }}>
                      {backupStatus}
                    </p>
                  )}

                  {backups.length === 0 && backupsLoaded && (
                    <p className="text-xs text-center py-2" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                      No backups yet.
                    </p>
                  )}

                  {backups.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                        Saved backups
                      </p>
                      {backups.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                              {b.label}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                              {b.entry_count} entries · {new Date(b.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                          <button
                            onClick={() => restoreBackup(b.id, b.label)}
                            disabled={restoringId === b.id}
                            className="shrink-0 px-2.5 py-1 rounded text-xs font-semibold"
                            style={{
                              background: "var(--amber-soft)",
                              color: "var(--amber)",
                              fontFamily: "var(--font-sans)",
                              opacity: restoringId === b.id ? 0.5 : 1,
                            }}
                          >
                            {restoringId === b.id ? "…" : "Restore"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleSection>

          <Divider />

          {/* ── Data & Privacy ───────────────────────── */}
          <CollapsibleSection title="Data & Privacy" color="var(--violet)">
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Export transactions</p>
                <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  Download all your entries as a CSV file you can open in Excel or Google Sheets.
                </p>
                <button
                  onClick={exportEntriesCSV}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
                >
                  Download CSV
                </button>
                {exportStatus && (
                  <p className="text-xs" style={{ color: exportStatus.includes("Exported") ? "var(--green)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                    {exportStatus}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: "var(--rule)" }} />

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Clear Coach RBC chat history</p>
                <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  Permanently removes all chat messages from your account. Your financial data is not affected.
                </p>
                <button
                  onClick={clearChatHistory}
                  disabled={clearingChat}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)", opacity: clearingChat ? 0.6 : 1 }}
                >
                  {clearingChat ? "Clearing..." : "Clear Chat History"}
                </button>
                {clearChatStatus && (
                  <p className="text-xs" style={{ color: clearChatStatus.includes("cleared") ? "var(--green)" : "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
                    {clearChatStatus}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: "var(--rule)" }} />

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Data storage</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  All your data is stored securely in Supabase Postgres, protected by Row Level Security — only you can access your records. Your AI provider key is stored encrypted and is never returned to the browser in plaintext.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          <Divider />

          {/* ── App Preferences ──────────────────────── */}
          <CollapsibleSection title="App Preferences" color="var(--amber)">
            <div className="flex flex-col gap-3">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Theme</p>
                  <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Toggle light/dark using the ☀/☾ button in the top bar</p>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--rule)" }} />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Currency</p>
                  <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Nigerian Naira (₦) — set for this account</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{ background: "var(--ink-3)", color: "var(--gold)", fontFamily: "var(--font-mono)", border: "1px solid var(--rule)" }}>
                  ₦ NGN
                </span>
              </div>

              <div style={{ height: 1, background: "var(--rule)" }} />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Payday & salary setup</p>
                  <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Configure in the Goals tab under "Salary & Payday"</p>
                </div>
              </div>

            </div>
          </CollapsibleSection>

          <Divider />

          {/* ── Help & About ─────────────────────────── */}
          <Section title="Help & About" color="var(--blue-accent)">
            <button
              onClick={() => { onClose(); onStartTour?.(); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-left px-3"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
            >
              🗺 Take the app tour
            </button>

            <button
              onClick={() => { onClose(); router.push("/summary#annual-wrapped"); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-left px-3"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
            >
              📊 Year in Review
            </button>

            <div className="px-3 py-2.5 rounded-xl flex flex-col gap-1" style={{ background: "rgba(91,143,168,0.07)", border: "1px solid rgba(91,143,168,0.2)" }}>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Version</span>
                <span className="text-xs" style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>Trakit7 v1.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>Built with</span>
                <span className="text-xs" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>Next.js · Supabase · Gemini</span>
              </div>
            </div>
          </Section>

          <Divider />

          {/* ── Account Actions ──────────────────────── */}
          <Section title="Account">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)", opacity: signingOut ? 0.6 : 1, fontFamily: "var(--font-sans)" }}
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
              <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: "var(--red-soft)", border: "1px solid rgba(184,57,43,0.4)" }}>
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
                  style={{ background: "var(--ink-3)", border: "1px solid rgba(184,57,43,0.5)", color: "var(--ink-text)", fontFamily: "var(--font-mono)", outline: "none" }}
                />
                {deleteStatus && <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>{deleteStatus}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: "var(--ink-3)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleting || deleteText !== "DELETE"}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: "var(--red)", color: "#fff", fontFamily: "var(--font-sans)", opacity: (deleting || deleteText !== "DELETE") ? 0.45 : 1 }}
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
