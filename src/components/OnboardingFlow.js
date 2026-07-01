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

function IconKey({ color = "#C8862E" }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill={`${color}18`}/>
      <circle cx="23" cy="26" r="8" stroke={color} strokeWidth="2.5"/>
      <path d="M29 31l12 12M35 37l4-4" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="23" cy="26" r="3" fill={color}/>
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

/* ── Provider card used in the choice step ── */
function ProviderCard({ name, tagline, detail, keyHint, onSelect, color = "var(--gold)" }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 flex flex-col gap-2 transition-all"
      style={{
        background:   "var(--ink-3)",
        border:       `1.5px solid var(--rule)`,
        cursor:       "pointer",
        fontFamily:   "var(--font-sans)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule)"; }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--ink-text)", fontWeight: 700, fontSize: "1rem" }}>{name}</span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}
        >
          Free
        </span>
      </div>
      <p style={{ color: "var(--ink-text-dim)", fontSize: "0.82rem", lineHeight: 1.5 }}>{tagline}</p>
      <p style={{ color, fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: 2 }}>{keyHint}</p>
      <div
        className="w-full py-2 rounded-lg text-center text-sm font-semibold mt-1"
        style={{ background: `${color}18`, color }}
      >
        Use {name} →
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

export default function OnboardingFlow({ userName }) {
  const [show,     setShow]     = useState(false);
  const [checked,  setChecked]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [provider, setProvider] = useState(null); // "groq" | "gemini"
  const [key,      setKey]      = useState("");
  const [status,   setStatus]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((d) => { if (!d.hasKey) setShow(true); })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return <div className="fixed inset-0 z-50" style={{ background: "var(--ink)" }} aria-hidden="true" />;
  }

  async function handleSave() {
    const clean = key.replace(/[^\x20-\x7E]/g, "").trim();
    if (!clean) { setStatus("Paste your API key above."); return; }

    if (provider === "groq" && !clean.startsWith("gsk_")) {
      setStatus("Groq keys start with gsk_. Double-check you copied the full key correctly.");
      return;
    }
    if (provider === "gemini" && !clean.startsWith("AIza")) {
      setStatus("Gemini keys start with AIza. Double-check you copied the full key correctly.");
      return;
    }

    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/ai/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ provider, key: clean }),
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
              Coach RBC is ready and already knows your numbers. Ask her anything. She is built for exactly this.
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

  /* ── Progress dots ── */
  // groq: step 0=welcome,1=choose,2=site,3=sidebar,4=createkey,5=paste  → total 6
  // gemini: step 0=welcome,1=choose,2=site,3=createkey,4=paste          → total 5
  const total  = provider === "groq" ? 6 : provider === "gemini" ? 5 : 2;

  /* ── Step 0: Welcome ── */
  if (step === 0) {
    return (
      <OverlayShell>
        <StepCard
          icon={<IconWave />}
          badge="Getting started"
          title={`Hey ${name}, one quick setup 👋`}
          body="Trakit7 uses a free AI service to power Coach RBC, auto-categorize your expenses, and generate spending insights. You will pick a provider and paste a key. It takes about 2 minutes and no payment is required."
          onNext={() => setStep(1)}
          nextLabel="Let's pick a provider →"
        />
      </OverlayShell>
    );
  }

  /* ── Step 1: Choose provider ── */
  if (step === 1) {
    return (
      <OverlayShell>
        <div
          className="w-full rounded-2xl flex flex-col gap-5 p-7"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          <div className="text-center flex flex-col gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full self-center"
              style={{ background: "rgba(169,133,79,0.15)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}
            >
              Step 1 of {total - 1}
            </span>
            <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700 }}>
              Choose your AI provider
            </h2>
            <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.88rem", lineHeight: 1.6 }}>
              Both are free with no credit card required. Pick whichever you prefer. You can always add the other provider later in Settings.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <ProviderCard
              name="Groq"
              tagline="Powered by Llama 3.3 70B. Blazing fast, generous free tier, no credit card required."
              keyHint="Key starts with gsk_..."
              color="var(--gold)"
              onSelect={() => { setProvider("groq"); setStep(2); }}
            />
            <ProviderCard
              name="Gemini"
              tagline="Google AI Studio. Powered by Gemini 2.5 Flash. Free tier with no card required."
              keyHint="Key starts with AIza..."
              color="var(--blue-accent)"
              onSelect={() => { setProvider("gemini"); setStep(2); }}
            />
          </div>

          <button
            onClick={() => setStep(0)}
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
          >
            ← Back
          </button>
        </div>
      </OverlayShell>
    );
  }

  /* ── GROQ steps ── */
  if (provider === "groq") {
    if (step === 2) {
      return (
        <OverlayShell>
          <StepCard
            icon={<IconBrowser color="#A9854F" />}
            badge={`Step 2 of ${total - 1}`}
            title="Open the Groq console"
            body="In a new tab, go to console.groq.com and create a free account. Sign up with email or Google. No credit card needed at any point."
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
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextLabel="I've signed up →"
          />
        </OverlayShell>
      );
    }

    if (step === 3) {
      return (
        <OverlayShell>
          <StepCard
            icon={<IconSidebar />}
            badge={`Step 3 of ${total - 1}`}
            title={`Click "API Keys" in the sidebar`}
            body={`Once logged in, look at the left sidebar and click "API Keys". You will land on a page listing all your keys where you can create a new one.`}
            extra={
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(47,122,86,0.1)", border: "1px solid rgba(47,122,86,0.3)" }}
              >
                <p style={{ color: "#2F7A56", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  💡 The sidebar is on the left. Look for Home, Playground, API Keys icons.
                </p>
              </div>
            }
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="I see it →"
          />
        </OverlayShell>
      );
    }

    if (step === 4) {
      return (
        <OverlayShell>
          <StepCard
            icon={<IconKey color="#A9854F" />}
            badge={`Step 4 of ${total - 1}`}
            title="Create a new API key"
            body='Click "+ Create API Key", give it any name (like "Trakit7"), and copy the key immediately. Groq only shows it once.'
            extra={
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(184,57,43,0.1)", border: "1px solid rgba(184,57,43,0.3)" }}
              >
                <p style={{ color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  ⚠️ Copy it now. If you close the dialog before copying, Groq does not show it again and you will need to create a new key.
                </p>
              </div>
            }
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextLabel="I've copied the key →"
          />
        </OverlayShell>
      );
    }

    if (step === 5) {
      return <PasteStep name={name} provider="groq" keyPrefix="gsk_" total={total} onBack={() => setStep(4)} keyValue={key} onKeyChange={setKey} status={status} saving={saving} onSave={handleSave} />;
    }
  }

  /* ── GEMINI steps ── */
  if (provider === "gemini") {
    if (step === 2) {
      return (
        <OverlayShell>
          <StepCard
            icon={<IconBrowser color="#5B8FA8" />}
            badge={`Step 2 of ${total - 1}`}
            title="Open Google AI Studio"
            body="In a new tab, go to the API Keys page in Google AI Studio. Sign in with your Google account. No billing or credit card required at any point."
            extra={
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "var(--ink-3)", border: "1px solid var(--rule)" }}
              >
                <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                  aistudio.google.com/apikey
                </span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: "var(--blue-accent)", color: "#fff", fontFamily: "var(--font-sans)", textDecoration: "none" }}
                >
                  Open ↗
                </a>
              </div>
            }
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextLabel="I'm on the page →"
          />
        </OverlayShell>
      );
    }

    if (step === 3) {
      return (
        <OverlayShell>
          <StepCard
            icon={<IconKey color="#5B8FA8" />}
            badge={`Step 3 of ${total - 1}`}
            title="Create & copy your key"
            body='Click "Create API key". Choose an existing project or create a new one. The key appears immediately. Copy it now before closing the dialog. It starts with AIza.'
            extra={
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(91,143,168,0.1)", border: "1px solid rgba(91,143,168,0.3)" }}
              >
                <p style={{ color: "var(--blue-accent)", fontFamily: "var(--font-sans)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                  💡 Your key starts with <span style={{ fontFamily: "var(--font-mono)" }}>AIza</span>. Keep it secret and treat it exactly like a password. Never share it or paste it into untrusted sites.
                </p>
              </div>
            }
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="I've copied the key →"
          />
        </OverlayShell>
      );
    }

    if (step === 4) {
      return <PasteStep name={name} provider="gemini" keyPrefix="AIza" total={total} onBack={() => setStep(3)} keyValue={key} onKeyChange={setKey} status={status} saving={saving} onSave={handleSave} />;
    }
  }

  return null;
}

/* ── Paste step (shared between Groq and Gemini) ── */
function PasteStep({ name, provider, keyPrefix, total, onBack, keyValue, onKeyChange, status, saving, onSave }) {
  const isGroq = provider === "groq";
  return (
    <OverlayShell>
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
            Step {total - 1} of {total - 1} · Final step!
          </span>
          <h2 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1.3 }}>
            Paste your {isGroq ? "Groq" : "Gemini"} key
          </h2>
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            Your key starts with{" "}
            <span style={{ fontFamily: "var(--font-mono)", color: isGroq ? "var(--gold)" : "var(--blue-accent)" }}>
              {keyPrefix}
            </span>. Paste it below. It is saved encrypted in the database and is never sent back to your browser in plain text.
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
            placeholder={`${keyPrefix}...`}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background:  "var(--ink-3)",
              border:      "1px solid " + (status && !saving ? "var(--red)" : "var(--rule)"),
              color:       "var(--ink-text)",
              fontFamily:  "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          />
          {status && (
            <p
              className="text-xs px-1"
              style={{
                color:      status.includes("Testing") || status.includes("Saving") ? "var(--amber)" : "var(--red)",
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
          Stored securely in the database. You can switch providers anytime in Settings.
        </p>
      </div>
    </OverlayShell>
  );
}
