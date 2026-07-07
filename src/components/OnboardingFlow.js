"use client";

import { useState, useEffect } from "react";

/* ── Icon components ── */
function IconWave() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="rgba(169,133,79,0.12)"/>
      <circle cx="28" cy="28" r="10" fill="var(--gold)" opacity="0.85">
        <animate attributeName="r" values="10;12;10" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.85;0.5;0.85" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <line x1="28" y1="8" x2="28" y2="14" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="28" y1="42" x2="28" y2="48" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="8" y1="28" x2="14" y2="28" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="42" y1="28" x2="48" y2="28" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconBrowser({ color = "#5B8FA8" }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="8" y="13" width="40" height="30" rx="4" fill={`${color}22`} stroke={color} strokeWidth="2"/>
      <rect x="8" y="13" width="40" height="10" rx="4" fill={color} opacity="0.55"/>
      <circle cx="16" cy="18" r="2" fill="white" opacity="0.8"/>
      <circle cx="23" cy="18" r="2" fill="white" opacity="0.8"/>
      <rect x="30" y="15" width="14" height="5" rx="2.5" fill="white" opacity="0.5"/>
      <path d="M16 32h24M16 37h16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconSidebar() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="8" y="10" width="40" height="36" rx="4" fill="rgba(47,122,86,0.12)" stroke="#2F7A56" strokeWidth="2"/>
      <rect x="8" y="10" width="16" height="36" rx="4" fill="#2F7A56" opacity="0.2"/>
      <path d="M13 20h6M13 27h6M13 34h6" stroke="#2F7A56" strokeWidth="2" strokeLinecap="round"/>
      <rect x="13" y="24" width="6" height="5" rx="2" fill="#2F7A56" opacity="0.7"/>
      <path d="M28 22h16M28 28h12M28 34h14" stroke="#2F7A56" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <rect x="14" y="16" width="28" height="32" rx="4" fill="rgba(91,143,168,0.18)" stroke="#5B8FA8" strokeWidth="2"/>
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
      <div className="relative w-full flex flex-col items-center gap-0" style={{ maxWidth: 480 }}>
        <div className="flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="url(#lgOnb2)"/>
            <defs>
              <linearGradient id="lgOnb2" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#C8862E"/>
                <stop offset="1" stopColor="#A9854F"/>
              </linearGradient>
            </defs>
            <path d="M7 21L11 15L16 18L21 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="21" cy="10" r="2.2" fill="white"/>
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

function StepCard({ icon, badge, title, body, onNext, nextLabel = "Got it →", extra, onBack }) {
  return (
    <div
      className="w-full rounded-2xl flex flex-col gap-5 p-7 slide-in"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {icon}
        {badge && (
          <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(169,133,79,0.15)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}
          >
            {badge}
          </span>
        )}
        <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </h2>
        <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.7 }}>
          {body}
        </p>
      </div>
      {extra}
      <div className="flex gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", flex: "0 0 auto" }}
          >
            ← Back
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-sm"
          style={{ background: "linear-gradient(135deg, #C8862E, #A9854F)", color: "#fff", fontFamily: "var(--font-sans)" }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

/* ── Step progress dots (single provider: 3 steps) ── */
function StepProgress({ step }) {
  const total = 4;
  return (
    <div className="flex items-center gap-2 mb-6 w-full px-2 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 8, height: 8, borderRadius: 4,
            background: i <= step ? "var(--gold)" : "var(--rule)",
            transition: "all 0.2s",
          }}
        />
      ))}
    </div>
  );
}

