"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─────────────────────────────────────────────────────────────────────────
   SVG Illustrations
   Each returns an <svg> designed to look like a polished 3D render:
   radial gradients for specularity, layered shapes for depth,
   subtle ground-shadow ellipses, floating elements via CSS animations.
───────────────────────────────────────────────────────────────────────── */

function IllustrationTrack() {
  return (
    <svg viewBox="0 0 340 290" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", maxHeight: 270, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))" }}>
      <defs>
        <linearGradient id="tr-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
        <linearGradient id="tr-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,240,155,0.55)" />
          <stop offset="100%" stopColor="rgba(0,180,100,0.25)" />
        </linearGradient>
        <radialGradient id="tr-coin" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFEE70" />
          <stop offset="55%" stopColor="#E8A020" />
          <stop offset="100%" stopColor="#8C4F0E" />
        </radialGradient>
        <filter id="tr-soft">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="rgba(0,0,0,0.4)" />
        </filter>
        <filter id="tr-glow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ground glow */}
      <ellipse cx="170" cy="278" rx="115" ry="16" fill="rgba(0,220,140,0.2)" />

      {/* card body */}
      <g style={{ animation: "floatA 3.6s ease-in-out infinite" }} filter="url(#tr-soft)">
        <rect x="58" y="52" width="224" height="178" rx="22" fill="url(#tr-card)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* header band */}
        <rect x="58" y="52" width="224" height="60" rx="22" fill="url(#tr-head)" />
        <rect x="58" y="94" width="224" height="18" fill="url(#tr-head)" />
        {/* left highlight edge */}
        <rect x="58" y="52" width="5" height="178" rx="3" fill="rgba(255,255,255,0.12)" />
        {/* header text */}
        <text x="80" y="76" fill="rgba(255,255,255,0.95)" fontSize="12" fontWeight="700" fontFamily="sans-serif">My Expenses</text>
        <text x="80" y="92" fill="rgba(255,255,255,0.5)" fontSize="9.5" fontFamily="sans-serif">June 2026</text>
        <text x="265" y="76" fill="#00F09B" fontSize="13" fontWeight="800" fontFamily="monospace" textAnchor="end">₦342k</text>

        {/* rows */}
        {[
          { icon: "🍔", label: "Dining",    amt: "−₦4,500",  color: "#FF6B6B", dy: 0 },
          { icon: "⛽", label: "Fuel",      amt: "−₦15,000", color: "#FF8C42", dy: 28 },
          { icon: "🏠", label: "Rent",      amt: "−₦80,000", color: "#FFB347", dy: 56 },
          { icon: "💰", label: "Salary",    amt: "+₦350,000", color: "#7FFF7F", dy: 84 },
          { icon: "📈", label: "T-Bills",   amt: "+₦12,500", color: "#7FD4FF", dy: 112 },
        ].map((r) => (
          <g key={r.dy} transform={`translate(0,${r.dy})`}>
            <circle cx="82" cy="128" r="11" fill="rgba(255,255,255,0.1)" />
            <text x="82" y="132" fontSize="11" textAnchor="middle">{r.icon}</text>
            <text x="100" y="132" fill="rgba(255,255,255,0.78)" fontSize="10.5" fontFamily="sans-serif">{r.label}</text>
            <text x="268" y="132" fill={r.color} fontSize="10.5" fontFamily="monospace" fontWeight="700" textAnchor="end">{r.amt}</text>
          </g>
        ))}
      </g>

      {/* large coin top-left */}
      <g style={{ animation: "floatB 2.9s ease-in-out infinite" }} filter="url(#tr-glow)">
        <circle cx="44" cy="48" r="30" fill="url(#tr-coin)" />
        <circle cx="38" cy="40" r="10" fill="rgba(255,255,255,0.18)" />
        <text x="44" y="56" fontSize="22" fontWeight="800" fill="white" textAnchor="middle" fontFamily="serif">₦</text>
      </g>

      {/* small coin top-right */}
      <g style={{ animation: "floatC 3.4s ease-in-out infinite" }}>
        <circle cx="306" cy="70" r="20" fill="url(#tr-coin)" filter="url(#tr-soft)" opacity="0.92" />
        <circle cx="300" cy="63" r="6" fill="rgba(255,255,255,0.2)" />
        <text x="306" y="76" fontSize="14" fontWeight="800" fill="white" textAnchor="middle" fontFamily="serif">₦</text>
      </g>

      {/* tiny coin bottom-right */}
      <g style={{ animation: "floatA 4s ease-in-out infinite" }}>
        <circle cx="315" cy="220" r="13" fill="url(#tr-coin)" filter="url(#tr-soft)" opacity="0.7" />
      </g>

      {/* sparkles */}
      {[[28, 155, 3.5], [32, 225, 2.5], [318, 155, 3], [162, 32, 3.5], [310, 270, 2]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#FFD700" style={{ animation: `pulseGlow ${1.4 + i * 0.35}s ease-in-out infinite` }} />
      ))}
    </svg>
  );
}

