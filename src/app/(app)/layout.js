"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsDrawer from "@/components/SettingsDrawer";

const TABS = [
  { label: "Summary",         href: "/summary" },
  { label: "Goals",           href: "/goals" },
  { label: "Cash & Investments", href: "/cash" },
  { label: "Expense Entry",   href: "/entries" },
  { label: "Ask Coach RBC",   href: "/chat" },
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
      {/* Topbar */}
      <header
        className="flex items-center gap-4 px-4 py-3 border-b shrink-0"
        style={{ borderColor: "var(--rule)", background: "var(--ink-2)" }}
      >
        {/* Brand */}
        <div className="flex flex-col leading-none select-none mr-2 shrink-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
          >
            Ledger
          </span>
          <span
            className="text-lg font-semibold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
          >
            Daily Expense Tracker
          </span>
        </div>

        {/* Tabs — horizontally scrollable */}
        <nav className="flex-1 overflow-x-auto hide-scrollbar">
          <div className="flex gap-1 min-w-max">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors border-b-2"
                  style={{
                    background:      active ? "var(--ink-3)" : "transparent",
                    color:           active ? "var(--ink-text)" : "var(--ink-text-dim)",
                    borderColor:     active ? "var(--gold)" : "transparent",
                    fontFamily:      "var(--font-sans)",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Settings gear */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded transition-colors"
          style={{ color: "var(--ink-text-dim)" }}
          aria-label="Open settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Settings drawer */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