/* ── Paste step ── */
function PasteStep({ step, onBack, keyValue, onKeyChange, status, saving, onSave }) {
  return (
    <OverlayShell>
      <StepProgress step={step} />
      <div
        className="w-full rounded-2xl flex flex-col gap-5 p-7"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <IconClipboard />
          <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(169,133,79,0.15)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}
          >
            Step 3 of 3 · Final step!
          </span>
          <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1.3 }}>
            Paste your Groq key
          </h2>
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            Your key starts with <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)" }}>gsk_</span>. Paste it below.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={keyValue}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^\x20-\x7E]/g, "");
              onKeyChange(clean);
            }}
            placeholder="gsk_..."
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid " + (status && !saving && status !== "Saving…" && status !== "Testing connection…" ? "var(--red)" : "var(--rule)"),
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          />
          {status && (
            <p
              className="text-xs px-1"
              style={{
                color: status.includes("Testing") || status.includes("Saving")
                  ? "var(--amber)"
                  : status.includes("failed") || status.includes("error") || status.includes("gsk_")
                  ? "var(--red)"
                  : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {status}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", flex: "0 0 auto" }}
          >
            ← Back
          </button>
          <button
            onClick={onSave}
            disabled={saving || !keyValue.trim()}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{
              background: "linear-gradient(135deg, #C8862E, #A9854F)",
              color:      "#fff",
              fontFamily: "var(--font-sans)",
              opacity:    saving || !keyValue.trim() ? 0.55 : 1,
            }}
          >
            {saving ? "Connecting…" : "Save & Connect →"}
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Stored securely in the database.
        </p>
      </div>
    </OverlayShell>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

export default function OnboardingFlow({ userName, onDone }) {
  const [show,        setShow]        = useState(false);
  const [checked,     setChecked]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [step,        setStep]        = useState(0);
  const [key,         setKey]         = useState("");
  const [status,      setStatus]      = useState("");
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => {
        const hasGroq = !!d.hasGroqKey;
        if (hasGroq) {
          setShow(false);
          onDone?.();
        } else {
          setShow(true);
          setStep(0);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) {
    return <div className="fixed inset-0 z-50" style={{ background: "var(--ink)" }} aria-hidden="true" />;
  }

  if (!show) return null;

  const name = userName || "there";

  async function handleSave() {
    const clean = key.replace(/[^\x20-\x7E]/g, "").trim();
    if (!clean) { setStatus("Paste your API key above."); return; }

    if (!clean.startsWith("gsk_")) {
      setStatus("Groq keys start with gsk_. Double-check you copied the full key correctly.");
      return;
    }

    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ai/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider: "groq", key: clean }),
      });
      if (!res.ok) { const d = await res.json(); setStatus(d.error || "Save failed."); setSaving(false); return; }

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

  /* ── Done screen ── */
  if (done) {
    return (
      <OverlayShell>
        <div
          className="w-full rounded-2xl flex flex-col items-center gap-6 p-8 text-center"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          <div style={{ fontSize: 72 }}>🎉</div>
          <div>
            <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.8rem", fontWeight: 700 }}>
              You&apos;re all set, {name}!
            </h2>
            <p className="mt-2" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", lineHeight: 1.7, maxWidth: 320, margin: "0.5rem auto 0" }}>
              Groq is connected. Coach RBC is ready and already knows your numbers. Ask her anything.
            </p>
          </div>
          <div className="flex gap-3 w-full justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(169,133,79,0.1)", border: "1px solid var(--gold)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700 }}>Groq</span>
            </div>
          </div>
          <button
            onClick={() => { setShow(false); onDone?.(); }}
            className="w-full py-3 rounded-xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, #C8862E, #A9854F)", color: "#fff", fontFamily: "var(--font-sans)" }}
          >
            Enter Trakit7 →
          </button>
        </div>
      </OverlayShell>
    );
  }

  /* Step 0: Welcome */
  if (step === 0) {
    return (
      <OverlayShell>
        <StepProgress step={0} />
        <StepCard
          icon={<IconWave />}
          badge="Quick setup — ~2 minutes"
          title={`Hey ${name}, let's power up Coach RBC 👋`}
          body="Trakit7 runs on Groq, a free AI provider, to categorize expenses, generate insights, and run Coach RBC. No payment or credit card required."
          onNext={() => setStep(1)}
          nextLabel="Start with Groq (not Grok) →"
        />
      </OverlayShell>
    );
  }

  /* Step 1: Open Groq */
  if (step === 1) {
    return (
      <OverlayShell>
        <StepProgress step={1} />
        <StepCard
          icon={<IconBrowser color="#A9854F" />}
          badge="Step 1 of 3"
          title="Open the Groq console"
          body="In a new tab, go to console.groq.com and create a free account. Sign up with email or Google. No credit card needed at any point. Note: this is Groq (G·R·O·Q), not Grok, Elon Musk's chatbot."
          extra={
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}>
              <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>console.groq.com</span>
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)", textDecoration: "none" }}>
                Open ↗
              </a>
            </div>
          }
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
          nextLabel="I've signed up →"
        />
      </OverlayShell>
    );
  }

  /* Step 2: Click API Keys */
  if (step === 2) {
    return (
      <OverlayShell>
        <StepProgress step={2} />
        <StepCard
          icon={<IconSidebar />}
          badge="Step 2 of 3"
          title={`Click "API Keys" in the sidebar`}
          body={`Once logged in, look at the left sidebar and click "API Keys". You will land on a page where you can create a new key.`}
          extra={
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(47,122,86,0.1)", border: "1px solid rgba(47,122,86,0.3)" }}>
              <p style={{ color: "#2F7A56", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                💡 Click <strong>+ Create API Key</strong>, give it any name, set expiration to <strong>No expiration</strong>, then copy the key immediately. Groq only shows it once. If you close the dialog before copying, you will need to create a new one.
              </p>
            </div>
          }
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          nextLabel="I've copied the key →"
        />
      </OverlayShell>
    );
  }

  /* Step 3: Paste Groq */
  if (step === 3) {
    return <PasteStep step={3} onBack={() => setStep(2)} keyValue={key} onKeyChange={setKey} status={status} saving={saving} onSave={handleSave} />;
  }

  return null;
}
