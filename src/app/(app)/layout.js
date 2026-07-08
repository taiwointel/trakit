"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsDrawer from "@/components/SettingsDrawer";
import SearchModal from "@/components/SearchModal";
import AppTour     from "@/components/AppTour";
import { useUser } from "@/hooks/useUser";
import { useEntries } from "@/hooks/useEntries";

const TABS = [
  {
    label: "Financial Dashboard",
    shortLabel: "Dashboard",
    href: "/summary",
    color: "var(--sky)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
      </svg>
    ),
  },
  {
    label: "Expense Entry",
    shortLabel: "Entry",
    href: "/entries",
    color: "var(--gold)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    label: "Goals",
    shortLabel: "Goals",
    href: "/goals",
    color: "var(--violet)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    label: "Cash & Investments",
    shortLabel: "Cash",
    href: "/cash",
    color: "var(--teal)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    label: "Ask Coach RBC",
    shortLabel: "Coach",
    href: "/chat",
    color: "var(--rose)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

/* ── Trakit7 SVG logo mark ── */
function Trakit7Logo() {
  return (
    <div className="flex items-center gap-2.5 select-none shrink-0">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <defs>
          <linearGradient id="tl-grad" x1="0" y1="0" x2="30" y2="30">
            <stop stopColor="#C8862E"/>
            <stop offset="1" stopColor="#A9854F"/>
          </linearGradient>
        </defs>
        <rect width="30" height="30" rx="8" fill="url(#tl-grad)"/>
        {/* Track: upward path */}
        <path d="M8 22 L12 16 L17 19 L22 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dot at peak */}
        <circle cx="22" cy="10" r="2.5" fill="white"/>
        {/* Base line */}
        <path d="M7 24 H23" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className="text-base font-bold leading-tight"
          style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", letterSpacing: -0.5 }}
        >
          Trakit7
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-widest leading-tight hidden sm:block"
          style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
        >
          Expense Tracker
        </span>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [tourOpen,     setTourOpen]     = useState(false);
  const [theme, setTheme] = useState("dark");
  const { user, name } = useUser();
  const { entries } = useEntries();

  useEffect(() => {
    const saved = localStorage.getItem("trakit7-theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // New signups get the app tour automatically, once, shortly after landing.
  // Detected off Supabase's own created_at timestamp (account is a few
  // minutes old at most) rather than a flag set client-side right before
  // the OAuth redirect — that flag was a race: it never survived a cached
  // page, an already-open session, or any path that didn't pass through
  // that exact button click.
  useEffect(() => {
    if (!user?.created_at) return;
    const seen        = localStorage.getItem("trakit7:tourSeen");
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    if (!seen && accountAgeMs < 5 * 60 * 1000) {
      setTimeout(() => setTourOpen(true), 600);
    }
  }, [user]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("trakit7-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") { setSettingsOpen(false); setSearchOpen(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeTab = TABS.find((t) => t.href === pathname);

  return (
    <div className="flex flex-col h-full min-h-screen" style={{ background: "var(--ink)" }}>

      {/* ── Topbar + mobile nav (sticky together) ─────────── */}
      <header
        className="app-topbar shrink-0 sticky top-0 z-30"
        style={{
          borderColor: "var(--rule)",
          background: "linear-gradient(to bottom, var(--ink-2) 0%, rgba(29,35,44,0.97) 100%)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        {/* Main topbar row */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Brand */}
          <Trakit7Logo />

          {/* Desktop tabs */}
          <nav className="hidden md:flex flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex gap-0.5 min-w-max mx-auto">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    data-tour={`tab-${tab.href.slice(1)}`}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border-b-2"
                    style={{
                      background:  active ? "var(--ink-3)" : "transparent",
                      color:       active ? tab.color : "var(--ink-text-dim)",
                      borderColor: active ? tab.color : "transparent",
                      fontFamily:  "var(--font-sans)",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile: current tab name centered */}
          <div className="flex md:hidden flex-1 justify-center">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
            >
              {activeTab?.label ?? "Trakit7"}
            </span>
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            aria-label="Search transactions"
            title="Search transactions (Ctrl+K)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Settings gear */}
          <button
            onClick={() => setSettingsOpen(true)}
            data-tour="settings-btn"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            aria-label="Open settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* ── Mobile horizontal tab nav (second row, top of page) ── */}
        <nav
          className="app-mobile-nav md:hidden flex overflow-x-auto hide-scrollbar border-t"
          style={{
            borderColor: "var(--rule)",
            background: "rgba(20,27,36,0.6)",
          }}
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-tour={`tab-${tab.href.slice(1)}`}
                className="flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
                style={{
                  flex:          "1 1 0",
                  minWidth:      56,
                  color:         active ? tab.color : "var(--ink-text-dim)",
                  fontFamily:    "var(--font-sans)",
                  minHeight:     48,
                  borderBottom:  active ? `2px solid ${tab.color}` : "2px solid transparent",
                }}
              >
                <span style={{ opacity: active ? 1 : 0.55 }}>{tab.icon}</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ color: active ? tab.color : "var(--ink-text-dim)" }}
                >
                  {tab.shortLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-4 flex flex-col">
        {children}
      </main>

      {/* Settings drawer */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onStartTour={() => { setSettingsOpen(false); setTourOpen(true); }}
      />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} entries={entries} />
      <AppTour
        name={name}
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          localStorage.setItem("trakit7:tourSeen", "1");
        }}
      />
    </div>
  );
}
