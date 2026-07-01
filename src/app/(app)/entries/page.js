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
import CsvImport        from "@/components/entries/CsvImport";
import BillTracker      from "@/components/entries/BillTracker";
import TelegramBotSetup from "@/components/entries/TelegramBotSetup";

function FeatureCard({ icon, title, tag, tagColor, description, children }) {
  return (
    <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--rule)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700 }}>
            {title}
          </span>
          <span style={{
            marginLeft: "auto",
            background: `color-mix(in srgb, ${tagColor} 15%, transparent)`,
            color: tagColor,
            fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em",
            padding: "2px 8px", borderRadius: 20,
          }}>
            {tag}
          </span>
        </div>
        <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.65, margin: 0 }}>
          {description}
        </p>
      </div>
      {/* Card body */}
      {children}
    </div>
  );
}

function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        or
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
    </div>
  );
}

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
    <div className="page-root">

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

      <div style={{ background: "var(--ink-2)", borderBottom: "1px solid var(--rule)", overflow: "hidden", minWidth: 0 }}>
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
            padding: "12px 24px",
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

      {/* ── 1. ADD ENTRIES ────────────────────────────────────────────────
          Three input methods, all for the same job: getting data in.
          Each has a feature card explaining why it matters. */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Add Entries</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Three ways to get data in, all feeding the same ledger with the same AI categorization. The fastest method is the one that removes the most friction from your natural workflow. Most people end up using all three depending on the situation.
      </p>

      <div className="section-body">

        {/* ── Method 1: Type it in ── */}
        <FeatureCard
          icon="✏️"
          title="Type it in"
          tag="Instant"
          tagColor="var(--gold)"
          description="The fastest way to capture a spend the moment it happens, before it fades from memory. Type a description and the naira amount, hit Add, and the AI assigns the category, essentiality tag, and confidence score automatically. Takes under 10 seconds."
        >
          <EntryForm entries={entries} onAdd={addEntry} />
        </FeatureCard>

        <OrDivider />

        {/* ── Method 2: Import a bank statement ── */}
        <FeatureCard
          icon="📄"
          title="Import a bank statement"
          tag="Bulk"
          tagColor="var(--teal)"
          description="Drop in a PDF or CSV bank statement and AI extracts every transaction and queues them for categorization in one action. Months of history entered in under a minute. The most efficient way to catch up on weeks you have not yet tracked manually."
        >
          <CsvImport onImported={() => window.location.reload()} />
        </FeatureCard>

        <OrDivider />

        {/* ── Method 3: Telegram bot ── */}
        <FeatureCard
          icon="✈️"
          title="Telegram bot"
          tag="Anywhere"
          tagColor="var(--blue-accent)"
          description="Log expenses without opening the app at all. Message your personal bot something like '3,500 suya at Mallam Musa' and it lands in your ledger immediately. Works from your phone lock screen, a crowded market, or any device with Telegram installed."
        >
          <TelegramBotSetup />
        </FeatureCard>

      </div>

      {/* ── 2. LEDGER ─────────────────────────────────────────────────────
          Review follows entry — see what was just added and fix anything
          inline without switching context. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--amber)" }} />
        <span className="section-divider-label" style={{ color: "var(--amber)" }}>Ledger</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Every transaction you have logged lives here, newest first. Edit categories, fix amounts, or delete mistakes directly in the row without leaving the page. The paper-style table is deliberate: reading your ledger should feel like reviewing a physical record.
      </p>

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
      <p className="section-desc">
        Set a naira cap for each spending category and an overall monthly limit. A progress bar tracks your actual spend against each cap the moment a new entry lands. Research consistently shows that people who budget by category spend less than those who track without limits, even when they exceed individual caps.
      </p>

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

      {/* ── 4. BILL TRACKER ───────────────────────────────────────────────
          Recurring bill management — different from importing or logging,
          this is ongoing tracking. Collapsible since it's not touched
          every session. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Bill Tracker</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Log your fixed recurring bills, subscriptions, and standing orders in one place. Trakit7 monitors due dates so you always know what is coming out of your account before the debit appears. The most common source of budget shock is a charge you knew about but forgot to plan for.
      </p>

      <div className="section-body">
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="section-toggle"
          >
            <span className="section-toggle-label">Recurring bills &amp; subscriptions</span>
            <span className="section-toggle-arrow">
              {toolsOpen ? "▲ Collapse" : "▼ Show"}
            </span>
          </button>
          {toolsOpen && <BillTracker onLogEntry={addEntry} />}
        </div>
      </div>

    </div>
  );
}