function IllustrationCoach() {
  return (
    <svg viewBox="0 0 340 290" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", maxHeight: 270, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))" }}>
      <defs>
        <radialGradient id="co-avatar" cx="36%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#E8A050" />
          <stop offset="45%" stopColor="#B07830" />
          <stop offset="100%" stopColor="#6A3A10" />
        </radialGradient>
        <radialGradient id="co-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(176,127,255,0.55)" />
          <stop offset="100%" stopColor="rgba(176,127,255,0)" />
        </radialGradient>
        <linearGradient id="co-b1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(210,150,60,0.45)" />
          <stop offset="100%" stopColor="rgba(150,90,20,0.22)" />
        </linearGradient>
        <linearGradient id="co-b2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(176,127,255,0.38)" />
          <stop offset="100%" stopColor="rgba(90,45,200,0.18)" />
        </linearGradient>
        <filter id="co-soft">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0,0,0,0.5)" />
        </filter>
        <filter id="co-glow">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ambient halo */}
      <circle cx="170" cy="108" r="88" fill="url(#co-halo)" />
      <ellipse cx="170" cy="278" rx="100" ry="15" fill="rgba(176,127,255,0.18)" />

      {/* RBC avatar */}
      <g style={{ animation: "floatA 3.2s ease-in-out infinite" }} filter="url(#co-glow)">
        <circle cx="170" cy="108" r="56" fill="rgba(176,127,255,0.22)" />
        <circle cx="170" cy="108" r="47" fill="url(#co-avatar)" filter="url(#co-soft)" />
        {/* specular highlight */}
        <ellipse cx="152" cy="90" rx="16" ry="10" fill="rgba(255,255,255,0.18)" transform="rotate(-20,152,90)" />
        <text x="170" y="120" fill="white" fontSize="20" fontWeight="800" textAnchor="middle" fontFamily="Georgia,serif" letterSpacing="1">RBC</text>
      </g>

      {/* RBC reply bubble */}
      <g style={{ animation: "floatB 3.8s ease-in-out infinite" }}>
        <rect x="24" y="186" width="178" height="52" rx="16" fill="url(#co-b1)" stroke="rgba(210,150,60,0.45)" strokeWidth="1.2" />
        <polygon points="24,202 10,212 30,202" fill="url(#co-b1)" />
        <text x="42" y="207" fill="rgba(255,255,255,0.92)" fontSize="9.5" fontFamily="sans-serif">Cut dining 20% → save</text>
        <text x="42" y="222" fill="#FFD055" fontSize="10.5" fontWeight="700" fontFamily="monospace">₦18,000/month 💡</text>
        <text x="42" y="233" fill="rgba(255,255,255,0.5)" fontSize="8.5" fontFamily="sans-serif">based on your last 90 days</text>
      </g>

      {/* user bubble */}
      <g style={{ animation: "floatC 4.2s ease-in-out infinite" }}>
        <rect x="138" y="250" width="168" height="34" rx="16" fill="url(#co-b2)" stroke="rgba(176,127,255,0.45)" strokeWidth="1.2" />
        <polygon points="306,260 323,255 306,272" fill="url(#co-b2)" />
        <text x="155" y="272" fill="rgba(255,255,255,0.85)" fontSize="9.5" fontFamily="sans-serif">How's my 50/30/20? 🤔</text>
      </g>

      {/* 4-point stars */}
      {[
        [42, 88, 9], [305, 78, 7], [48, 170, 6], [308, 168, 8],
        [95, 48, 5], [245, 46, 6], [320, 230, 5],
      ].map(([x, y, s], i) => (
        <path key={i}
          d={`M${x},${y - s} L${x + s * 0.28},${y - s * 0.28} L${x + s},${y} L${x + s * 0.28},${y + s * 0.28} L${x},${y + s} L${x - s * 0.28},${y + s * 0.28} L${x - s},${y} L${x - s * 0.28},${y - s * 0.28} Z`}
          fill="#C07FFF"
          style={{ animation: `pulseGlow ${1.6 + i * 0.32}s ease-in-out infinite`, opacity: 0.7 }}
        />
      ))}
    </svg>
  );
}

