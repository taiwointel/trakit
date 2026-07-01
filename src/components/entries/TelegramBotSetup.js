"use client";

import { useState, useEffect } from "react";

export default function TelegramBotSetup() {
  const [status,    setStatus]    = useState(null);  // null | {connected, botUsername, chatLinked}
  const [token,     setToken]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [removing,  setRemoving]  = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const res  = await fetch("/api/telegram/settings");
      const data = await res.json();
      if (!data.error) setStatus(data);
    } catch { /* network error — leave status null */ }
  }

  async function handleConnect(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res  = await fetch("/api/telegram/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Connection failed."); return; }
      setToken("");
      await fetchStatus();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect your Telegram bot? Your existing entries won't be affected.")) return;
    setRemoving(true);
    await fetch("/api/telegram/settings", { method: "DELETE" }).catch(() => {});
    setStatus(null);
    setRemoving(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (status === null) {
    return (
      <div style={{ padding: "20px", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  // ── Connected + chat linked (fully operational) ──────────────────────
  if (status.connected && status.chatLinked) {
    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Status badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--green-soft)", color: "var(--green)",
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 10px", borderRadius: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            Active
          </span>
          <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
            @{status.botUsername}
          </span>
        </div>

        {/* Example commands */}
        <div style={{ background: "var(--ink-3)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Message your bot with:
          </p>
          {[
            ["3500 suya at Mallam Musa",  "🔴 Out"],
            ["12k petrol Total filling",  "🔴 Out"],
            ["received 50000 salary",     "🟢 In"],
            ["2500 Bolt Lagos-Ikeja",     "🔴 Out"],
          ].map(([ex, tag]) => (
            <div key={ex} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <code style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {ex}
              </code>
              <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11 }}>
                → {tag}
              </span>
            </div>
          ))}
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, marginTop: 4 }}>
            Supports: <code style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>12k</code> = ₦12,000 &nbsp;|&nbsp;
            <code style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}>1.5m</code> = ₦1,500,000
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={`https://t.me/${status.botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open @{status.botUsername} ↗
          </a>
          <button
            onClick={handleDisconnect}
            disabled={removing}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "transparent", border: "1px solid var(--rule)",
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 12, cursor: "pointer",
            }}
          >
            {removing ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  // ── Connected but chat not yet linked ────────────────────────────────
  if (status.connected && !status.chatLinked) {
    return (
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--amber-soft)", color: "var(--amber)",
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "3px 10px", borderRadius: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
            One step left
          </span>
          <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}>
            @{status.botUsername}
          </span>
        </div>

        <div
          style={{
            background: "rgba(232,146,10,0.08)", border: "1px solid var(--amber-soft)",
            borderRadius: 10, padding: "14px 16px",
          }}
        >
          <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6 }}>
            Open your bot on Telegram and send <code style={{ fontFamily: "var(--font-mono)", background: "var(--ink-3)", padding: "1px 5px", borderRadius: 4 }}>/start</code> to link your account. This is the last step.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={`https://t.me/${status.botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open @{status.botUsername} &amp; send /start ↗
          </a>
          <button
            onClick={fetchStatus}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "var(--ink-3)", border: "1px solid var(--rule)",
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 12, cursor: "pointer",
            }}
          >
            I've sent it — refresh
          </button>
          <button
            onClick={handleDisconnect}
            disabled={removing}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "transparent", border: "1px solid var(--rule)",
              color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 12, cursor: "pointer", marginLeft: "auto",
            }}
          >
            {removing ? "…" : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  // ── Not connected — setup flow ────────────────────────────────────────
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Step-by-step instructions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          {
            n: "1",
            title: "Create a bot via @BotFather",
            body:  "Open Telegram and search for @BotFather. Send /newbot, choose a name and a username (e.g. MyTrakit7Bot). BotFather will hand you a token.",
            link:  { href: "https://t.me/BotFather", label: "Open @BotFather ↗" },
          },
          {
            n: "2",
            title: "Paste your token below and click Connect",
            body:  "We'll validate it, set up the webhook automatically, and confirm the bot name.",
          },
          {
            n: "3",
            title: "Send /start to your bot",
            body:  "This one-time step links your Telegram chat to your account. After that, every message is a logged entry.",
          },
        ].map((step) => (
          <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
              background: "var(--gold)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              marginTop: 1,
            }}>
              {step.n}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600 }}>
                {step.title}
              </p>
              <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.6 }}>
                {step.body}
              </p>
              {step.link && (
                <a
                  href={step.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                >
                  {step.link.label}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Token input form */}
      <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => { setToken(e.target.value); setError(""); }}
              placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw..."
              autoComplete="off"
              style={{
                width: "100%", padding: "10px 40px 10px 12px",
                borderRadius: 10, boxSizing: "border-box",
                background: "var(--ink-3)", border: "1px solid var(--rule)",
                color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--ink-text-dim)", fontSize: 13,
              }}
              title={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? "🙈" : "👁"}
            </button>
          </div>
          <button
            type="submit"
            disabled={saving || !token.trim()}
            style={{
              padding: "10px 20px", borderRadius: 10, flexShrink: 0,
              background: saving || !token.trim()
                ? "var(--ink-3)"
                : "linear-gradient(135deg, var(--gold-deep), var(--gold))",
              color: saving || !token.trim() ? "var(--ink-text-dim)" : "#fff",
              border: "1px solid " + (saving || !token.trim() ? "var(--rule)" : "transparent"),
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              cursor: saving || !token.trim() ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Connecting…" : "Connect"}
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 12 }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
