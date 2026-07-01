"use client";

import { useState, useMemo } from "react";
import { useEntries }  from "@/hooks/useEntries";
import MonthNav        from "@/components/entries/MonthNav";
import StatsStrip      from "@/components/entries/StatsStrip";
import DayStrip        from "@/components/entries/DayStrip";
import EntryForm       from "@/components/entries/EntryForm";
import LedgerTable     from "@/components/entries/LedgerTable";
import BudgetsGrid     from "@/components/entries/BudgetsGrid";
import { formatNaira } from "@/lib/format";

export default function EntriesPage() {
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay,   setSelectedDay]   = useState(null);
  const [ledgerOpen,    setLedgerOpen]    = useState(true);
  const [budgetsOpen,   setBudgetsOpen]   = useState(false);

  const { entries, budgets, loading, addEntry, updateEntry, deleteEntry, saveBudget } = useEntries();

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const monthEntries = useMemo(() =>
    entries.filter((e) => e.date?.startsWith(monthStr))
           .sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at || "") || 0),
    [entries, monthStr],
  );

  const displayEntries = useMemo(() => {
    if (!selectedDay) return monthEntries;
    const dayStr = `${monthStr}-${String(selectedDay).padStart(2, "0")}`;
    return monthEntries.filter((e) => e.date === dayStr);
  }, [monthEntries, selectedDay, monthStr]);

  // Daily summary for selected day
  const dayStr = selectedDay
    ? `${monthStr}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const dayEntries = dayStr ? entries.filter((e) => e.date === dayStr) : [];
  const dayOut     = dayEntries.filter((e) => e.flow === "out").reduce((s, e) => s + Number(e.amount), 0);
  const dayIn      = dayEntries.filter((e) => e.flow === "in").reduce((s, e) => s + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-5xl mx-auto w-full pb-12">

      {/* Motivational header */}
      <div
        className="px-4 py-3 text-center"
        style={{
          background: "linear-gradient(to right, rgba(212,160,48,0.08), rgba(212,160,48,0.04))",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <p
          className="text-xs font-medium"
          style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", letterSpacing: "0.02em" }}
        >
          Log every naira and every kobo — your future self will thank you.
        </p>
      </div>

      {/* Month navigator */}
      <div style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--rule)" }}>
        <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelectedDay(null); }} />
      </div>

      {/* Stats strip */}
      <StatsStrip entries={entries} year={year} month={month} selectedDay={selectedDay} />

      {/* Day RAG strip */}
      <div style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--rule)" }}>
        <DayStrip
          entries={entries}
          budgets={budgets}
          year={year}
          month={month}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* Daily summary panel (visible when a day is selected) */}
      {selectedDay && (
        <div
          className="px-4 py-3 flex items-center gap-4 text-sm"
          style={{ background: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}
        >
          <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            {(() => {
              if (!dayStr) return "";
              const d = new Date(dayStr + "T00:00:00");
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            })()}
          </span>
          <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
            Out: {formatNaira(dayOut)}
          </span>
          <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)" }}>
            In: {formatNaira(dayIn)}
          </span>
          <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
            Net: {formatNaira(dayIn - dayOut)}
          </span>
          <button
            onClick={() => setSelectedDay(null)}
            className="ml-auto text-xs"
            style={{ color: "var(--ink-text-dim)" }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Entry form */}
      <div style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--rule)" }}>
        <EntryForm entries={entries} onAdd={addEntry} />
      </div>

      {/* Ledger table — collapsible */}
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        <button
          onClick={() => setLedgerOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5"
          style={{ background: "var(--ink-2)", borderBottom: ledgerOpen ? "1px solid var(--rule)" : "none" }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Entries ({displayEntries.length})
          </span>
          <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
            {ledgerOpen ? "▲ Collapse" : "▼ Show"}
          </span>
        </button>
        {ledgerOpen && <LedgerTable entries={displayEntries} onUpdate={updateEntry} onDelete={deleteEntry} />}
      </div>

      {/* Budgets grid — collapsible, closed by default */}
      <div style={{ borderTop: "1px solid var(--rule)" }}>
        <button
          onClick={() => setBudgetsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5"
          style={{ background: "var(--ink-2)", borderBottom: budgetsOpen ? "1px solid var(--rule)" : "none" }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
            Monthly budgets
          </span>
          <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
            {budgetsOpen ? "▲ Collapse" : "▼ Show"}
          </span>
        </button>
        {budgetsOpen && <BudgetsGrid entries={monthEntries} budgets={budgets} onSave={saveBudget} />}
      </div>
    </div>
  );
}