function IllustrationGrow() {
  const bars = [
    { x: 46,  h: 52,  c1: "#FF5520", c2: "#CC2200", pct: "10%" },
    { x: 104, h: 88,  c1: "#FF7030", c2: "#CC4000", pct: "17%" },
    { x: 162, h: 72,  c1: "#FF9040", c2: "#CC6015", pct: "14%" },
    { x: 220, h: 118, c1: "#FFB030", c2: "#CC8000", pct: "23%" },
    { x: 278, h: 158, c1: "#FFD700", c2: "#C8A000", pct: "36%" },
  ];
  return (
    <svg viewBox="0 0 340 290" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", maxHeight: 270, filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))" }}>
      <defs>
        <radialGradient id="gr-coin" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#FFEE70" />
          <stop offset="55%" stopColor="#F7B731" />
          <stop offset="100%" stopColor="#9A6A00" />
        </radialGradient>
        <filter id="gr-soft">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(0,0,0,0.45)" />
        </filter>
      </defs>

      {/* grid lines */}
      {[0, 55, 110, 165].map((offset, i) => (
        <line key={i} x1="36" y1={236 - offset} x2="330" y2={236 - offset}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray={i > 0 ? "4 4" : "none"} />
      ))}

      {/* ground */}
      <line x1="36" y1="236" x2="330" y2="236" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <ellipse cx="183" cy="268" rx="135" ry="18" fill="rgba(255,140,40,0.18)" />

      {/* bars */}
      {bars.map((b, i) => (
        <g key={i} style={{ animation: `floatB ${2.6 + i * 0.28}s ease-in-out infinite` }} filter="url(#gr-soft)">
          {/* body */}
          <rect x={b.x} y={236 - b.h} width="42" height={b.h} rx="7" fill={b.c1} />
          {/* shine strip */}
          <rect x={b.x} y={236 - b.h} width="9" height={b.h} rx="5" fill="rgba(255,255,255,0.22)" />
          {/* 3-D top cap */}
          <polygon
            points={`${b.x},${236 - b.h} ${b.x + 42},${236 - b.h} ${b.x + 48},${231 - b.h} ${b.x + 6},${231 - b.h}`}
            fill={b.c2} opacity="0.95"
          />
          {/* right face */}
          <polygon
            points={`${b.x + 42},${236 - b.h} ${b.x + 48},${231 - b.h} ${b.x + 48},${231} ${b.x + 42},${236}`}
            fill="rgba(0,0,0,0.25)"
          />
          {/* pct label */}
          <text x={b.x + 21} y={222 - b.h} fill="rgba(255,255,255,0.88)" fontSize="9.5"
            textAnchor="middle" fontFamily="monospace" fontWeight="700">{b.pct}</text>
        </g>
      ))}

      {/* trend line */}
      <polyline points="67,184 125,148 183,164 241,114 299,74"
        stroke="#FFD700" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
        filter="url(#gr-soft)" />
      {/* arrow head */}
      <polygon points="299,74 286,80 294,64" fill="#FFD700" />

      {/* floating coins */}
      {[[296, 48, 22], [330, 110, 15], [268, 32, 11]].map(([x, y, r], i) => (
        <g key={i} style={{ animation: `floatA ${3.2 + i * 0.5}s ease-in-out infinite` }}>
          <circle cx={x} cy={y} r={r} fill="url(#gr-coin)" filter="url(#gr-soft)" />
          {r >= 15 && (
            <>
              <circle cx={x - r * 0.28} cy={y - r * 0.28} r={r * 0.28} fill="rgba(255,255,255,0.2)" />
              <text x={x} y={y + r * 0.35} fontSize={r * 0.72} fontWeight="800" fill="white"
                textAnchor="middle" fontFamily="serif">₦</text>
            </>
          )}
        </g>
      ))}

      {/* sparkle dots */}
      {[[26, 100, 3], [36, 195, 2.5], [325, 240, 2.5], [26, 50, 2.5]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#FFD700"
          style={{ animation: `pulseGlow ${1.5 + i * 0.38}s ease-in-out infinite` }} />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Slides
───────────────────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    title: "Every Naira, accounted for",
    subtitle: "Log spending in seconds. Trakit auto-categorises every transaction and shows exactly where your money goes.",
    bg: "radial-gradient(ellipse at 60% 30%, #1A6B4A 0%, #0D4030 40%, #071A10 100%)",
    accent: "#00E896",
    textOnAccent: "#071A10",
    Illustration: IllustrationTrack,
  },
  {
    title: "Meet Coach RBC",
    subtitle: "Your personal AI money coach. She reads your numbers, spots patterns, and tells you exactly what to cut and where to grow.",
    bg: "radial-gradient(ellipse at 50% 30%, #5E2BB5 0%, #2D1065 40%, #0E0520 100%)",
    accent: "#C07FFF",
    textOnAccent: "#0E0520",
    Illustration: IllustrationCoach,
  },
  {
    title: "Build wealth that lasts",
    subtitle: "Track T-bills, fixed deposits, equities, pension and more. Know your portfolio total and liquidity in one place.",
    bg: "radial-gradient(ellipse at 50% 30%, #CC4000 0%, #7A2200 40%, #1A0800 100%)",
    accent: "#FF8C42",
    textOnAccent: "#1A0800",
    Illustration: IllustrationGrow,
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Auth form — Google-only
───────────────────────────────────────────────────────────────────────── */

function AuthForm({ onBack }) {
  const supabase = createClient();
  const [errMsg,   setErrMsg]   = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleGoogle() {
    setErrMsg("");
    setLoading(true);
    // Mark this device as a fresh sign-in so the app tour fires after onboarding.
    // The layout only acts on this if trakit7:tourSeen is not already set,
    // so returning users who've already seen the tour are unaffected.
    localStorage.setItem("trakit7:newSignup", "1");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      const raw = error?.message || JSON.stringify(error);
      setErrMsg(raw && raw !== "{}" ? raw : "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      width: "100%", height: "100dvh", background: "var(--ink)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px", position: "relative",
    }}>
      <button onClick={onBack} style={{
        position: "absolute", top: 20, left: 20,
        color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)",
        fontSize: 13, background: "none", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      }}>← Back</button>

      <div style={{
        width: "100%", maxWidth: 400,
        background: "var(--ink-2)", border: "1px solid var(--rule)",
        borderRadius: 24, padding: "44px 36px",
        display: "flex", flexDirection: "column", gap: 28,
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        alignItems: "center", textAlign: "center",
      }} className="slide-in">

        {/* Brand mark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <svg width="48" height="48" viewBox="0 0 30 30" fill="none">
            <defs>
              <linearGradient id="af-grad" x1="0" y1="0" x2="30" y2="30">
                <stop stopColor="#C8862E"/>
                <stop offset="1" stopColor="#A9854F"/>
              </linearGradient>
            </defs>
            <rect width="30" height="30" rx="8" fill="url(#af-grad)"/>
            <path d="M8 22 L12 16 L17 19 L22 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="22" cy="10" r="2.5" fill="white"/>
            <path d="M7 24 H23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 700, color: "var(--ink-text)", letterSpacing: -0.5, lineHeight: 1 }}>
              Trakit7
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-text-dim)", marginTop: 6, lineHeight: 1.5 }}>
              Sign in to your personal finance tracker
            </div>
          </div>
        </div>

        {/* Google button */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            10,
              width:          "100%",
              padding:        "14px 18px",
              borderRadius:   14,
              fontSize:       15,
              fontWeight:     600,
              fontFamily:     "var(--font-sans)",
              border:         "1px solid var(--rule)",
              background:     "var(--ink-3)",
              color:          "var(--ink-text)",
              cursor:         loading ? "not-allowed" : "pointer",
              opacity:        loading ? 0.7 : 1,
              transition:     "background 0.15s, opacity 0.2s",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--ink-3)"; }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.4z" fill="#4285F4"/>
              <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.6v6.2C6.6 42.8 14.7 48 24 48z" fill="#34A853"/>
              <path d="M10.8 28.8c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3v-6.2H2.6C.9 17.4 0 20.6 0 24s.9 6.6 2.6 9.5l8.2-4.7z" fill="#FBBC05"/>
              <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.4 30.4 0 24 0 14.7 0 6.6 5.2 2.6 14.5l8.2 4.7C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
            </svg>
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          {errMsg && (
            <p style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 12.5,
              margin: 0, fontFamily: "var(--font-sans)", lineHeight: 1.55,
              color: "var(--red)", background: "var(--red-soft)", textAlign: "left",
            }}>
              {errMsg}
            </p>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", margin: 0, lineHeight: 1.6 }}>
          Your data is private and only visible to you.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Landing Page
───────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [current,    setCurrent]    = useState(0);
  const [showAuth,   setShowAuth]   = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [slideKey,   setSlideKey]   = useState(0);
  const touchX = useRef(null);

  const goTo = useCallback((n) => {
    setCurrent(n);
    setSlideKey(k => k + 1);
    setInteracted(true);
  }, []);

  const next = useCallback(() => {
    if (current < SLIDES.length - 1) { goTo(current + 1); }
    else { setShowAuth(true); }
  }, [current, goTo]);

  const prev = useCallback(() => { if (current > 0) goTo(current - 1); }, [current, goTo]);

  // auto-advance
  useEffect(() => {
    if (interacted || showAuth) return;
    const t = setTimeout(() => {
      if (current < SLIDES.length - 1) { setCurrent(c => c + 1); setSlideKey(k => k + 1); }
    }, 5000);
    return () => clearTimeout(t);
  }, [current, interacted, showAuth]);

  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 48) { dx < 0 ? next() : prev(); }
    touchX.current = null;
  }

  if (showAuth) return <AuthForm onBack={() => { setShowAuth(false); goTo(SLIDES.length - 1); }} />;

  const slide = SLIDES[current];
  const { Illustration } = slide;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: "100vw", height: "100dvh",
        background: slide.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        padding: "clamp(16px,4vw,28px) clamp(20px,5vw,40px) clamp(24px,5vw,36px)",
        transition: "background 0.6s cubic-bezier(0.4,0,0.2,1)",
        position: "relative", overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* subtle radial overlay for depth */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 65%)",
      }} />

      {/* ── Top bar ── */}
      <div style={{ width: "100%", maxWidth: 640, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="10" fill={slide.accent} />
            <path d="M8 16h16M16 8v16" stroke={slide.textOnAccent} strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", color: "white", fontSize: "clamp(16px,4vw,20px)", fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>
              Trakit7
            </div>
            <div style={{ fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.55)", fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Daily Expense Tracker
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          style={{
            background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)",
            color: "white", borderRadius: 22, padding: "8px 20px",
            fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 600,
            cursor: "pointer", backdropFilter: "blur(10px)", letterSpacing: "0.02em",
          }}
        >
          Sign in
        </button>
      </div>

      {/* ── Illustration ── */}
      <div key={`ill-${slideKey}`} className="slide-in" style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        width: "100%", maxWidth: 480, paddingTop: 8, paddingBottom: 8, zIndex: 1,
      }}>
        <Illustration />
      </div>

      {/* ── Text ── */}
      <div key={`txt-${slideKey}`} className="slide-in" style={{
        width: "100%", maxWidth: 540, textAlign: "center",
        display: "flex", flexDirection: "column", gap: 10, zIndex: 1,
        animationDelay: "60ms",
      }}>
        <h1 style={{
          fontFamily: "var(--font-serif)", color: "white", margin: 0,
          fontSize: "clamp(22px,5.5vw,34px)", fontWeight: 700, lineHeight: 1.22,
          textShadow: "0 2px 24px rgba(0,0,0,0.4)",
        }}>
          {slide.title}
        </h1>
        <p style={{
          fontFamily: "var(--font-sans)", color: "rgba(255,255,255,0.72)",
          fontSize: "clamp(13.5px,3vw,16.5px)", margin: 0, lineHeight: 1.6,
        }}>
          {slide.subtitle}
        </p>
      </div>

      {/* ── Navigation ── */}
      <div style={{ width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginTop: 18, zIndex: 1 }}>
        {/* dots */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: current === i ? 28 : 8, height: 8, borderRadius: 4,
              border: "none", cursor: "pointer", padding: 0,
              background: current === i ? slide.accent : "rgba(255,255,255,0.28)",
              transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            }} />
          ))}
        </div>

        {/* CTA */}
        <button onClick={next} style={{
          width: "100%", maxWidth: 380, padding: "15px 24px",
          borderRadius: 16, fontSize: "clamp(14px,3.5vw,16px)",
          fontWeight: 800, border: "none", cursor: "pointer",
          background: slide.accent, color: slide.textOnAccent,
          fontFamily: "var(--font-sans)", letterSpacing: "0.01em",
          boxShadow: `0 6px 28px ${slide.accent}60`,
          transition: "background 0.6s, box-shadow 0.6s, transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {current === SLIDES.length - 1 ? "Get started →" : "Next →"}
        </button>

        {/* sign in link */}
        <button onClick={() => setShowAuth(true)} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.48)",
          fontSize: 12.5, fontFamily: "var(--font-sans)", cursor: "pointer",
          paddingBottom: 4,
        }}>
          Already have an account? Sign in
        </button>
      </div>

      {/* ── Desktop arrow buttons ── */}
      {current > 0 && (
        <button onClick={prev} style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: "50%", width: 44, height: 44, color: "white",
          fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", backdropFilter: "blur(8px)", zIndex: 2,
        }}>‹</button>
      )}
      {current < SLIDES.length - 1 && (
        <button onClick={next} style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: "50%", width: 44, height: 44, color: "white",
          fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", backdropFilter: "blur(8px)", zIndex: 2,
        }}>›</button>
      )}
    </div>
  );
}
