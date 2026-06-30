"use client";

import { useState, useEffect } from "react";

/* ── tiny icon svgs per step ── */
function IconGroq() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="rgba(169,133,79,0.15)"/>
      <path d="M14 28c0-7.732 6.268-14 14-14s14 6.268 14 14-6.268 14-14 14" stroke="#A9854F" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="28" cy="28" r="6" fill="#A9854F"/>
      <path d="M28 34v4M34 28h4" stroke="#A9854F" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconBrowser() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="8" y="13" width="40" height="30" rx="4" fill="rgba(91,143,168,0.2)" stroke="#5B8FA8" strokeWidth="2"/>
      <rect x="8" y="13" width="40" height="10" rx="4" fill="#5B8FA8" opacity="0.6"/>
      <circle cx="16" cy="18" r="2" fill="white" opacity="0.8"/>
      <circle cx="23" cy="18" r="2" fill="white" opacity="0.8"/>
      <rect x="30" y="15" width="14" height="5" rx="2.5" fill="white" opacity="0.5"/>
      <path d="M16 32h24M16 37h16" stroke="#5B8FA8" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconSidebar() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="8" y="10" width="40" height="36" rx="4" fill="rgba(47,122,86,0.15)" stroke="#2F7A56" strokeWidth="2"/>
      <rect x="8" y="10" width="16" height="36" rx="4" fill="#2F7A56" opacity="0.25"/>
      <path d="M13 20h6M13 27h6M13 34h6" stroke="#2F7A56" strokeWidth="2" strokeLinecap="round"/>
      <rect x="13" y="24" width="6" height="5" rx="2" fill="#2F7A56" opacity="0.7"/>
      <path d="M28 22h16M28 28h12M28 34h14" stroke="#2F7A56" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="rgba(200,134,46,0.12)"/>
      <circle cx="23" cy="26" r="8" stroke="#C8862E" strokeWidth="2.5"/>
      <path d="M29 31l12 12M35 37l4-4" stroke="#C8862E" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="23" cy="26" r="3" fill="#C8862E"/>
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="14" y="16" width="28" height="32" rx="4" fill="rgba(91,143,168,0.2)" stroke="#5B8FA8" strokeWidth="2"/>
      <rect x="20" y="12" width="16" height="8" rx="4" fill="#5B8FA8" opacity="0.6"/>
      <path d="M20 28h16M20 34h12" stroke="#5B8FA8" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="38" cy="38" r="8" fill="#2F7A56"/>
      <path d="M34 38l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function OverlayShell({ children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,14,18,0.97)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="relative w-full flex flex-col items-center gap-0"
        style={{ maxWidth: 480 }}
      >
        {/* Trakit7 wordmark */}
        <div className="flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="url(#lgOnb)"/>
            <defs>
              <linearGradient id="lgOnb" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#C8862E"/>
                <stop offset="1" stopColor="#A9854F"/>
              </linearGradient>
            </defs>
            <path d="M9 14h10M14 9v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M10 18l8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
          </svg>
          <span style={{ color: "#ECE9E1", fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 700, letterSpacing: -0.5 }}>
            Trakit7
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function StepCard({ icon, stepLabel, title, body, onNext, nextLabel = "Got it →", extra }) {
  return (
    <div
      className="w-full rounded-2xl flex flex-col gap-5 p-7 slide-in"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: "rgba(169,133,79,0.15)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}>
          {stepLabel}
        </span>
        <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </h2>
        <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.7 }}>
          {body}
        </p>
      </div>
      {extra}
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
        style={{ background: "linear-gradient(135deg, #C8862E, #A9854F)", color: "#fff", fontFamily: "var(--font-sans)" }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

export default function OnboardingFlow({ userName }) {
  const [show, setShow]       = useState(false);
  const [checked, setChecked] = useState(false);
  const [step, setStep]       = useState(0);
  const [key, setKey]         = useState("");
  const [status, setStatus]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => { if (!d.hasKey) setShow(true); })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  // Block render of the dashboard underneath until we know whether the
  // wizard needs to show — prevents a flash of the app before the overlay.
  if (!checked) {
    return (
      <div
        className="fixed inset-0 z-50"
        style={{ background: "var(--ink)" }}
        aria-hidden="true"
      />
    );
  }

  async function handleSave() {
    const clean = key.replace(/[^\x20-\x7E]/g, "").trim();
    if (!clean) { setStatus("Please paste your Groq API key above."); return; }
    if (!clean.startsWith("gsk_")) { setStatus("Groq keys start with gsk_. Double-check you copied the right thing."); return; }
    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "groq", key: clean }),
      });
      if (!res.ok) { const d = await res.json(); setStatus(d.error || "Save failed."); return; }
      setStatus("Testing connection…");
      const tr = await fetch("/api/ai/test-connection", { method: "POST" });
      const td = await tr.json();
      if (!tr.ok) {
        setStatus("Key saved but test failed: " + (td.message || "unknown error"));
      } else {
        setDone(true);
      }
    } catch {
      setStatus("Network error. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  const name = userName || "there";
  const TOTAL = 5;

  if (done) {
    return (
      <OverlayShell>
        <div
          className="w-full rounded-2xl flex flex-col items-center gap-6 p-8 text-center slide-in"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          <div style={{ fontSize: 72 }}>🎉</div>
          <div>
            <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.8rem", fontWeight: 700 }}>
              You&apos;re all set, {name}!
            </h2>
            <p className="mt-2" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", lineHeight: 1.7, maxWidth: 320, margin: "0.5rem auto 0" }}>
              Coach RBC is ready and already knows your numbers. Ask her anything. She&apos;s built for this.
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="w-full py-3 rounded-xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, #C8862E, #A9854F)", color: "#fff", fontFamily: "var(--font-sans)" }}
          >
            Enter Trakit7 →
          </button>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell>
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6 w-full">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: i === step ? 2 : 1,
              height: 4,
              borderRadius: 2,
              background: i <= step ? "var(--gold)" : "var(--ink-3)",
              transition: "all 0.35s ease",
            }}
          />
        ))}
      </div>

      {step === 0 && (
        <StepCard
          icon={<IconGroq />}
          stepLabel={`Step 1 of ${TOTAL}`}
          title={`Hey ${name}, one quick setup 👋`}
          body="Trakit7 uses Groq (a free AI service) to power Coach RBC, your personal finance coach. You'll need a free API key. It takes about 2 minutes and costs nothing."
          onNext={() => setStep(1)}
          nextLabel="Let's get the key →"
        />
      )}

      {step === 1 && (
        <StepCard
          icon={<IconBrowser />}
          stepLabel={`Step 2 of ${TOTAL}`}
          title="Open the Groq console"
          body='In a new tab, go to console.groq.com and create a free account. Sign up with email or Google. No credit card needed.'
          extra={
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            >
              <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                console.groq.com
              </span>
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)", textDecoration: "none" }}
              >
                Open ↗
              </a>
            </div>
          }
          onNext={() => setStep(2)}
          nextLabel="I've signed up →"
        />
      )}

      {step === 2 && (
        <StepCard
          icon={<IconSidebar />}
          stepLabel={`Step 3 of ${TOTAL}`}
          title={`Click "API Keys" in the sidebar`}
          body={`Once you're logged in, look at the left sidebar. Click "API Keys". You'll land on a page that manages your keys.`}
          extra={
            <div
              className="px-4 py-3 rounded-xl"
              style={{ background: "rgba(47,122,86,0.1)", border: "1px solid rgba(47,122,86,0.3)" }}
            >
              <p style={{ color: "#2F7A56", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                💡 The sidebar is on the left side of the screen. You&apos;ll see icons for Home, Playground, API Keys, etc.
              </p>
            </div>
          }
          onNext={() => setStep(3)}
          nextLabel="I see it →"
        />
      )}

      {step === 3 && (
        <StepCard
          icon={<IconKey />}
          stepLabel={`Step 4 of ${TOTAL}`}
          title="Create a new API key"
          body={`Click the "+ Create API Key" button. Give it any name, like "Trakit7". The key will appear once. Copy it now. You won't see it again after closing the dialog.`}
          extra={
            <div
              className="px-4 py-3 rounded-xl"
              style={{ background: "rgba(184,57,43,0.1)", border: "1px solid rgba(184,57,43,0.3)" }}
            >
              <p style={{ color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                ⚠️ Copy the key immediately. Groq only shows it once. If you miss it, just delete and create a new one.
              </p>
            </div>
          }
          onNext={() => setStep(4)}
          nextLabel="I've copied the key →"
        />
      )}

      {step === 4 && (
        <div
          className="w-full rounded-2xl flex flex-col gap-5 p-7 slide-in"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <IconClipboard />
            <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: "rgba(169,133,79,0.15)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}>
              Step 5 of {TOTAL}: Final step!
            </span>
            <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.3 }}>
              Paste your key below
            </h2>
            <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              Your key starts with <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>gsk_</span>. Paste it here. It&apos;s saved securely and never exposed in the browser.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={key}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^\x20-\x7E]/g, "");
                setKey(clean);
                setStatus("");
              }}
              placeholder="gsk_..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "var(--ink-3)",
                border: "1px solid " + (status && !saving ? "var(--red)" : "var(--rule)"),
                color: "var(--ink-text)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
              }}
            />
            {status && (
              <p
                className="text-xs px-1"
                style={{
                  color: status.includes("Testing") || status.includes("Saving") ? "var(--amber)" : "var(--red)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {status}
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !key.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity"
            style={{
              background: "linear-gradient(135deg, #C8862E, #A9854F)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              opacity: saving || !key.trim() ? 0.55 : 1,
            }}
          >
            {saving ? "Connecting…" : "Save & Connect →"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Your key is stored securely in the database, never in your browser.
          </p>
        </div>
      )}
    </OverlayShell>
  );
}
