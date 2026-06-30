"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsDrawer from "@/components/SettingsDrawer";

const TABS = [
  {
    label: "Summary",
    shortLabel: "Summary",
    href: "/summary",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
      </svg>
    ),
  },
  {
    label: "Goals",
    shortLabel: "Goals",
    href: "/goals",
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
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    label: "Expense Entry",
    shortLabel: "Entry",
    href: "/entries",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  {
    label: "Ask Coach RBC",
    shortLabel: "Coach",
    href: "/chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-screen" style={{ background: "var(--ink)" }}>
      {/* ── Topbar ─────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--rule)", background: "var(--ink-2)" }}
      >
        {/* Brand */}
        <div className="flex flex-col leading-none select-none shrink-0">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
          >
            Ledger
          </span>
          <span
            className="text-base font-semibold leading-tight"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
          >
            Daily Expense Tracker
          </span>
        </div>

        {/* Desktop tabs — hidden on mobile */}
        <nav className="hidden md:flex flex-1 overflow-x-auto hide-scrollbar">
          <div className="flex gap-1 min-w-max mx-auto">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors border-b-2"
                  style={{
                    background:  active ? "var(--ink-3)" : "transparent",
                    color:       active ? "var(--ink-text)" : "var(--ink-text-dim)",
                    borderColor: active ? "var(--gold)" : "transparent",
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
            {TABS.find((t) => t.href === pathname)?.label ?? "Ledger"}
          </span>
        </div>

        {/* Settings gear */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)" }}
          aria-label="Open settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom navigation ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t"
        style={{ background: "var(--ink-2)", borderColor: "var(--rule)" }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
              style={{
                color:      active ? "var(--gold)" : "var(--ink-text-dim)",
                fontFamily: "var(--font-sans)",
                minHeight:  52,
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{tab.icon}</span>
              <span
                className="text-[9px] font-semibold uppercase tracking-wide"
                style={{ color: active ? "var(--gold)" : "var(--ink-text-dim)" }}
              >
                {tab.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
