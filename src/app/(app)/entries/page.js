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
import CsvImport      from "@/components/entries/CsvImport";
import BillTracker    from "@/components/entries/BillTracker";

export default function EntriesPage() {
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay,   setSelectedDay]   = useState(null);
  const [ledgerOpen,    setLedgerOpen]    = useState(true);
  const [budgetsOpen,   setBudgetsOpen]   = useState(false);
  const [toolsOpen,     setToolsOpen]     = useState(false);

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
    <div className="page-root" style={{ maxWidth: 1000 }}>

      {/* ── NAVIGATION HEADER ─────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--ink-2)",
          borderBottom: "1px solid var(--rule)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); setSelectedDay(null); }} />
      </div>

      <StatsStrip entries={entries} year={year} month={month} selectedDay={selectedDay} />

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

      {/* Daily summary — shown when a day is selected */}
      {selectedDay && (
        <div
          style={{
            background: "var(--ink-3)",
            borderBottom: "1px solid var(--rule)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>
            {(() => {
              if (!dayStr) return "";
              const d = new Date(dayStr + "T00:00:00");
              const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            })()}
          </span>
          <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Out: {formatNaira(dayOut)}
          </span>
          <span style={{ color: "var(--green)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            In: {formatNaira(dayIn)}
          </span>
          <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Net: {formatNaira(dayIn - dayOut)}
          </span>
          <button
            onClick={() => setSelectedDay(null)}
            style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-text-dim)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            ✕ Clear filter
          </button>
        </div>
      )}

      {/* ── 1. LOG AN ENTRY ───────────────────────────────────────────────
          Primary action — sits at the top so the user can act immediately. */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Log an Entry</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
          <EntryForm entries={entries} onAdd={addEntry} />
        </div>
      </div>

      {/* ── 2. LEDGER ─────────────────────────────────────────────────────
          Review follows action — see what was just logged and fix anything
          inline without switching context. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--amber)" }} />
        <span className="section-divider-label" style={{ color: "var(--amber)" }}>Ledger</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
          <button
            onClick={() => setLedgerOpen((v) => !v)}
            className="section-toggle"
          >
            <span className="section-toggle-label">
              Entries ({displayEntries.length})
            </span>
            <span className="section-toggle-arrow">
              {ledgerOpen ? "▲ Collapse" : "▼ Show"}
            </span>
          </button>
          {ledgerOpen && <LedgerTable entries={displayEntries} onUpdate={updateEntry} onDelete={deleteEntry} />}
        </div>
      </div>

      {/* ── 3. MONTHLY BUDGETS ────────────────────────────────────────────
          Check caps after reviewing entries — natural "log → check"
          workflow without having to scroll past import tools. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--violet)" }} />
        <span className="section-divider-label" style={{ color: "var(--violet)" }}>Monthly Budgets</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
          <button
            onClick={() => setBudgetsOpen((v) => !v)}
            className="section-toggle"
          >
            <span className="section-toggle-label">Budget caps by category</span>
            <span className="section-toggle-arrow">
              {budgetsOpen ? "▲ Collapse" : "▼ Show"}
            </span>
          </button>
          {budgetsOpen && <BudgetsGrid entries={monthEntries} budgets={budgets} onSave={saveBudget} />}
        </div>
      </div>

      {/* ── 4. IMPORT & BILLS ─────────────────────────────────────────────
          Power tools — used less frequently than logging or reviewing.
          Collapsed by default so they don't visually compete with the
          primary workflow above. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Import &amp; Bills</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="section-toggle"
          >
            <span className="section-toggle-label">CSV / PDF import &amp; bill tracker</span>
            <span className="section-toggle-arrow">
              {toolsOpen ? "▲ Collapse" : "▼ Show"}
            </span>
          </button>
          {toolsOpen && (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid-2">
                <BillTracker onLogEntry={addEntry} />
                <CsvImport onImported={() => window.location.reload()} />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
